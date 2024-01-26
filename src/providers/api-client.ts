import { GraphQLClient, graphql } from '../utils/index.js';
import { Dictionary, InflectionTag, GraphQLError } from '../types/index.js';

/**
 * Represents an article graph.
 */
export type ArticleGraph = {
  /**
   * Article ID.
   */
  id: string;
  /**
   * Dictionary.
   */
  dictionary: Dictionary;
  /**
   * List of articles in the graph.
   */
  nodes: Article[];
  /**
   * List of article identifiers that are edges in the graph.
   */
  edges: ArticleGraphEdge[];
};

/**
 * Represents an article graph edge.
 */
export type ArticleGraphEdge = {
  /**
   * Article identifier for the source node of the edge.
   */
  sourceId: number;
  /**
   * Article identifier for the target node of the edge.
   */
  targetId: number;
  /**
   * Type of the article relationship.
   */
  type: ArticleRelationshipType;
  /**
   * Optional unique identifier for the definition where the article relationship is defined, unique relative to the article.
   */
  sourceDefinitionId?: number;
  /**
   * Index for the definition where the article relationship is defined, unique relative to the article.
   */
  sourceDefinitionIndex?: number;
};

/**
 * Represents an article.
 */
export type Article = {
  /**
   * Unique identifier for the article.
   */
  id: number;
  /**
   * Dictionary that the article belongs to.
   */
  dictionary: Dictionary;
  /**
   * Word class of the word in the article, if available.
   */
  wordClass?: WordClass;
  /**
   * List of lemmas (base forms of words) that the article covers.
   */
  lemmas: Lemma[];
  /**
   * Gender of the word in the article, if relevant.
   */
  gender?: Gender;
  /**
   * List of definitions of the word in the article.
   */
  definitions: Definition[];
  /**
   * List of articles that include this article as part of a phrase.
   */
  phrases: Article[];
  /**
   * List of etymological origins of the word in the article.
   */
  etymology: RichContent[];
  /**
   * List of article relationships that are relevant to the article.
   */
  relationships: ArticleRelationship[];
};

/**
 * Represents a set of inflection patterns for words, including specific inflection forms and associated tags.
 */
export type Paradigm = {
  /**
   * Unique identifier for the inflection paradigm.
   */
  id: number;
  /**
   * List of inflection forms associated with this paradigm.
   */
  inflections: Inflection[];
  /**
   * List of tags relevant to this inflection paradigm.
   */
  tags: InflectionTag[];
};

/**
 * Represents inflection information for a word, including inflection tag and word form.
 */
export type Inflection = {
  /**
   * List of inflection tags associated with the word.
   */
  tags: InflectionTag[];
  /**
   * The specific inflected form of the word.
   */
  wordForm: string;
};

/**
 * Represents a lemma.
 */
export type Lemma = {
  /**
   * Unique identifier for the lemma.
   */
  id: number;
  /**
   * Base form of the word.
   */
  lemma: string;
  /**
   * Numerical reference number to the meaning of the lemma.
   */
  meaning: number;
  /**
   * List of paradigms associated with the lemma.
   */
  paradigms: Paradigm[];
};

/**
 * Represents a definition.
 */
export type Definition = {
  /**
   * Optional unique identifier for the definition, unique relative to the article.
   */
  id?: number;
  /**
   * Content of the definition.
   */
  content: RichContent[];
  /**
   * List of examples illustrating the use of the word or phrase.
   */
  examples: RichContent[];
  /**
   * List of article relationships that are relevant to the definition.
   */
  relationships: ArticleRelationship[];
  /**
   * List of sub-definitions related to the main definition.
   */
  subDefinitions: Definition[];
};

/**
 * Represents the text content in an article.
 */
export type RichContent = {
  /**
   * The content in plain text.
   */
  textContent: string;
  /**
   * The content in the form of rich content segments.
   */
  richContent: RichContentSegment[];
};

/**
 * Represents a rich content segment.
 */
export type RichContentSegment = {
  /**
   * Type of the rich content segment.
   */
  type: RichContentSegmentType;
  /**
   * Content of the segment.
   */
  content: string;
};

/**
 * Represents a rich content segment with a reference to an article.
 */
export type RichContentArticleSegment = RichContentSegment & {
  /**
   * The article referred to in the segment.
   */
  article: Article;
  /**
   * The ID of the definition in the article that is referred to.
   */
  definitionId?: number;
  /**
   * The index of the definition in the article that is referred to.
   */
  definitionIndex?: number;
};

/**
 * Represents a rich content segment with text content.
 */
export type RichContentTextSegment = RichContentSegment & {
  /**
   * The content of the segment.
   */
  content: string;
};

/**
 * Represents an article relationship.
 */
export type ArticleRelationship = {
  /**
   * Related article.
   */
  article: Article;
  /**
   * Type of the article relationship.
   */
  type: ArticleRelationshipType;
};

/**
 * Represents a word.
 */
export type Word = {
  /**
   * The actual word being represented.
   */
  word: string;
  /**
   * List of dictionaries that contain this word.
   */
  dictionaries: Dictionary[];
  /**
   * Articles that provide information about the word.
   */
  articles: Article[];
};

/**
 * Represents suggestions.
 */
export type Suggestions = {
  /**
   * List of words that match the search term exactly.
   */
  exact: Word[];
  /**
   * List of words that are inflections of the search term.
   */
  inflections: Word[];
  /**
   * List of words found by free text search on the search term.
   */
  freetext: Word[];
  /**
   * List of words that are similar to the search term.
   */
  similar: Word[];
};

/**
 * Represents a word class.
 */
export type WordClass = string;
/**
 * Represents a gender.
 */
export type Gender = string;
/**
 * Represents an article relationship type.
 */
export type ArticleRelationshipType = string;
/**
 * Represents a rich content segment type.
 */
export type RichContentSegmentType = string;

/**
 * Represents the response of an API call.
 * @template T - The type of the response data.
 */
export type ApiResponse<T> = [T, GraphQLError[]];

/**
 * Search results.
 */
export type SearchResults = {
  /**
   * List of search results.
   */
  results: SearchResult[];

  /**
   * The search query.
   */
  query: string;
};

export type SearchResult = {
  /**
   * The article ID.
   */
  id: number;

  /**
   * The dictionary the article belongs to.
   */
  dictionary: Dictionary;

  /**
   * The title of the article, computed from the lemmas.
   */
  title: string;

  /**
   * The type of suggestion from which the search result was found.
   */
  type: SuggestionType;
};

/**
 * Suggestion types.
 */
export enum SuggestionType {
  Exact = 'exact',
  Inflections = 'inflections',
  Freetext = 'freetext',
  Similar = 'similar',
}

/**
 * Client for the Ordbok GraphQL API.
 * @see https://ordbokapi.org/
 */
export class ApiClient {
  /**
   * Initialize the client with a GraphQL endpoint URL.
   * @param url GraphQL endpoint URL.
   */
  constructor(url: string = 'https://api.ordbokapi.org/graphql') {
    this.#client = new GraphQLClient(url);
  }

  /**
   * GraphQL client.
   */
  #client: GraphQLClient;

  /**
   * Get article graph from a given article ID and dictionary.
   * @param id Article ID.
   * @param dictionary Dictionary.
   * @param depth Depth of the graph. Must be between 1 and 3.
   * @returns Article graph.
   */
  async getArticleGraph(
    id: number,
    dictionary: Dictionary,
    depth: number = 1,
  ): Promise<ApiResponse<ArticleGraph>> {
    // use articleGraph query
    const { data, errors } = await this.#client.query(
      graphql`
        query ArticleGraphQuery(
          $articleId: Int!
          $dictionary: Dictionary!
          $depth: Int!
        ) {
          articleGraph(id: $articleId, dictionary: $dictionary, depth: $depth) {
            nodes {
              id
              dictionary
              lemmas {
                lemma
              }
            }
            edges {
              sourceId
              targetId
              type
              sourceDefinitionId
              sourceDefinitionIndex
            }
          }
        }
      `,
      { articleId: id, dictionary, depth },
      { allowErrors: true },
    );

    return [data?.articleGraph, errors];
  }

  /**
   * Gets article suggestions for a given search term.
   * @param term Search term.
   * @param dictionaries List of dictionaries to search in. Defaults to all
   * dictionaries.
   * @param searchTypes List of suggestion types to search for. Defaults to all
   * suggestion types.
   * @returns Suggestions.
   */
  async search(
    term: string,
    dictionaires: Dictionary[] = Object.values(Dictionary),
    searchTypes: SuggestionType[] = Object.values(SuggestionType),
  ): Promise<SearchResults> {
    const { data } = await this.#client.query(
      graphql`
        query SuggestionsQuery($term: String!, $dictionaries: [Dictionary!]) {
          suggestions(word: $term, dictionaries: $dictionaries) {
            ${Object.values(SuggestionType).reduce(
              (acc, type) =>
                searchTypes.includes(type)
                  ? acc +
                    graphql`
                      ${type}
                      {
                        word
                        articles {
                          id
                          dictionary
                        }
                      }
                    `
                  : acc,
              '',
            )}
          }
        }
      `,
      { term, dictionaries: dictionaires },
    );

    if (!data) {
      return { results: [], query: term };
    }

    const results: SearchResult[] = [];
    const resultMap = new Map<string, SearchResult>();
    const articleWordMap = new Map<number, Set<string>>();

    for (const type of searchTypes) {
      const suggestions = data.suggestions[type];

      if (suggestions) {
        for (const suggestion of suggestions) {
          for (const article of suggestion.articles ?? []) {
            const key = `${article.id}-${article.dictionary}`;
            const existingResult = resultMap.get(key);

            if (!existingResult) {
              const newResult: SearchResult = {
                id: article.id,
                dictionary: article.dictionary,
                title: suggestion.word,
                type,
              };
              resultMap.set(key, newResult);
              results.push(newResult);
              articleWordMap.set(article.id, new Set([suggestion.word]));

              continue;
            }

            if (!articleWordMap.get(article.id)?.has(suggestion.word)) {
              existingResult.title += `, ${suggestion.word}`;
              articleWordMap.get(article.id)?.add(suggestion.word);
            }
          }
        }
      }
    }

    return { results, query: term };
  }

  /**
   * Gets the article with the given ID and dictionary.
   * @param id Article ID.
   * @param dictionary Dictionary.
   * @returns Article.
   */
  async getArticle(
    id: number,
    dictionary: Dictionary,
  ): Promise<ApiResponse<Article>> {
    const { data, errors } = await this.#client.query(
      graphql`
        fragment RichContentFragment on RichContent {
          textContent
          richContent {
            type
            content
          }
        }
        fragment DefinitionFragment on Definition {
          content {
            ...RichContentFragment
          }
          examples {
            ...RichContentFragment
          }
        }
        query ArticleQuery($id: Int!, $dictionary: Dictionary!) {
          article(id: $id, dictionary: $dictionary) {
            id
            lemmas {
              lemma
            }
            definitions {
              ...DefinitionFragment
              subDefinitions {
                ...DefinitionFragment
              }
            }
          }
        }
      `,
      { id, dictionary },
      { allowErrors: true },
    );

    return [data?.article, errors];
  }
}

import { GraphQLError } from '../types/index.js';

interface GraphQLClientOptions {
  /**
   * Whether to allow errors in the response. If set to `false` (default), an
   * error will be thrown if the response contains any errors. Otherwise, if set
   * to `true`, the response will be returned as-is.
   */
  allowErrors?: boolean;
}

interface GraphQLResponse {
  /**
   * GraphQL data.
   */
  data: any;
  /**
   * GraphQL errors.
   */
  errors: GraphQLError[];
}

/**
 * A simple GraphQL client that can be used in the browser.
 */
export class GraphQLClient {
  /**
   * Initialize the client with a GraphQL endpoint URL.
   * @param url GraphQL endpoint URL.
   */
  constructor(url: string) {
    this.#url = url;
  }

  /**
   * URL of the GraphQL endpoint.
   */
  #url: string;

  /**
   * Send a GraphQL query to the endpoint.
   * @param query GraphQL query.
   * @param variables GraphQL variables.
   * @param options GraphQL client options.
   * @returns GraphQL response.
   */
  async query(
    query: string,
    variables: { [key: string]: any },
    options: GraphQLClientOptions = {},
  ): Promise<GraphQLResponse> {
    const response = await fetch(this.#url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables }),
    });
    const { data, errors } = await response.json();

    if (errors?.length) {
      const typedErrors = errors.map((error: any) => new GraphQLError(error));

      if (options?.allowErrors) {
        return { data, errors: typedErrors };
      } else {
        throw typedErrors;
      }
    }

    return { data, errors: [] };
  }
}

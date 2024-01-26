import { ApiClient, SearchResults } from '../providers/index.js';
import { Dictionary } from '../types/dictionary.js';
import { html } from '../utils/index.js';
import sharedStyles from 'bundle-text:../../static/shared.css';
import { LoadingIcon } from './loading-icon.js';

/**
 * Search bar which allows searching for a specific article from the dictionary.
 * Search results are displayed in a tooltip, and clicking on a result will
 * close the tooltip and fire a `articleSelected` event.
 */
export class SearchBar extends HTMLElement {
  /**
   * The root element.
   */
  #root: HTMLDivElement;

  /**
   * The input element.
   */
  #input: HTMLInputElement;

  /**
   * The tooltip element.
   */
  #tooltip: HTMLDivElement;

  /**
   * The tooltip's content element.
   */
  #tooltipContent: HTMLDivElement;

  /**
   * The loading icon.
   */
  #loadingIcon: LoadingIcon;

  /**
   * The API client.
   */
  #apiClient: ApiClient;

  /**
   * The current search query.
   */
  #query = '';

  /**
   * The current search results.
   */
  #results: SearchResults = { query: '', results: [] };

  /**
   * The current search result index.
   */
  #resultIndex = -1;

  /**
   * The current search result count.
   */
  #resultCount = 0;

  /**
   * The current search result count.
   */
  get resultCount() {
    return this.#resultCount;
  }

  /**
   * The current search result index.
   */
  get resultIndex() {
    return this.#resultIndex;
  }

  /**
   * The current search query.
   */
  get query() {
    return this.#query;
  }

  /**
   * The current search query.
   */
  set query(value: string) {
    this.#query = value;
    this.#input.value = value;
    this.#updateTooltip();
  }

  /**
   * The current search results.
   */
  get results() {
    return this.#results;
  }

  /**
   * The current search results.
   */
  set results(value: SearchResults) {
    this.#results = value;
    this.#updateTooltip();
  }

  /**
   * The current search result index.
   */
  set resultIndex(value: number) {
    this.#resultIndex = value;
    this.#updateTooltip();
  }

  /**
   * The current search result count.
   */
  set resultCount(value: number) {
    this.#resultCount = value;
    this.#updateTooltip();
  }

  /**
   * The current search result count.
   */
  get apiClient() {
    return this.#apiClient;
  }

  /**
   * The current search result count.
   */
  set apiClient(value: ApiClient) {
    this.#apiClient = value;
    this.#updateTooltip();
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot!.innerHTML = html`
      <style>
        /* prettier-ignore */
        ${sharedStyles}

        :host {
          display: block;
          position: relative;
          width: 100%;
          height: 100%;
          max-width: 400px;
        }

        #root {
          position: relative;
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: stretch;
          justify-content: center;
        }

        #input {
          height: 100%;
          padding: 0.7rem 1.1rem;
          border: none;
          border-radius: 2rem;
          background-color: var(--secondary-bg-color);
          color: var(--text-color);
          font-family: var(--font-family);
          font-size: var(--font-size);
          line-height: var(--line-height);
          outline: none;
        }

        #input::placeholder {
          color: var(--text-color-light);
        }

        #tooltip {
          position: absolute;
          top: 100%;
          left: 0;
          width: 100%;
          max-height: 50vh;
          overflow-y: auto;
          padding: 0.25rem 0;
          background-color: var(--secondary-bg-color);
          border-radius: 0.5rem;
          box-shadow: 0 0 0.25rem rgba(0, 0, 0, 0.5);
          z-index: 1;
        }

        #tooltipContent {
          display: flex;
          flex-direction: column;
          align-items: stretch;
        }

        .result {
          display: flex;
          flex-direction: row;
          align-items: center;
          padding: 0.25rem 0.5rem;
          cursor: pointer;
        }

        .result.selected {
          background-color: var(--list-item-hover-bg-color);
        }

        .result .title {
          flex: 1;
          padding: 0 0.5rem;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .result .id {
          flex: 0 0 auto;
          padding: 0 0.5rem;
          font-size: 0.75rem;
          color: var(--text-color-light);
        }

        vis-loading-icon {
          position: absolute;
          width: 2rem;
          height: 2rem;
          font-size: 2rem;
          top: 50%;
          right: 0.5rem;
          left: auto;
          transform: translateY(-50%);
        }
      </style>
      <div>
        <div id="root">
          <input id="input" type="text" placeholder="Søk i ordbøkene" />
          <vis-loading-icon style="display: none"></vis-loading-icon>
          <div id="tooltip">
            <div id="tooltipContent"></div>
          </div>
        </div>
      </div>
    `;
    this.#root = this.shadowRoot!.querySelector('#root') as HTMLDivElement;
    this.#input = this.shadowRoot!.querySelector('#input') as HTMLInputElement;
    this.#tooltip = this.shadowRoot!.querySelector(
      '#tooltip',
    ) as HTMLDivElement;
    this.#tooltipContent = this.shadowRoot!.querySelector(
      '#tooltipContent',
    ) as HTMLDivElement;
    this.#loadingIcon = this.shadowRoot!.querySelector(
      'vis-loading-icon',
    ) as LoadingIcon;
    this.#input.addEventListener('input', () => this.#handleInput());
    this.#input.addEventListener('keydown', (event) =>
      this.#handleKeyDown(event),
    );
    this.#input.addEventListener('focus', () => this.#handleFocus());
    this.#input.addEventListener('blur', () => this.#handleBlur());
    this.#tooltip.addEventListener('mousedown', (event) =>
      event.preventDefault(),
    );
    this.#tooltip.addEventListener('click', (event) =>
      this.#handleClick(event),
    );
    this.#tooltip.addEventListener('mouseover', (event) =>
      this.#handleMouseOver(event),
    );
    this.#hideTooltip();

    this.#apiClient = new ApiClient();
  }

  /**
   * Handles input events.
   */
  #handleInput() {
    this.#query = this.#input.value;
    this.#requestSearch();
  }

  /**
   * Handles keydown events.
   */
  #handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.#selectNextResult();
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.#selectPreviousResult();
    } else if (event.key === 'Enter') {
      event.preventDefault();

      if (this.#tooltip.style.display !== 'none') {
        this.#selectResult();
      } else {
        this.#doSearch();
      }
    }
  }

  /**
   * Handles focus events.
   */
  #handleFocus() {
    this.#input.select();
    this.#updateTooltip();
  }

  /**
   * Handles blur events.
   */
  #handleBlur() {
    this.#hideTooltip();
  }

  /**
   * Handles click events.
   */
  #handleClick(event: MouseEvent) {
    const target = event.target as HTMLElement;

    const resultElement: HTMLElement | null = target.classList.contains(
      'result',
    )
      ? target
      : target.closest('.result');

    if (resultElement) {
      const index = Number.parseInt(resultElement.dataset.index!, 10);
      this.#selectResult(index);
    }
  }

  /**
   * If the current selected result is not in view, scrolls it into view.
   */
  #scrollResultIntoView() {
    const results = this.#tooltipContent.querySelectorAll('.result');
    const selected = results[this.#resultIndex] as HTMLElement;

    if (selected) {
      const top = selected.offsetTop;
      const bottom = top + selected.offsetHeight;
      if (top < this.#tooltip.scrollTop) {
        this.#tooltip.scrollTop = top;
      } else if (
        bottom >
        this.#tooltip.scrollTop + this.#tooltip.clientHeight
      ) {
        this.#tooltip.scrollTop = bottom - this.#tooltip.clientHeight;
      }
    }
  }

  /**
   * Selects the next result.
   */
  #selectNextResult() {
    if (this.#resultIndex < this.#resultCount - 1) {
      this.#resultIndex++;
      this.#scrollResultIntoView();
      this.#updateTooltip();
    }
  }

  /**
   * Selects the previous result.
   */
  #selectPreviousResult() {
    if (this.#resultIndex > 0) {
      this.#resultIndex--;
      this.#scrollResultIntoView();
      this.#updateTooltip();
    }
  }

  /**
   * Selects the current result.
   */
  #selectResult(index = this.#resultIndex) {
    if (index >= 0 && index < this.#resultCount) {
      this.#input.value = this.#results.results[index].title;
      this.dispatchEvent(
        new CustomEvent('articleSelected', {
          detail: {
            id: this.#results.results[index].id,
            dictionary: this.#results.results[index].dictionary,
          },
        }),
      );
      this.#hideTooltip();
      this.#input.blur();
    }
  }

  /**
   * Handles mouseover events.
   * @param event The mouseover event.
   */
  #handleMouseOver(event: MouseEvent) {
    // select the result under the mouse
    const target = event.target as HTMLElement;

    const resultElement: HTMLElement | null = target.classList.contains(
      'result',
    )
      ? target
      : target.closest('.result');

    if (resultElement) {
      const index = Number.parseInt(resultElement.dataset.index!, 10);
      this.#resultIndex = index;
      this.#updateTooltip();
    }
  }

  /**
   * Updates the tooltip.
   */
  #updateTooltip() {
    if (this.#query.length === 0 || this.#resultCount === 0) {
      this.#hideTooltip();
      return;
    }

    // add .selected class to the selected result
    const results = this.#tooltipContent.querySelectorAll('.result');
    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      if (i === this.#resultIndex) {
        result.classList.add('selected');
      } else {
        result.classList.remove('selected');
      }
    }
  }

  /**
   * Timeout for debouncing the search.
   */
  #updateTooltipTimeout?: number;

  /**
   * The current search request ID.
   */
  #searchRequestId?: number;

  /**
   * Requests a search.
   */
  #requestSearch() {
    clearTimeout(this.#updateTooltipTimeout);
    const searchRequestId = Math.random();
    this.#searchRequestId = searchRequestId;

    this.#updateTooltipTimeout = setTimeout(
      () => this.#doSearch(searchRequestId),
      250,
    );
  }

  /**
   * Performs the search.
   * @param searchRequestId The search request ID. Used to ensure that only the
   * latest search request prints results.
   */
  #doSearch(searchRequestId?: number) {
    if (searchRequestId === undefined) {
      searchRequestId = Math.random();
      this.#searchRequestId = searchRequestId;
    }

    clearTimeout(this.#updateTooltipTimeout);

    this.#loadingIcon.style.display = '';

    this.#apiClient
      .search(this.#query)
      .then((results) => {
        if (searchRequestId !== this.#searchRequestId) {
          return;
        }

        this.#results = results;
        this.#resultIndex = -1;
        this.#resultCount = results.results.length;
        this.#tooltipContent.innerHTML = '';

        for (const [i, result] of results.results.entries()) {
          const element = document.createElement('div');
          element.classList.add('result');
          element.dataset.index = i.toString();
          element.innerHTML = html`
            <div class="title">${result.title}</div>
            <div class="id">
              ${result.id}
              (${result.dictionary === Dictionary.Bokmaalsordboka
                ? 'BM'
                : 'NN'})
            </div>
          `;
          this.#tooltipContent.appendChild(element);
        }

        this.#showTooltip();
      })
      .catch((error) => {
        console.error(error);
        this.#hideTooltip();
      })
      .finally(() => {
        this.#loadingIcon.style.display = 'none';
      });
  }

  /**
   * Shows the tooltip.
   */
  #showTooltip() {
    this.#tooltip.style.display = 'block';
    this.#tooltip.scrollTop = 0;
    this.#resultIndex = -1;
  }

  /**
   * Hides the tooltip.
   */
  #hideTooltip() {
    this.#tooltip.style.display = 'none';
  }

  /**
   * Focuses the input element.
   */
  focus() {
    this.#input.focus();
  }
}

customElements.define('vis-search-bar', SearchBar);

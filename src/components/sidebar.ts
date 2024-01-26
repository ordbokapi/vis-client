import { ApiClient, Article } from '../providers/index.js';
import { Dictionary } from '../types/dictionary.js';
import { html, text } from '../utils/index.js';
import { ModalDialog } from './modal-dialog.js';
import './loading-icon.js';

/**
 * Sidebar which shows data about the current selection, such as the word or
 * phrase that is selected, and its definitions.
 */
export class Sidebar extends HTMLElement {
  /**
   * The root element of the component.
   */
  #root: HTMLDivElement;

  /**
   * The resizing handle element.
   */
  #resizer: HTMLDivElement;

  /**
   * The loading overlay element.
   */
  #loadingOverlay: HTMLDivElement;

  /**
   * The API client.
   */
  #apiClient: ApiClient;

  /**
   * The article that is currently being viewed.
   */
  #article?: Article;

  /**
   * The article that is currently being viewed.
   */
  get article() {
    return this.#article;
  }

  set article(article: Article | undefined) {
    this.#article = article;
    this.#render();
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot!.innerHTML = html`
      <style>
        :host {
          display: block;
          width: 300px;
          max-width: 100%;
          height: 100%;
          background-color: #353535;
          border-left: 1px solid #666;
          padding: 1rem;
          font-family: 'Lora', serif;
          position: relative;
        }

        #resizer {
          position: absolute;
          left: 0;
          top: 0;
          height: 100%;
          width: 15px;
          cursor: ew-resize;
          z-index: 2;
          transform: translateX(calc(-50% - 1px));
          user-select: none;
          background-color: transparent;
          border-left: 1px solid transparent;
          border-right: 1px solid transparent;
          transition:
            background-color 0.08s ease-in-out,
            border-left 0.08s ease-in-out,
            border-right 0.08s ease-in-out;
        }

        #resizer::before {
          content: '';
          position: absolute;
          left: 50%;
          top: 50%;
          transform: translate(-50%, -50%);
          height: 60px;
          width: 3px;
          background-color: #aaa;
          border-radius: 3px;
          opacity: 0;
          transition: opacity 0.08s ease-in-out;
        }

        #resizer:hover,
        #resizer:active {
          border-left: 1px solid #666;
          border-right: 1px solid #666;
        }

        #resizer:hover::before,
        #resizer:active::before {
          opacity: 1;
        }

        #resizer:hover {
          background-color: #333;
        }

        #resizer:active {
          background-color: #222;
        }

        #sidebar {
          overflow-y: auto;
          height: calc(100vh - 2rem);
        }

        ol,
        ul {
          padding-left: 1.2rem;
        }

        li {
          margin-bottom: 0.8rem;
        }

        #loading-overlay {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          user-select: none;
          z-index: 1;
          background: rgba(0, 0, 0, 0.7);
        }

        vis-loading-icon {
          width: 6rem;
          height: 6rem;
          font-size: 6rem;
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
        }
      </style>
      <div id="sidebar"></div>
      <div id="loading-overlay" style="display: none;">
        <vis-loading-icon></vis-loading-icon>
      </div>
      <div id="resizer"></div>
    `;
    this.#root = this.shadowRoot!.querySelector('#sidebar') as HTMLDivElement;
    this.#resizer = this.shadowRoot!.querySelector(
      '#resizer',
    ) as HTMLDivElement;
    this.#loadingOverlay = this.shadowRoot!.querySelector(
      '#loading-overlay',
    ) as HTMLDivElement;
    this.#addResizer();
    this.#render();
    this.#apiClient = new ApiClient();
  }

  #addResizer() {
    const minWidth = 100;
    const maxWidth = 500;

    let startX: number, startWidth: number;

    this.#resizer.addEventListener('mousedown', (e) => {
      startX = e.clientX;
      startWidth = this.#root.getBoundingClientRect().width;

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    });

    const onMouseMove = (e: MouseEvent) => {
      const diffX = startX - e.clientX;
      const newWidth = startWidth + diffX;

      if (newWidth >= minWidth && newWidth <= maxWidth) {
        this.style.width = `${newWidth}px`;
      }
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
  }

  #render() {
    if (this.#article) {
      this.#root.innerHTML = html`
        <h1>${this.#article.lemmas.map((lemma) => lemma.lemma).join(', ')}</h1>
        <ol id="definitions">
          ${this.#article.definitions.reduce(
            (acc, definition) =>
              acc +
              html`
                <li>
                  ${definition.content.reduce(
                    (acc, content) =>
                      acc + html` <p>${content.textContent}</p> `,
                    '',
                  )}
                  ${definition.examples.length > 0
                    ? html`
                        <ul>
                          ${definition.examples.reduce(
                            (acc, example) =>
                              acc +
                              html` <li><em>${example.textContent}</em></li> `,
                            '',
                          )}
                        </ul>
                      `
                    : ''}
                  ${definition.subDefinitions.length > 0
                    ? html`
                        <ul>
                          ${definition.subDefinitions.reduce(
                            (acc, subDefinition) =>
                              acc +
                              html`
                                <li>
                                  ${subDefinition.content.reduce(
                                    (acc, content) =>
                                      acc +
                                      html` <p>${content.textContent}</p> `,
                                    '',
                                  )}
                                  ${subDefinition.examples.length > 0
                                    ? html`
                                        <ul>
                                          ${subDefinition.examples.reduce(
                                            (acc, example) =>
                                              acc +
                                              html`
                                                <li>
                                                  <em
                                                    >${example.textContent}</em
                                                  >
                                                </li>
                                              `,
                                            '',
                                          )}
                                        </ul>
                                      `
                                    : ''}
                                </li>
                              `,
                            '',
                          )}
                        </ul>
                      `
                    : ''}
                </li>
              `,
            '',
          )}
        </ol>
      `;
    } else {
      this.#root.innerHTML = html` Vel ein artikkel for å sjå detaljar. `;
    }
  }

  /**
   * Loads the article for the given word.
   */
  async loadArticle(id: number, dictionary: Dictionary) {
    this.#loadingOverlay.style.display = '';

    const [article, errors] = await this.#apiClient.getArticle(id, dictionary);

    this.#loadingOverlay.style.display = 'none';

    if (errors.length > 0) {
      const dialog = new ModalDialog({
        title: '⚠️ Feil',
        html: html`
          <p>
            Det oppstod ein feil under lasting av artikkelen. Prøv igjen
            seinare.
          </p>
          ${errors.map((error) => html` <p>${text`${error.message}`}</p> `)}
        `,
      });
      document.body.appendChild(dialog);
      dialog.show();
      return;
    }

    this.#article = article;
    this.#render();
  }
}

customElements.define('vis-sidebar', Sidebar);

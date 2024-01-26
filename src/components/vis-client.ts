import { html } from '../utils/index.js';
import { AppStateManager } from '../providers/index.js';
import { StateManagedElement } from './state-managed-element.js';
import { SearchBar } from './search-bar.js';
import { Sidebar } from './sidebar.js';
import { Statusbar } from './statusbar.js';
import { Viewport } from './viewport.js';
import './app-logo.js';
/**
 * Main client component, which encompasses the entire application.
 */
export class VisClient extends StateManagedElement {
  #root: HTMLDivElement;

  /**
   * The viewport component.
   */
  #viewport: Viewport;

  /**
   * The sidebar component.
   */
  #sidebar: Sidebar;

  /**
   * The statusbar component.
   */
  #statusbar: Statusbar;

  /**
   * The search bar component.
   */
  #searchBar: SearchBar;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot!.innerHTML = html`
      <style>
        :host {
          display: flex;
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
        }

        #left-column {
          display: flex;
          flex-direction: column;
          flex: 1;
        }

        vis-viewport {
          flex: 1;
        }

        #right-column {
          display: flex;
          flex-direction: column;
        }

        .viewport-controls {
          display: flex;
          flex-direction: column;
          padding: 0.5rem;
          padding-top: 1rem;
          justify-content: center;
          align-items: center;
        }
      </style>
      <div id="left-column">
        <vis-viewport>
          <div class="viewport-controls">
            <vis-search-bar></vis-search-bar>
          </div>
        </vis-viewport>
        <vis-statusbar></vis-statusbar>
      </div>
      <div id="right-column">
        <vis-sidebar></vis-sidebar>
      </div>
      <vis-app-logo></vis-app-logo>
    `;
    this.#root = this.shadowRoot!.querySelector('#vis') as HTMLDivElement;
    this.#viewport = this.shadowRoot!.querySelector('vis-viewport') as Viewport;
    this.#sidebar = this.shadowRoot!.querySelector('vis-sidebar') as Sidebar;
    this.#statusbar = this.shadowRoot!.querySelector(
      'vis-statusbar',
    ) as Statusbar;

    // load graph when articleSelected event is received from search bar
    this.#searchBar = this.shadowRoot!.querySelector(
      'vis-search-bar',
    ) as SearchBar;

    this.appStateManager.observe('currentArticle', (article) => {
      if (article?.dictionary && article?.id) {
        this.#viewport.loadGraph(article.id, article.dictionary);
      }
    });
  }

  connectedCallback() {
    this.#statusbar.zoomLevel = this.#viewport.zoomLevel;
  }
}

customElements.define('vis-client', VisClient);

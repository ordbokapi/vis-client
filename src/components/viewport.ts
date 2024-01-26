import * as pixi from 'pixi.js';
// @ts-ignore
import { Viewport as PixiViewport } from 'pixi-viewport';
import { html, text } from '../utils/index.js';
import { GraphView } from '../rendering/index.js';
import { ApiClient } from '../providers/index.js';
import { Dictionary } from '../types/index.js';
import { LoadingIcon } from './loading-icon.js';
import { ModalDialog } from './modal-dialog.js';

/**
 * Viewport displayed in the browser, which uses a PixiJS application to render
 * the interactive graphical content of the editor. Allows the user to pan and
 * zoom the view.
 */
export class Viewport extends HTMLElement {
  constructor() {
    super();

    this.attachShadow({ mode: 'open' });
    this.shadowRoot!.innerHTML = html`
      <style>
        :host {
          position: relative;
          display: block;
          height: 100%;
          width: 100%;
        }

        .viewport {
          position: absolute;
        }

        .top-overlay {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          z-index: 2;
        }

        .loading-overlay {
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
      <div class="top-overlay"><slot></slot></div>
      <div class="loading-overlay" style="display: none;">
        <vis-loading-icon></vis-loading-icon>
      </div>
    `;

    this.#loadingOverlay = this.shadowRoot!.querySelector(
      '.loading-overlay',
    ) as HTMLDivElement;

    this.app = new pixi.Application({
      backgroundColor: 0x1b1b1b,
      height: this.clientHeight,
      width: this.clientWidth,
      antialias: true,
    });

    const view = this.app.view as HTMLCanvasElement;

    view.classList.add('viewport');

    this.shadowRoot!.appendChild(view);

    this.viewport = new PixiViewport({
      events: this.app.renderer.events,
      screenWidth: this.clientWidth,
      screenHeight: this.clientHeight,
      worldWidth: 1000,
      worldHeight: 1000,
    });

    this.viewport.cursor = 'grab';

    const updateCursor = (state: boolean) => {
      const [off, on] = state ? ['grab', 'grabbing'] : ['grabbing', 'grab'];
      this.viewport.cursor = on;

      if (view.style.cursor === off) {
        view.style.cursor = on;
      }
    };

    this.viewport.on('drag-start', () => updateCursor(true));
    this.viewport.on('drag-end', () => updateCursor(false));

    this.viewport.on('mousedown', () => updateCursor(true));
    this.viewport.on('mouseup', () => updateCursor(false));

    this.app.stage.addChild(this.viewport);

    this.viewport
      .drag()
      .pinch()
      .wheel()
      .decelerate({
        friction: 0.95,
        minSpeed: 0.01,
      })
      .clampZoom({
        minScale: 0.1,
        maxScale: 2,
      });

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        this.app.renderer.resize(width, height);
        this.viewport.resize(width, height);
      }
    });

    resizeObserver.observe(this);

    // Cleanup observer when component is destroyed
    this.addEventListener('disconnected', () => {
      resizeObserver.unobserve(this);
    });

    // add the graph view
    this.graphView = new GraphView(this.viewport);

    // bubble viewport selection changes
    this.graphView.addEventListener('nodeSelected', (event) => {
      this.dispatchEvent(
        new CustomEvent('nodeSelected', {
          detail: (event as CustomEvent).detail,
        }),
      );
    });

    this.viewport.on('zoomed', () => {
      this.dispatchEvent(
        new CustomEvent('zoom', { detail: this.viewport.scale.x * 100 }),
      );
    });

    this.#client = new ApiClient();
  }

  connectedCallback() {
    // Zoom the viewport
    this.viewport.zoomPercent(0.5);

    requestAnimationFrame(() => {
      // resize the viewport
      this.app.renderer.resize(this.clientWidth, this.clientHeight);
      this.viewport.resize(this.clientWidth, this.clientHeight);

      // Pan the viewport to center at 0,0
      this.viewport.moveCenter(0, 0);

      this.graphView.render();
    });
  }

  /**
   * The PixiJS application used to render the viewport.
   */
  app: pixi.Application;

  /**
   * The loading overlay.
   */
  #loadingOverlay: HTMLDivElement;

  /**
   * The API client used to fetch data from the Ordbok API.
   */
  #client: ApiClient;

  /**
   * The PixiJS viewport used to pan and zoom the view.
   */
  viewport: PixiViewport;

  /**
   * The graph view.
   */
  graphView: GraphView;

  /**
   * The zoom level of the viewport.
   */
  get zoomLevel(): number {
    return this.viewport.scale.x * 100;
  }
  set zoomLevel(value: number) {
    this.viewport.setZoom(value / 100);
    this.refresh();
  }

  /**
   * Centers the viewport to the origin.
   */
  center() {
    this.viewport.moveCenter(0, 0);
  }

  /**
   * Refreshes the viewport.
   */
  refresh() {
    this.graphView.render();
  }

  /**
   * Fetches and displays the graph for the given article.
   */
  async loadGraph(articleId: number, dictionary: Dictionary) {
    this.#loadingOverlay.style.display = '';

    const [graph, errors] = await this.#client.getArticleGraph(
      articleId,
      dictionary,
      3,
    );

    this.#loadingOverlay.style.display = 'none';

    if (errors.length > 0) {
      const dialog = new ModalDialog({
        title: '⚠️ Feil',
        html: html`
          <p>
            Det oppstod ein feil under lasting av dataa. Prøv igjen seinare.
          </p>
          ${errors.map((error) => html` <p>${text`${error.message}`}</p> `)}
        `,
      });
      document.body.appendChild(dialog);
      dialog.show();
      return;
    }

    this.graphView.setGraph(graph);

    this.center();
  }
}

customElements.define('vis-viewport', Viewport);

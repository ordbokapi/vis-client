import * as pixi from 'pixi.js';
import { Viewport as PixiViewport } from 'pixi-viewport';
import { html, text } from '../utils/index.js';
import { GraphView } from '../rendering/index.js';
import { ApiClient } from '../providers/index.js';
import { Dictionary, Rect2D, Vector2D } from '../types/index.js';
import { StateManagedElement } from './state-managed-element.js';
import { ModalDialog } from './modal-dialog.js';
import './loading-icon.js';

/**
 * Viewport displayed in the browser, which uses a PixiJS application to render
 * the interactive graphical content of the editor. Allows the user to pan and
 * zoom the view.
 */
export class Viewport extends StateManagedElement {
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
      antialias: !this.appStateManager.get('debug'),
    });

    const view = this.app.view as HTMLCanvasElement;

    view.classList.add('viewport');

    this.shadowRoot!.appendChild(view);

    this.viewport = new PixiViewport({
      // @ts-expect-error Exists according to docs
      events: this.app.renderer.events,
      screenWidth: this.clientWidth,
      screenHeight: this.clientHeight,
      worldWidth: 1000,
      worldHeight: 1000,
    });

    this.viewport.cursor = 'grab';

    // Dragging while holding shift should not pan the viewport but instead
    // select nodes with a selection box.

    let shiftDown = false;
    let mouseDown = false;
    let selecting = false;

    const updateCursor = () => {
      const oldCursor = this.viewport.cursor;

      if (selecting || shiftDown) {
        this.viewport.cursor = 'crosshair';
      } else {
        this.viewport.cursor = mouseDown ? 'grabbing' : 'grab';
      }

      if (view.style.cursor === oldCursor) {
        view.style.cursor = this.viewport.cursor;
      }
    };

    this.viewport.on('drag-start', () => {
      mouseDown = true;
      updateCursor();
    });
    this.viewport.on('drag-end', () => {
      mouseDown = false;
      updateCursor();
    });

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Shift') {
        shiftDown = true;
        updateCursor();

        if (selecting) return;
        this.viewport.plugins.pause('drag');
      }
    });
    window.addEventListener('keyup', (e) => {
      if (e.key === 'Shift') {
        shiftDown = false;
        updateCursor();

        if (selecting) return;
        this.viewport.plugins.resume('drag');
      }
    });

    let selectionBox: pixi.Graphics | null = null;
    let start: pixi.Point | null = null;

    this.viewport.on('mousedown', (e: pixi.FederatedMouseEvent) => {
      mouseDown = true;
      updateCursor();

      if (shiftDown) {
        start = e.global.clone();
      }
    });
    this.viewport.on('mouseup', () => {
      mouseDown = false;
      updateCursor();

      if (selectionBox) {
        // Selection complete

        this.appStateManager.emit(
          'selection',
          new Rect2D(selectionBox.getBounds()),
        );

        selectionBox.destroy();
        selectionBox = null;
        start = null;
        selecting = false;

        if (!shiftDown) {
          this.viewport.plugins.resume('drag');
          updateCursor();
        }
      } else if (shiftDown) {
        // Null selection

        this.appStateManager.emit('selection', new Rect2D(0, 0, 0, 0));
      }
    });

    this.viewport.on('mousemove', (e: pixi.FederatedMouseEvent) => {
      if (!selecting && (!shiftDown || !mouseDown)) return;

      selecting = true;

      if (!selectionBox) {
        selectionBox = new pixi.Graphics();
        this.app.stage.addChild(selectionBox);
      }

      selectionBox.clear();
      selectionBox.lineStyle(1, 0xffffff, 1);
      selectionBox.beginFill(0xffffff, 0.1);
      selectionBox.drawRect(
        Math.min(start!.x, e.global.x),
        Math.min(start!.y, e.global.y),
        Math.abs(e.global.x - start!.x),
        Math.abs(e.global.y - start!.y),
      );
    });

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
    this.graphView = new GraphView(this.viewport, this.app);

    this.viewport.on('zoomed', () => {
      this.appStateManager.set('zoomLevel', this.viewport.scale.x * 100);
    });

    this.viewport.on('moved', () => {
      this.appStateManager.set(
        'translation',
        new Vector2D(
          Math.round(this.viewport.center.x),
          Math.round(this.viewport.center.y),
        ),
      );
    });

    this.appStateManager.observe('zoomLevel', (zoomLevel) => {
      this.zoomLevel = zoomLevel;
    });

    this.appStateManager.observe('translation', (translation) => {
      this.viewport.moveCenter(translation.x, translation.y);
    });

    this.appStateManager.on('reload', () => {
      if (!this.graphView.graph) return;

      this.#loadingOverlay.style.display = '';

      window.setTimeout(() => {
        this.graphView.setGraph(this.graphView.graph);
      }, 100);
    });

    this.appStateManager.on('start-sim', () => {
      this.#loadingOverlay.style.display = 'none';
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
    const float = value / 100;

    if (float === this.viewport.scale.x) return;

    this.viewport.setZoom(float);
    this.refresh();
    this.appStateManager.set('zoomLevel', value);
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

    if (errors.length > 0) {
      this.#loadingOverlay.style.display = 'none';

      const dialog = new ModalDialog({
        title: '⚠️ Feil',
        html: html`
          <p>
            Det oppstod ein feil under lasting av dataa. Prøv igjen seinare.
          </p>
          <p>
            Artikkel-ID: <code>${articleId}</code>, Ordbok:
            <code>${dictionary}</code>
          </p>
          ${errors.reduce(
            (acc, error) =>
              acc + html` <p><code>${text`${error.message}`}</code></p> `,
            '',
          )}
        `,
      });
      document.body.appendChild(dialog);
      dialog.show();
      return;
    }

    this.graphView.setGraph(graph);

    // this.center();
  }
}

customElements.define('vis-viewport', Viewport);

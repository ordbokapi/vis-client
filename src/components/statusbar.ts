import { html } from '../utils/index.js';
import { StateManagedElement } from './state-managed-element.js';
import sharedStyles from 'bundle-text:../../static/shared.css';
import './tooltip-cue.js';
import { Vector2D } from '../types/index.js';
import { PopOver } from './pop-over.js';

/**
 * Statusbar which provides controls for the viewport, such as zooming and
 * centering the viewport.
 */
export class Statusbar extends StateManagedElement {
  /**
   * The root element.
   */
  #root: HTMLDivElement;

  /**
   * The current zoom level.
   */
  #zoomLevel = 100;

  /**
   * The current zoom level.
   */
  get zoomLevel() {
    return this.#zoomLevel;
  }
  set zoomLevel(value: number) {
    this.#zoomLevel = Math.round(value);
    this.#updateZoomLabel();
    this.appStateManager.set('zoomLevel', this.#zoomLevel);
  }

  /**
   * The amount to zoom in or out by when the zoom buttons are clicked.
   */
  zoomStep = 25;

  /**
   * The amount to zoom in or out by when the zoom buttons are clicked while
   * holding down the shift key.
   */
  shiftZoomStep = 10;

  /**
   * The minimum zoom level.
   */
  minZoom = 10;

  /**
   * The maximum zoom level.
   */
  maxZoom = 200;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot!.innerHTML = html`
      <style>
        /* prettier-ignore */
        ${sharedStyles}

        :host {
          display: block;
          height: 2rem;
          background-color: #353535;
          border-top: 1px solid #666;
          padding: 0.25rem;
          font-family: 'IBM Plex Sans', sans-serif;
          font-size: 0.8rem;
          overflow: hidden;
        }

        #statusbar {
          display: flex;
          align-items: center;
          justify-content: flex-start;
        }

        #statusbar > * {
          margin: 0 0.25rem;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        #zoom-label {
          width: 3rem;
          text-align: center;
        }

        .separator {
          display: block;
          border-left: 1px solid #666;
          min-height: 1.5rem;
          min-width: 1px;
          clear: both;
        }

        .fill-width {
          flex: 1;
        }

        #github-link img {
          filter: invert(0.7);
        }
      </style>
      <div id="statusbar">
        <span class="emoji-icon" title="Zoom-kontroller">🔍</span>
        <button id="zoom-out" title="Zoom ut (CTRL+-)">➖</button>
        <input
          id="zoom-label"
          type="text"
          value="100%"
          maxlength="5"
          title="Zoom-nivå"
        />
        <button id="zoom-in" title="Zoom inn (CTRL++)">➕</button>
        <vis-tooltip-cue
          tooltip="Hald Shift nede medan du trykkjer for å zooma sakte"
        >
        </vis-tooltip-cue>
        <div class="separator"></div>
        <button id="center-view" title="CTRL+0">Sentrar vising</button>
        <div class="separator"></div>
        <button
          id="restart-simulation"
          title="Start simulering på nytt (CTRL+1)"
        >
          🔄
        </button>
        <div class="separator"></div>
        <button id="share-link" title="Del lenke">🔗</button>
        <div class="fill-width"></div>
        <a
          href="https://github.com/ordbokapi/vis-client"
          id="github-link"
          class="btn"
        >
          <img
            src="https://github.com/favicon.ico"
            alt="GitHub-prosjekt"
            title="GitHub-prosjekt"
            width="24"
            height="24"
          />
        </a>
        <a href="https://ordbokapi.org" id="ordbokapi-link" class="btn">
          <img
            src="https://ordbokapi.org/favicon.ico"
            alt="Ordbok-API"
            title="Ordbok-API"
            width="32"
            height="32"
          />
        </a>
      </div>
    `;
    this.#root = this.shadowRoot!.querySelector('#statusbar') as HTMLDivElement;

    (
      this.#root.querySelector('#zoom-out') as HTMLButtonElement
    ).addEventListener('click', (event) => this.#zoom('out', event.shiftKey));

    (
      this.#root.querySelector('#zoom-in') as HTMLButtonElement
    ).addEventListener('click', (event) => this.#zoom('in', event.shiftKey));

    this.#root.querySelector('#center-view')!.addEventListener('click', () => {
      this.appStateManager.set('translation', new Vector2D(0, 0));
    });

    this.#root
      .querySelector('#restart-simulation')!
      .addEventListener('click', () => {
        this.appStateManager.emit('reload');
      });

    this.#root.querySelector('#share-link')!.addEventListener('click', () => {
      this.appStateManager.emit('request-node-positions');
    });

    this.appStateManager.on('node-positions', () => {
      const url = new URL(window.location.href);
      url.search = this.appStateManager.serialize(true);
      navigator.clipboard.writeText(url.toString());

      const popOver = new PopOver();

      popOver.text = 'Lenke kopiert til utklippstavla';
      popOver.target = this.#root.querySelector('#share-link')! as HTMLElement;
      popOver.show();
    });

    this.#root
      .querySelector('#zoom-label')!
      .addEventListener('change', (event: Event) => {
        const target = event.target as HTMLInputElement;
        const value = Number.parseInt(target.value, 10);
        if (isNaN(value)) {
          target.value = `${this.zoomLevel}%`;
          return;
        }
        this.zoomLevel = Math.min(this.maxZoom, Math.max(this.minZoom, value));
        this.appStateManager.set('zoomLevel', this.zoomLevel);
      });

    this.#root
      .querySelector('#zoom-label')!
      .addEventListener('focus', (event: Event) => {
        const target = event.target as HTMLInputElement;
        target.select();
      });

    window.addEventListener('keydown', (event) => {
      if (event.ctrlKey) {
        switch (event.key) {
          case '+':
            event.preventDefault();
            this.#zoom('in', event.shiftKey);
            break;
          case '-':
            event.preventDefault();
            this.#zoom('out', event.shiftKey);
            break;
          case '0':
            event.preventDefault();
            this.appStateManager.set('translation', new Vector2D(0, 0));
            break;
          case '1':
            event.preventDefault();
            this.appStateManager.emit('reload');
            break;
        }
      }
    });

    this.appStateManager.observe('zoomLevel', (zoomLevel) => {
      this.#zoomLevel = Math.round(zoomLevel);
      this.#updateZoomLabel();
    });
  }

  #zoom(direction: 'in' | 'out', smallSteps = false) {
    const zoomStep = smallSteps ? this.shiftZoomStep : this.zoomStep;

    const nearestStep =
      direction === 'in'
        ? Math.ceil(this.zoomLevel / zoomStep) * zoomStep
        : Math.floor(this.zoomLevel / zoomStep) * zoomStep;
    const nextStep =
      direction === 'in' ? nearestStep + zoomStep : nearestStep - zoomStep;

    // if the nearest step is more than a quarter of the way to the next step,
    // just zoom to the nearest step instead of the next step.
    const targetStep =
      Math.abs(nearestStep - this.zoomLevel) > zoomStep / 4
        ? nearestStep
        : nextStep;

    this.zoomLevel = Math.min(this.maxZoom, Math.max(this.minZoom, targetStep));

    this.appStateManager.set('zoomLevel', this.zoomLevel);
  }

  /**
   * Updates the zoom label.
   */
  #updateZoomLabel() {
    const zoomLabel = this.#root.querySelector(
      '#zoom-label',
    )! as HTMLInputElement;
    zoomLabel.value = `${this.zoomLevel}%`;
  }
}

customElements.define('vis-statusbar', Statusbar);

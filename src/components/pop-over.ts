import { html } from '../utils/html.js';
import sharedStyles from 'bundle-text:../../static/shared.css';

/**
 * A pop-over element that displays a small amount of text when displayed, and
 * then fades out after a short delay. It is given an element that it should
 * appear above, and it will automatically position itself above that element.
 */
export class PopOver extends HTMLElement {
  /**
   * The root element.
   */
  #root: HTMLDivElement;

  /**
   * The element that this pop-over should appear above.
   */
  #target?: HTMLElement;

  /**
   * The text to display in the pop-over.
   */
  #text?: string;

  /**
   * The amount of time to wait before fading out.
   */
  #delay = 1000;

  /**
   * The amount of time to take to fade out.
   */
  #duration = 1000;

  /**
   * The amount of time to wait before fading out.
   */
  get delay() {
    return this.#delay;
  }
  set delay(value: number) {
    this.#delay = value;
  }

  /**
   * The amount of time to take to fade out.
   */
  get duration() {
    return this.#duration;
  }
  set duration(value: number) {
    this.#duration = value;
  }

  /**
   * The element that this pop-over should appear above.
   */
  get target() {
    return this.#target;
  }
  set target(value: HTMLElement | undefined) {
    this.#target = value;
    this.#updatePosition();
  }

  /**
   * The text to display in the pop-over.
   */
  get text() {
    return this.#text;
  }
  set text(value: string | undefined) {
    this.#text = value;
    this.#updateText();
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
          position: absolute;
          top: 0;
          left: 0;
          z-index: 1000;
          pointer-events: none;
          opacity: 0;
          transition: opacity 0.2s ease-in-out;
        }

        :host(.visible) {
          opacity: 1;
        }

        #root {
          display: block;
          position: absolute;
          top: 0;
          left: 0;
          padding: 0.5rem;
          background-color: var(--secondary-bg-color);
          border: 1px solid var(--border-color);
          border-radius: 0.25rem;
          box-shadow: 0 0.25rem 0.5rem rgba(0, 0, 0, 0.25);
          font-size: 0.75rem;
          line-height: 1rem;
          color: var(--main-text-color);
          pointer-events: auto;
          white-space: nowrap;
        }
      </style>
      <div id="root"></div>
    `;
    this.#root = this.shadowRoot!.querySelector('#root') as HTMLDivElement;
  }

  /**
   * Updates the position of the pop-over.
   */
  #updatePosition() {
    if (!this.#target) return;

    const targetRect = this.#target.getBoundingClientRect();
    const rootRect = this.#root.getBoundingClientRect();

    this.#root.style.top = `${targetRect.top - rootRect.height - 10}px`;
    this.#root.style.left = `${targetRect.left + targetRect.width / 2 - rootRect.width / 2}px`;
  }

  /**
   * Updates the text of the pop-over.
   */
  #updateText() {
    this.#root.textContent = this.#text ?? '';
  }

  /**
   * Shows the pop-over.
   */
  show() {
    if (!this.parentNode) {
      document.body.appendChild(this);
    }
    this.classList.add('visible');
    this.#updatePosition();
    setTimeout(() => this.hide(), this.#delay);
  }

  /**
   * Hides the pop-over.
   */
  hide() {
    this.classList.remove('visible');
    setTimeout(() => {
      if (this.parentNode) {
        this.parentNode.removeChild(this);
      }
    }, this.#duration);
  }
}

customElements.define('vis-pop-over', PopOver);

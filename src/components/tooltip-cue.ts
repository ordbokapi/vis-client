import { html } from '../utils/index.js';

/**
 * Tooltip cue. Displays a question mark icon which, when hovered over, displays
 * a tooltip.
 * @example
 * ```html
 * <vis-tooltip-cue tooltip="This is the tooltip text.">
 * ```
 */
export class TooltipCue extends HTMLElement {
  /**
   * The root element.
   */
  #root: HTMLDivElement;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot!.innerHTML = html`
      <style>
        :host {
          display: inline-block;
          position: relative;
        }

        #root {
          display: inline-block;
        }

        #cue {
          cursor: help;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 1.2rem;
          min-height: 1.2rem;
          max-width: 1.2rem;
          max-height: 1.2rem;
          font-size: 1rem;
          font-weight: bold;
          color: #bbb;
          border-radius: 50%;
          border: 1px solid #999;
          content: '';
        }
      </style>
      <div id="root">
        <div id="cue">?</div>
      </div>
    `;
    this.#root = this.shadowRoot!.querySelector('#root')!;

    const observer = new MutationObserver(() => this.#updateTooltip());

    observer.observe(this, { attributes: true, attributeFilter: ['tooltip'] });

    this.#updateTooltip();
  }

  /**
   * The tooltip text.
   */
  get tooltip(): string | null {
    return this.getAttribute('tooltip');
  }

  set tooltip(value: string | null) {
    if (value === null) {
      this.removeAttribute('tooltip');
    } else {
      this.setAttribute('tooltip', value);
    }
  }

  /**
   * Updates the tooltip text.
   */
  #updateTooltip() {
    this.#root.title = this.tooltip ?? '';
  }
}

customElements.define('vis-tooltip-cue', TooltipCue);

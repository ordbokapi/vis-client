import { html } from '../utils/index.js';

/**
 * Loading icon which is displayed when the app is loading data. Built entirely
 * with CSS.
 */
export class LoadingIcon extends HTMLElement {
  constructor() {
    super();

    this.attachShadow({ mode: 'open' });

    this.shadowRoot!.innerHTML = html`
      <style>
        :host {
          display: block;
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          z-index: 2;
        }

        .loading-container {
          display: inline-block;
          position: relative;
          width: 1em;
          height: 1em;
          font-size: inherit;
        }

        .loading-dot {
          position: absolute;
          top: 0.41em;
          width: 0.16em;
          height: 0.16em;
          border-radius: 50%;
          background: #999;
          animation-timing-function: cubic-bezier(0, 1, 1, 0);
        }

        .loading-dot:first-child {
          left: 0.1em;
          animation: dot-expand 0.7s infinite;
        }

        .loading-dot:nth-child(2) {
          left: 0.1em;
          animation: dot-slide 0.7s infinite;
        }

        .loading-dot:nth-child(3) {
          left: 0.4em;
          animation: dot-slide 0.7s infinite;
        }

        .loading-dot:last-child {
          left: 0.7em;
          animation: dot-shrink 0.7s infinite;
        }

        @keyframes dot-expand {
          0% {
            transform: scale(0);
          }
          100% {
            transform: scale(1);
          }
        }

        @keyframes dot-shrink {
          0% {
            transform: scale(1);
          }
          100% {
            transform: scale(0);
          }
        }

        @keyframes dot-slide {
          0% {
            transform: translate(0, 0);
          }
          100% {
            transform: translate(0.3em, 0);
          }
        }
      </style>
      <div class="loading-container">
        <div class="loading-dot"></div>
        <div class="loading-dot"></div>
        <div class="loading-dot"></div>
        <div class="loading-dot"></div>
      </div>
    `;
  }
}

customElements.define('vis-loading-icon', LoadingIcon);

import appLogo from 'url:../../static/images/ordbokapi-vis-client-logo-in-app.png';
import { html } from '../utils/index.js';

/**
 * App logo which is displayed in the top left corner of the viewport.
 */
export class AppLogo extends HTMLElement {
  constructor() {
    super();

    this.attachShadow({ mode: 'open' });

    this.shadowRoot!.innerHTML = html`
      <style>
        :host {
          display: block;
          position: absolute;
          top: 1rem;
          left: 1rem;
          z-index: 1;
        }

        #logo {
          width: 10rem;
          height: auto;
          user-select: none;
        }

        @media (max-width: 1299px) {
          #logo {
            width: 8rem;
            margin-top: -0.3rem;
          }
        }

        @media (max-width: 1049px) {
          #logo {
            clip-path: inset(0 5rem 0 0);
          }
        }

        @media (max-width: 899px) {
          #logo {
            display: none;
          }
        }
      </style>
      <img id="logo" src="${appLogo}" alt="Ordbok API Vis-klient logo" />
    `;
  }
}

customElements.define('vis-app-logo', AppLogo);

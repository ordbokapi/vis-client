import { html } from '../utils/index.js';
import sharedStyles from 'bundle-text:../../static/shared.css';

/**
 * Options for initializing a modal dialog.
 */
export interface ModalDialogOptions {
  /**
   * The title of the dialog.
   */
  title: string;

  /**
   * Plain text content of the dialog.
   */
  textContent?: string;

  /**
   * HTML content of the dialog. Overrides `textContent`.
   */
  html?: Node | string;

  /**
   * The callback function to invoke when the dialog is closed.
   */
  onClose?: () => void;
}

/**
 * Modal dialog component, which displays a modal dialog over the rest of the
 * application.
 */
export class ModalDialog extends HTMLElement {
  /**
   * The root element of the component.
   */
  #root: HTMLDivElement;

  /**
   * The title of the dialog.
   */
  #title: string;

  /**
   * The content of the dialog.
   */
  #content: Node;

  /**
   * The close button.
   */
  #closeButton: HTMLButtonElement;

  /**
   * The callback function to invoke when the dialog is closed.
   */
  #onClose?: () => void;

  /**
   * Creates a new modal dialog component.
   * @param options The options for initializing the dialog.
   */
  constructor(options: ModalDialogOptions) {
    super();

    const { title, textContent, html: htmlContent, onClose } = options;

    const htmlToElement = (html: string) => {
      const template = document.createElement('template');
      template.innerHTML = html;
      return template.content;
    };

    this.#title = title;
    this.#content = htmlContent
      ? typeof htmlContent === 'string'
        ? htmlToElement(htmlContent)
        : htmlContent
      : textContent
        ? document.createTextNode(textContent)
        : document.createTextNode('');
    this.#onClose = onClose;

    console.log(this.#content);

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
          width: 100%;
          height: 100%;
        }

        #backdrop {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          user-select: none;
          background: rgba(0, 0, 0, 0.7);
          z-index: 1;
        }

        #dialog {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: #252525;
          border: 1px solid #666;
          border-radius: 0.5rem;
          padding: 1rem;
          z-index: 2;
          min-width: 300px;
          max-width: min(80vw, 500px);
          min-height: 200px;
          max-height: min(80vh, 500px);
          display: flex;
          flex-direction: column;
        }

        #title {
          font-size: 1.5rem;
          font-weight: bold;
          margin-bottom: 1rem;
        }

        #content {
          max-height: 80vh;
          overflow: auto;
          flex: 1;
        }

        #close-button {
          position: absolute;
          top: 0;
          right: 0;
          border: none;
          background: none;
          color: #ccc;
          font-size: 1.5rem;
          padding: 0.5rem;
          cursor: pointer;
        }

        #buttons {
          display: flex;
          justify-content: flex-end;
          margin-top: 1rem;
        }
      </style>
      <div id="backdrop"></div>
      <div id="dialog">
        <div id="title">${title}</div>
        <div id="content"></div>
        <div id="buttons">
          <button id="ok-button">OK</button>
        </div>
        <button id="close-button">&times;</button>
      </div>
    `;

    this.#root = this.shadowRoot!.querySelector('#dialog') as HTMLDivElement;
    this.#closeButton = this.shadowRoot!.querySelector(
      '#close-button',
    ) as HTMLButtonElement;
    this.#closeButton.addEventListener('click', () => this.close());
    this.shadowRoot!.querySelector('#ok-button')!.addEventListener(
      'click',
      () => this.close(),
    );
    this.#root.querySelector('#content')!.appendChild(this.#content);
  }

  /**
   * Shows the dialog.
   */
  show() {
    this.style.display = 'block';
  }

  /**
   * Closes the dialog.
   */
  close() {
    this.style.display = 'none';
    this.parentNode?.removeChild(this);
    this.#onClose?.();
  }
}

customElements.define('vis-modal-dialog', ModalDialog);

import * as PIXI from 'pixi.js';
import { Rect2D } from '../types/index.js';

export class DebugPanel {
  #appCanvas: PIXI.Container;
  #debugPanelRect: Rect2D;
  #texts: PIXI.Text[];
  #textStyles: PIXI.TextStyle;
  #currentYOffset: number;
  #lineHeight: number;

  constructor(
    appCanvas: PIXI.Container,
    debugPanelRect: Rect2D = new Rect2D(20, 100, 200, 400),
  ) {
    this.#appCanvas = appCanvas;
    this.#debugPanelRect = debugPanelRect;
    this.#texts = [];
    this.#textStyles = new PIXI.TextStyle({
      fill: 'white',
      fontSize: 12,
    });
    this.#lineHeight = 20;
    this.#currentYOffset = this.#lineHeight / 2;
    this.#initializePanel();
  }

  #initializePanel(): void {
    this.#appCanvas.addChild(
      new PIXI.Graphics()
        .rect(
          this.#debugPanelRect.x,
          this.#debugPanelRect.y,
          this.#debugPanelRect.width,
          this.#debugPanelRect.height,
        )
        .stroke({ color: 0xffffff, width: 1 })
        .fill({ color: 0x000000, alpha: 0.5 }),
    );
  }

  addText(text: string): void {
    const newText = new PIXI.Text({ text, style: this.#textStyles });
    newText.position.x = this.#debugPanelRect.x + 10;
    newText.position.y = this.#debugPanelRect.y + this.#currentYOffset;
    this.#currentYOffset += this.#lineHeight;
    this.#texts.push(newText);
    this.#appCanvas.addChild(newText);
  }

  updateText(index: number, newText: string): void {
    if (index >= 0 && index < this.#texts.length) {
      this.#texts[index].text = newText;
    }
  }

  setText(index: number, text: string): void {
    const textObj = this.#texts[index];

    if (textObj) {
      textObj.text = text;
      return;
    }

    const newText = new PIXI.Text({ text, style: this.#textStyles });
    newText.position.x = this.#debugPanelRect.x + 10;
    newText.position.y =
      this.#debugPanelRect.y + this.#lineHeight * index + this.#lineHeight / 2;
    if (index >= this.#texts.length) {
      this.#currentYOffset = this.#lineHeight * index + this.#lineHeight / 2;
    }
    this.#texts[index] = newText;
    this.#appCanvas.addChild(newText);
  }

  clear(): void {
    this.#texts.forEach((text) => this.#appCanvas.removeChild(text));
    this.#texts = [];
    this.#currentYOffset = 10;
    this.#appCanvas.removeChildren();
    this.#initializePanel();
  }

  render(): void {
    this.#appCanvas.removeChildren();
    this.#initializePanel();
    this.#texts.forEach((text) => this.#appCanvas.addChild(text));
  }
}

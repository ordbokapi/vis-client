import * as pixi from 'pixi.js';
// @ts-expect-error Broken types
import { Viewport as PixiViewport } from 'pixi-viewport';
import {
  IGraphBehaviour,
  IGraphBehaviourInitializationOptions,
} from './graph-behaviour.js';
import { Vector2D } from '../../types/index.js';
import { Viewport } from '../../components/viewport.js';

/**
 * Draws a grid behind the graph.
 */
export class GraphGridBehaviour implements IGraphBehaviour {
  /**
   * Grid graphics.
   */
  #gridGraphics: pixi.Graphics;

  /**
   * The PixiJS application.
   */
  #application: pixi.Application;

  /**
   * The viewport.
   */
  #viewport: PixiViewport;

  constructor({
    application,
    viewport,
    appStateManager,
  }: IGraphBehaviourInitializationOptions) {
    this.#application = application;
    this.#viewport = viewport;

    this.#gridGraphics = this.#application.stage.addChildAt(
      new pixi.Graphics(),
      0,
    );

    viewport.on('zoomed', () => {
      this.#renderGrid();
    });

    viewport.on('moved', () => {
      this.#renderGrid();
    });

    appStateManager.observe('translation', (_, source) => {
      if (source instanceof Viewport) {
        return;
      }

      window.requestAnimationFrame(() => {
        this.#renderGrid();
      });
    });

    appStateManager.observe('zoomLevel', (_, source) => {
      if (source instanceof Viewport) {
        return;
      }

      window.requestAnimationFrame(() => {
        this.#renderGrid();
      });
    });

    const resizeObserver = new ResizeObserver(() => {
      this.#renderGrid();
    });

    resizeObserver.observe(this.#application.view as HTMLCanvasElement);
  }

  /**
   * Render an unobtrusive grid that fills the viewport background.
   */
  #renderGrid() {
    const colourMajor = 0x303030;
    const colourMinor = 0x252525;

    // Draw a major line as every n'th line, where n is majorEvery
    const majorEvery = 5;

    const x = 0;
    const y = 0;
    const { width, height } = this.#application.screen;

    const scale: number = this.#viewport.scale.x;

    const maxCellSize = 400 * scale;

    const steps = Math.max(1, Math.floor(Math.log2(scale) + 4));

    const minCellSize = maxCellSize / Math.pow(2, steps - 1);
    const majorInterval = majorEvery - 1;

    // align major grid line with the center of the screen
    const center = new Vector2D(this.#viewport.center)
      .multiply(-scale)
      .modulate(majorInterval * minCellSize)
      .add(new Vector2D(width / 2, height / 2));

    // ensure that the grid moves smoothly with the viewport
    const offset = center.modulate(minCellSize * 2).subtract(minCellSize);

    const start = offset.subtract(minCellSize * 2);
    const end = new Vector2D(x + width + minCellSize, y + height + minCellSize);

    this.#gridGraphics.clear();

    let colour = colourMajor;

    const horizontalFraction =
      ((center.x - start.x) / minCellSize) % majorInterval;
    const initialHorizontalI =
      (majorInterval - horizontalFraction) % majorInterval;

    for (
      let currentX = start.x, i = initialHorizontalI;
      currentX <= end.x;
      currentX += minCellSize, i++
    ) {
      const newColour =
        Math.floor(i + 0.5) % majorInterval === 0 ? colourMajor : colourMinor;

      if (newColour !== colour) {
        this.#gridGraphics.lineStyle(1, newColour, 0.8);
        colour = newColour;
      }

      this.#gridGraphics.moveTo(currentX, start.y);
      this.#gridGraphics.lineTo(currentX, end.y);
    }

    const verticalFraction =
      ((center.y - start.y) / minCellSize) % majorInterval;
    const initialVerticalI = (majorInterval - verticalFraction) % majorInterval;

    for (
      let currentY = start.y, i = initialVerticalI;
      currentY <= end.y;
      currentY += minCellSize, i++
    ) {
      const newColour =
        Math.floor(i + 0.5) % majorInterval === 0 ? colourMajor : colourMinor;

      if (newColour !== colour) {
        this.#gridGraphics.lineStyle(1, newColour, 0.8);
        colour = newColour;
      }

      this.#gridGraphics.moveTo(start.x, currentY);
      this.#gridGraphics.lineTo(end.x, currentY);
    }
  }
}

import * as pixi from 'pixi.js';
import { Rect2D, Vector2D } from '../../types/index.js';
import {
  IGraphBehaviourOptions,
  IGraphBehaviour,
  IGraphBehaviourOnlyInitializationOptions,
} from './graph-behaviour.js';
import { Article, ScopedAppStateManager } from '../../providers/index.js';
import { NodeSelection } from '../node-selection.js';

/**
 * Node selection behaviour.
 */
export class GraphSelectionBehaviour implements IGraphBehaviour {
  #appStateManager!: ScopedAppStateManager;
  #selection!: NodeSelection;
  #graphics?: pixi.Container;
  #node?: d3.SimulationNodeDatum & Article;
  #isMouseDown = false;
  #lastPosition = new Vector2D();
  #distanceTravelled = 0;

  /**
   * The maximum distance the pointer can move before the mouse down and up
   * events are not considered a click anymore.
   */
  readonly #clickThresholdDistance = 10;

  constructor({
    appStateManager,
    graphicsMap: nodeMap,
    selection,
    allGraphics,
    viewport,
  }: IGraphBehaviourOnlyInitializationOptions) {
    this.#appStateManager = appStateManager;
    this.#selection = selection;

    appStateManager.observe('sidebarArticle', (article) => {
      if (!article) {
        return;
      }

      const graphics = nodeMap.get(article.id, article.dictionary);
      if (!graphics) {
        return;
      }

      if (selection.has(graphics)) {
        selection.clear();
        return;
      }

      selection.select(graphics);
    });

    appStateManager.on('selection', (rect) => {
      selection.clear();

      for (const node of allGraphics) {
        const nodeRect = new Rect2D(node.getBounds());

        if (rect.intersectsRect(nodeRect)) {
          selection.add(node);
        }
      }
    });

    viewport.on('pointermove', (event: pixi.FederatedMouseEvent) => {
      if (!this.#isMouseDown) {
        return;
      }

      // track how much the pointer has moved over time, then set the last
      // position to the current position
      if (this.#distanceTravelled < this.#clickThresholdDistance) {
        const globalPos = new Vector2D(event.global);
        this.#distanceTravelled += this.#lastPosition.distance(globalPos);

        this.#lastPosition = globalPos;
      }
    });

    viewport.on('pointerup', () => {
      if (!this.#isMouseDown) {
        return;
      }

      this.#isMouseDown = false;

      if (this.#distanceTravelled < this.#clickThresholdDistance) {
        this.#selectNode();
      }

      this.#distanceTravelled = 0;
    });

    viewport.on('pointerupoutside', () => {
      this.#isMouseDown = false;
    });

    window.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape') {
        return;
      }

      selection.clear();
    });
  }

  #selectNode() {
    if (!this.#graphics || !this.#node) {
      return;
    }

    if (this.#selection.has(this.#graphics)) {
      this.#selection.clear();
      this.#appStateManager.set('sidebarArticle', null);
      return;
    }

    this.#appStateManager.set('sidebarArticle', {
      id: this.#node.id,
      dictionary: this.#node.dictionary,
    });

    this.#selection.select(this.#graphics);
  }

  /**
   * Hooks up the graph behaviour.
   * @param options The graph behaviour options.
   */
  nodeGraphicsCreated({ graphics, node }: IGraphBehaviourOptions) {
    graphics.on('pointerdown', (event) => {
      this.#isMouseDown = true;
      this.#lastPosition = new Vector2D(event.global);
      this.#graphics = graphics;
      this.#node = node;
    });
  }
}

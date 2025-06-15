import * as pixi from 'pixi.js';
import { Vector2D } from '../../types/index.js';
import {
  IGraphBehaviourOptions,
  IGraphBehaviour,
  IGraphBehaviourOnlyInitializationOptions,
} from './graph-behaviour.js';
import { Article } from '../../providers/index.js';

/**
 * Node drag behaviour state.
 */
export interface IGraphDragBehaviourState {
  /**
   * Whether nodes are being dragged.
   */
  isDragging: boolean;
}

/**
 * Node drag behaviour.
 */
export class GraphDragBehaviour
  implements IGraphBehaviour<IGraphDragBehaviourState>
{
  #state: IGraphDragBehaviourState = {
    isDragging: false,
  };

  #anchorOffset = new Vector2D();
  #data = new Vector2D();
  #nodes: (d3.SimulationNodeDatum & Article)[];
  #node?: d3.SimulationNodeDatum & Article;
  #graphics?: pixi.Container;
  #index?: number;

  getState() {
    return this.#state;
  }

  constructor({
    viewport,
    selection,
    simulation,
    nodes,
    allGraphics,
  }: IGraphBehaviourOnlyInitializationOptions) {
    this.#nodes = nodes;

    viewport.on('pointermove', (event: pixi.FederatedMouseEvent) => {
      if (
        this.#state.isDragging &&
        this.#node &&
        this.#graphics &&
        this.#index !== undefined
      ) {
        const d3Pos = new Vector2D(this.#node.x!, this.#node.y!);
        this.#data = new Vector2D(
          event.getLocalPosition(this.#graphics.parent),
        );

        const newPosition = this.#data.subtract(this.#anchorOffset);
        this.#node.fx = newPosition.x;
        this.#node.fy = newPosition.y;
        this.#node.x = newPosition.x;
        this.#node.y = newPosition.y;

        if (selection.has(this.#graphics)) {
          for (const selected of selection) {
            if (this.#graphics === selected) continue;

            const otherD3Node =
              simulation.nodes()[allGraphics.indexOf(selected)];

            const otherNodePosition = new Vector2D(
              otherD3Node.x!,
              otherD3Node.y!,
            );
            const offset = otherNodePosition.subtract(d3Pos);
            const otherNodeNewPosition = newPosition.add(offset);

            otherD3Node.fx = otherNodeNewPosition.x;
            otherD3Node.fy = otherNodeNewPosition.y;
            otherD3Node.x = otherNodeNewPosition.x;
            otherD3Node.y = otherNodeNewPosition.y;
          }
        }
      }
    });

    viewport.on('pointerup', () => {
      if (
        this.#state.isDragging &&
        this.#node &&
        this.#graphics &&
        this.#index !== undefined
      ) {
        // enable viewport dragging
        viewport.plugins.resume('drag');

        this.#state.isDragging = false;
        this.#node.fx = null;
        this.#node.fy = null;

        if (selection.has(this.#graphics)) {
          for (const graphics of selection) {
            if (graphics === graphics) continue;

            const d3Node = this.#nodes[this.#index];

            d3Node.fx = null;
            d3Node.fy = null;
          }
        }
      }
    });

    viewport.on('pointerupoutside', () => {
      if (this.#state.isDragging && this.#node) {
        this.#state.isDragging = false;
        this.#node.fx = null;
        this.#node.fy = null;
      }
    });
  }

  nodeGraphicsCreated({
    graphics,
    node,
    viewport,
    index,
  }: IGraphBehaviourOptions) {
    graphics.on('pointerdown', (event) => {
      // disable viewport dragging
      viewport.plugins.pause('drag');

      this.#state.isDragging = true;
      // calculate offset from location of pointer to center of node
      this.#anchorOffset = new Vector2D(
        event.getLocalPosition(graphics.parent),
      ).subtract(new Vector2D(graphics));

      this.#data = new Vector2D(graphics);
      this.#graphics = graphics;
      this.#node = node;
      this.#index = index;
    });
  }
}

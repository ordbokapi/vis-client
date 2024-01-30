import * as pixi from 'pixi.js';
import * as d3 from 'd3';
import RBush from 'rbush';
import {
  IGraphBehaviour,
  IGraphBehaviourAllNodeOptions,
  IGraphBehaviourOnlyInitializationOptions,
} from './graph-behaviour.js';
import { Article } from '../../providers/index.js';
import { BoundingBoxCache } from '../bounding-box-cache.js';
import { IndexedSet, Rect2D, Vector2D } from '../../types/index.js';

/**
 * Node bounding box behaviour state.
 */
export interface INodeBBoxBehaviourState {
  /**
   * The node bounding box cache.
   */
  cache: BoundingBoxCache;

  /**
   * Searches for nodes that intersect with the given bounding box.
   * @param rect The search bounding box.
   */
  nodesIn(rect: Rect2D): IterableIterator<{
    graphics: pixi.Graphics;
    d3Node: d3.SimulationNodeDatum & Article;
  }>;
}

type RStarTreeLeafNode = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  graphics: pixi.Graphics;
  d3Node: d3.SimulationNodeDatum & Article;
};

type RStarTree = RBush.default<RStarTreeLeafNode>;

/**
 * Caches node bounding boxes and allows searching for nodes that intersect
 * with a given bounding box.
 */
export class GraphNodeBBoxBehaviour
  implements IGraphBehaviour<INodeBBoxBehaviourState>
{
  #cache: BoundingBoxCache;
  #tree: RStarTree;
  #state: INodeBBoxBehaviourState;
  #graphics: IndexedSet<pixi.Graphics>;
  #nodes: (d3.SimulationNodeDatum & Article)[];

  /**
   * Map of graphics to their respective R* tree leaf nodes.
   */
  #treeLeafNodes = new Map<pixi.Graphics, RStarTreeLeafNode>();

  getState() {
    return this.#state;
  }

  constructor({
    viewport,
    allGraphics,
    nodes,
    simulation,
  }: IGraphBehaviourOnlyInitializationOptions) {
    const self = this;

    this.#graphics = allGraphics;
    this.#nodes = nodes;

    this.#cache = new BoundingBoxCache(viewport);
    // @ts-ignore
    this.#tree = new RBush<RStarTreeLeafNode>();
    this.#state = {
      cache: this.#cache,
      *nodesIn({ topLeft, bottomRight }) {
        const nodes = self.#tree.search({
          minX: topLeft.x,
          minY: topLeft.y,
          maxX: bottomRight.x,
          maxY: bottomRight.y,
        });

        for (const node of nodes) {
          yield {
            graphics: node.graphics,
            d3Node: node.d3Node,
          };
        }
      },
    };

    simulation.on('tick', () => {
      this.#updateRStarTree();
    });
  }

  allNodeGraphicsCreated() {
    this.#cache.clear();
    this.#cache.reload();
    this.#rebuildRStarTree();
  }

  #graphicsToLeafNode(
    graphics: pixi.Graphics,
    d3Node: d3.SimulationNodeDatum & Article,
  ): RStarTreeLeafNode {
    const bounds = this.#cache.get(graphics);
    const leaf = {
      minX: bounds.topLeft.x,
      minY: bounds.topLeft.y,
      maxX: bounds.topLeft.x + bounds.width,
      maxY: bounds.topLeft.y + bounds.height,
      graphics,
      d3Node,
    };

    return leaf;
  }

  #rebuildRStarTree() {
    this.#tree.clear();
    this.#tree.load(
      this.#graphics.map((graphics, index) => {
        const d3Node = this.#nodes![index];
        const leaf = this.#graphicsToLeafNode(graphics, d3Node);

        this.#treeLeafNodes.set(graphics, leaf);

        return leaf;
      }),
    );
  }

  /**
   * Updates the R* tree with the current node positions.
   */
  #updateRStarTree() {
    for (const [index, graphics] of this.#graphics.entries()) {
      const leaf = this.#treeLeafNodes.get(graphics);

      if (leaf) {
        // Check if the leaf node has moved, accounting for floating point
        // errors. If it has not moved, do not update the leaf node.
        if (
          Math.abs(leaf.d3Node.x! - graphics.x) < 1e-6 &&
          Math.abs(leaf.d3Node.y! - graphics.y) < 1e-6
        ) {
          continue;
        }

        this.#tree.remove(leaf, (a, b) => a.d3Node === b.d3Node);
      } else {
        console.warn('Leaf not found for graphics:', graphics);
      }

      const d3Node = this.#nodes![index];

      const newLeaf = this.#graphicsToLeafNode(graphics, d3Node);

      this.#treeLeafNodes.set(graphics, newLeaf);
      this.#tree.insert(newLeaf);
    }
  }
}

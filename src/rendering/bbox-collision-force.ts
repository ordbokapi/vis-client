import * as d3 from 'd3';
import * as pixi from 'pixi.js';
// @ts-expect-error Broken types
import { Viewport } from 'pixi-viewport';
import { IndexedSet, Vector2D } from '../types/index.js';
import { DebugPanel } from './debug-panel.js';
import { INodeBBoxBehaviourState } from './graph-behaviours/node-bbox.js';

/**
 * A force that prevents nodes from overlapping by applying a collision force
 * between nodes based on their bounding boxes.
 */
export class BBoxCollisionForce {
  /**
   * The graphics objects that represent the nodes.
   */
  #nodeGraphics: IndexedSet<pixi.Graphics>;

  /**
   * The debug canvas used to visualize debug information in the viewport.
   */
  #debugViewportCanvas?: pixi.Graphics;

  /**
   * The debug canvas used to visualize debug information directly in the
   * application.
   */
  #debugAppCanvas?: pixi.Graphics;

  /**
   * The debug panel used to visualize debug information directly in the
   * application.
   */
  #debugPanel?: DebugPanel;

  /**
   * The viewport used to render the graph.
   */
  #viewport: Viewport;

  /**
   * The nodes that are currently being simulated.
   */
  #nodes?: any[];

  /**
   * Tracks how many ticks have passed since the nodes were last updated.
   */
  #ticksSinceNewNodes = 0;

  /**
   * How many ticks to wait before taking effect.
   */
  #ticksToWait = 0;

  /**
   * The alpha target value.
   */
  #alphaTarget = 0;

  /**
   * The strength of the collision force.
   */
  #strength = 1;

  /**
   * The maximum force applied to a node. Tracked for debugging purposes.
   */
  #maxForce = new Vector2D(0, 0);

  /**
   * Listeners to call when the force starts to take effect.
   */
  #onStartListeners: (() => void)[] = [];

  /**
   * The bounding box state.
   */
  #boundingBoxes: INodeBBoxBehaviourState;

  /**
   * Initializes the force.
   * @param viewport The viewport used to render the graph.
   * @param nodeGraphics The graphics objects that represent the nodes.
   * @param debugViewportCanvas The debug canvas used to visualize debug
   * information in the viewport.
   * @param debugAppCanvas The debug canvas used to visualize debug information
   * directly in the application.
   */
  constructor(
    viewport: Viewport,
    nodeGraphics: IndexedSet<pixi.Graphics>,
    boundingBoxes: INodeBBoxBehaviourState,
    debugViewportCanvas?: pixi.Graphics,
    debugAppCanvas?: pixi.Graphics,
  ) {
    this.#viewport = viewport;
    this.#nodeGraphics = nodeGraphics;
    this.#debugViewportCanvas = debugViewportCanvas;
    this.#debugAppCanvas = debugAppCanvas;
    this.#boundingBoxes = boundingBoxes;

    if (debugAppCanvas) {
      this.#debugPanel = new DebugPanel(debugAppCanvas);
    }
  }

  #rStarTreeSearchBoundsOffset = new Vector2D(20, 20);

  getD3Force(): d3.Force<any, any> {
    const force = (alpha: number) => {
      this.applyForce(alpha);
    };
    force.initialize = (nodes: any[]) => {
      this.initialize(nodes);
    };
    return force;
  }

  /**
   * Initializes the force.
   * @param nodes The nodes to insert.
   */
  initialize(nodes: any[]) {
    this.#nodes = nodes;
    this.#ticksSinceNewNodes = 0;
  }

  /**
   * Sets the alpha target value.
   * @param alphaTarget The alpha target value.
   */
  alphaTarget(alphaTarget: number) {
    this.#alphaTarget = alphaTarget;

    return this;
  }

  /**
   * Sets the strength of the collision force.
   * @param strength The strength of the collision force.
   */
  strength(strength: number) {
    this.#strength = strength;

    return this;
  }

  /**
   * Sets how many ticks to wait before taking effect.
   * @param ticksToWait How many ticks to wait before taking effect.
   */
  ticksToWait(ticksToWait: number) {
    this.#ticksToWait = ticksToWait;

    return this;
  }

  /**
   * Adds a listener to call when the force starts to take effect.
   * @param listener The listener to call when the force starts to take effect.
   */
  onStart(listener: () => void) {
    this.#onStartListeners.push(listener);

    return this;
  }

  /**
   * Applies the force. Runs on every tick.
   * @param alpha The current alpha value.
   */
  applyForce(alpha: number) {
    this.#debugViewportCanvas?.clear();
    this.#debugViewportCanvas?.removeChildren();
    this.#debugAppCanvas?.clear();
    this.#debugAppCanvas?.removeChildren();

    if (this.#debugPanel) {
      this.#debugPanel.render();
      this.#debugPanel.setText(0, `Simulation alpha: ${alpha.toFixed(2)}`);
      this.#debugPanel.setText(
        1,
        `Simulation alpha target: ${this.#alphaTarget.toFixed(2)}`,
      );
      this.#debugPanel.setText(2, `Nodes: ${this.#nodes!.length}`);
    }
    if (!this.#nodes || !this.#nodeGraphics) return;

    if (this.#ticksSinceNewNodes < this.#ticksToWait) {
      this.#ticksSinceNewNodes++;
      return;
    } else if (this.#ticksSinceNewNodes === this.#ticksToWait) {
      // Don't block force application to notify listeners
      window.requestAnimationFrame(() => {
        for (const listener of this.#onStartListeners) {
          try {
            listener();
          } catch (error) {
            console.warn('Failed to notify listener:', error);
          }
        }
      });

      this.#ticksSinceNewNodes++;
    }

    // alpha is a value between 0 and 1, where 1 is the start of the
    // simulation and 0 is the end of the simulation. We use this to
    // increase the force of the collision as the simulation progresses, to
    // prevent nodes from getting stuck in each other at the start of the
    // simulation when the nodes are bunched together and need to be able to
    // move freely.

    // This factor uses a 4th degree polynomial to increase the force of the
    // collision as the simulation progresses from the initial alpha of 1 to
    // the final alpha target.
    const alphaFactor = Math.pow(alpha - 1 - this.#alphaTarget, 4);

    for (const [index, d3Node] of this.#nodes!.entries()) {
      const graphicalNode = this.#nodeGraphics.get(index);
      const bounds = this.#boundingBoxes.cache.get(graphicalNode);
      const boundsCenter = bounds.center;

      if (this.#debugViewportCanvas) {
        this.#debugViewportCanvas.lineStyle(1, 0xff0000);
        this.#debugViewportCanvas.drawRect(
          bounds.x,
          bounds.y,
          bounds.width,
          bounds.height,
        );

        // draw a cross at the center of the bounds
        this.#debugViewportCanvas.lineStyle(1, 0x00ff00);
        this.#debugViewportCanvas.moveTo(boundsCenter.x - 5, boundsCenter.y);
        this.#debugViewportCanvas.lineTo(boundsCenter.x + 5, boundsCenter.y);
        this.#debugViewportCanvas.moveTo(boundsCenter.x, boundsCenter.y - 5);
        this.#debugViewportCanvas.lineTo(boundsCenter.x, boundsCenter.y + 5);

        // draw the node's vx and vy
        this.#debugViewportCanvas.lineStyle(1, 0xffff00);
        this.#debugViewportCanvas.moveTo(boundsCenter.x, boundsCenter.y);
        this.#debugViewportCanvas.lineTo(
          boundsCenter.x + d3Node.vx! * 20,
          boundsCenter.y + d3Node.vy! * 20,
        );
      }

      const searchBounds = bounds.resizeCentered(
        this.#rStarTreeSearchBoundsOffset,
      );

      for (const leaf of this.#boundingBoxes.nodesIn(searchBounds)) {
        if (leaf.d3Node === d3Node) {
          continue;
        }

        const otherNode = leaf.d3Node;
        const otherNodeBounds = this.#boundingBoxes.cache
          .get(this.#nodeGraphics.get(this.#nodes!.indexOf(otherNode)))
          .resizeCentered(20); // add some margin around the node

        if (this.#debugViewportCanvas) {
          this.#debugViewportCanvas.lineStyle(1, 0x0000ff);
          this.#debugViewportCanvas.drawRect(
            otherNodeBounds.x,
            otherNodeBounds.y,
            otherNodeBounds.width,
            otherNodeBounds.height,
          );
        }

        // Calculate overlap and apply force to separate nodes

        const intersection = bounds.intersection(otherNodeBounds);

        if (!intersection?.size) {
          continue;
        }

        // console.log(
        //   `Collision between ${d3Node.lemmas[0].lemma} and ${otherNode.lemmas[0].lemma}`,
        // );

        if (this.#debugViewportCanvas) {
          this.#debugViewportCanvas.lineStyle(1, 0xff00ff);
          this.#debugViewportCanvas.drawRect(
            intersection.x,
            intersection.y,
            intersection.width,
            intersection.height,
          );
        }

        const intersectionCenter = intersection.center;

        // Compute a vector that points from the center of the intersection
        // outwards, and apply a force to the node in that direction.
        const direction = intersectionCenter.subtract(boundsCenter);
        const distance = Math.max(direction.magnitude, 1);

        if (!direction.magnitude) {
          continue;
        }

        const normalizedDirection = direction.normalize();

        // The force's magnitude could be proportional to the size of the
        // intersection and inversely proportional to the distance between
        // centers (to avoid extreme forces at very close distances)
        const intersectionArea = Math.min(intersection.area, 5);
        const forceMagnitude = Math.min(
          (intersectionArea / distance) * alphaFactor,
          1,
        );

        const force = normalizedDirection.multiply(
          forceMagnitude * this.#strength * -1,
        );

        // For very small forces, apply friction to prevent nodes from
        // drifting far away from each other
        if (force.magnitude < 0.01) {
          const frictionDeceleration = 0.02;

          d3Node.vx! *= frictionDeceleration;
          d3Node.vy! *= frictionDeceleration;
          continue;
        }

        // Now 'force' is a Vector2D with direction away from the intersection
        // and magnitude based on the intersection size and distance

        if (this.#debugPanel && force.magnitude > this.#maxForce.magnitude) {
          this.#maxForce = force;
          this.#debugPanel?.setText(
            4,
            `Max force: ${this.#maxForce.toString(2)}, ${this.#maxForce.magnitude.toFixed(2)}`,
          );
        }

        d3Node.vx! += force.x;
        d3Node.vy! += force.y;

        // Apply an equal force to the other node in the opposite direction
        otherNode.vx! -= force.x;
        otherNode.vy! -= force.y;
      }
    }
  }
}

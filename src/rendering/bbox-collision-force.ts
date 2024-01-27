import * as d3 from 'd3';
import * as pixi from 'pixi.js';
// @ts-ignore
import { Viewport } from 'pixi-viewport';
import { Rect2D, Vector2D } from '../types/index.js';
import { DebugPanel } from './debug-panel.js';

/**
 * A force that prevents nodes from overlapping by applying a collision force
 * between nodes based on their bounding boxes.
 */
export class BBoxCollisionForce {
  /**
   * The graphics objects that represent the nodes.
   */
  #nodeGraphics: pixi.Graphics[];

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
   * The quadtree used to detect collisions.
   */
  #quadtree?: d3.Quadtree<any>;

  /**
   * The nodes that are currently being simulated.
   */
  #nodes?: any[];

  /**
   * Tracks how many ticks have passed since the last quadtree was created.
   */
  #ticksSinceNewTree = 0;

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
    nodeGraphics: pixi.Graphics[],
    debugViewportCanvas?: pixi.Graphics,
    debugAppCanvas?: pixi.Graphics,
  ) {
    this.#viewport = viewport;
    this.#nodeGraphics = nodeGraphics;
    this.#debugViewportCanvas = debugViewportCanvas;
    this.#debugAppCanvas = debugAppCanvas;

    if (debugAppCanvas) {
      this.#debugPanel = new DebugPanel(debugAppCanvas);
    }
  }

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
    this.#createQuadtree();
  }

  /**
   * Creates the quadtree used to detect collisions.
   */
  #createQuadtree() {
    this.#quadtree = d3.quadtree(
      this.#nodes!,
      (d) => d.x!,
      (d) => d.y!,
    );
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
   * Applies the force.
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
      this.#debugPanel.setText(
        3,
        `Ticks since new quadtree: ${this.#ticksSinceNewTree}`,
      );
    }
    if (!this.#quadtree || !this.#nodes || !this.#nodeGraphics) return;

    if (this.#ticksSinceNewNodes < this.#ticksToWait) {
      this.#ticksSinceNewNodes++;
      return;
    }

    const scale = new Vector2D(this.#viewport.scale);

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

    // Rebuild the quadtree every 100 ticks
    if (this.#ticksSinceNewTree > 100) {
      this.#createQuadtree();
      this.#ticksSinceNewTree = 0;
    } else {
      this.#ticksSinceNewTree++;
    }

    for (const [index, d3Node] of this.#nodes!.entries()) {
      const graphicalNode = this.#nodeGraphics[index];

      const nodePos = new Vector2D(graphicalNode);
      const bounds = new Rect2D(graphicalNode.getBounds());

      // Transform bounds to D3 space
      bounds.size = bounds.size.divide(scale);
      bounds.position = nodePos.subtract(bounds.size.divide(2));

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

      this.#quadtree.visit((quad) => {
        if (!quad) return;

        if ('data' in quad && quad.data !== d3Node) {
          const otherNode = quad.data;
          const otherNodeBounds = new Rect2D(
            this.#nodeGraphics[this.#nodes!.indexOf(otherNode)].getBounds(),
          );

          // Transform bounds to D3 space
          otherNodeBounds.size = otherNodeBounds.size.divide(scale);
          otherNodeBounds.position = new Vector2D(
            otherNode.x!,
            otherNode.y!,
          ).subtract(otherNodeBounds.size.divide(2));

          // expand bounds slightly to give nodes some breathing room
          const margin = 20;

          otherNodeBounds.position.x -= margin / 2;
          otherNodeBounds.position.y -= margin / 2;
          otherNodeBounds.size.x += margin;
          otherNodeBounds.size.y += margin;

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

          if (!intersection || !intersection.size) {
            return;
          }

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
            return;
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
            return;
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

        // Return false to only check nodes in the current quad
        return false;
      });
    }
  }
}

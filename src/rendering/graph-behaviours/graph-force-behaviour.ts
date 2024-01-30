import * as pixi from 'pixi.js';
import * as d3 from 'd3';
import {
  IGraphBehaviour,
  IGraphBehaviourInitializationOptions,
} from './graph-behaviour.js';
import { Article } from '../../providers/index.js';
import { BBoxCollisionForce } from '../bbox-collision-force.js';
import { GraphNodeBBoxBehaviour } from './graph-node-bbox-behaviour.js';

/**
 * Node force behaviour.
 */
export class GraphForceBehaviour implements IGraphBehaviour {
  #debugAppCanvas?: pixi.Graphics;
  #debugViewportCanvas?: pixi.Graphics;

  constructor({
    viewport,
    application,
    appStateManager,
    simulation,
    allGraphics,
    getState,
  }: IGraphBehaviourInitializationOptions) {
    if (appStateManager.get('debug')) {
      this.#debugAppCanvas = application.stage.addChild(new pixi.Graphics());
      this.#debugViewportCanvas = viewport.addChild(new pixi.Graphics());
    }

    const boundingBoxes = getState(GraphNodeBBoxBehaviour);

    simulation
      .force(
        'link',
        d3
          .forceLink<
            d3.SimulationNodeDatum & Article,
            { source: number; target: number }
          >()
          .id((d) => d.id)
          .strength(0.1),
      )
      .force('charge', d3.forceManyBody().strength(-100))
      .force('center', d3.forceCenter(0, 0).strength(1))
      .force(
        'collide',
        new BBoxCollisionForce(
          viewport,
          allGraphics,
          boundingBoxes,
          this.#debugViewportCanvas,
          this.#debugAppCanvas,
        )
          .strength(2)
          .ticksToWait(200)
          .onStart(() => {
            appStateManager.emit('start-sim');
          })
          .getD3Force(),
      )
      .alphaDecay(0.02)
      .alphaTarget(0)
      .velocityDecay(0.5);
  }
}

import * as pixi from 'pixi.js';
import {
  IGraphBehaviour,
  IGraphBehaviourAllNodeOptions,
} from './graph-behaviour.js';
import { Rect2D, Vector2D } from '../../types/index.js';
import { DebugPanel } from '../debug-panel.js';

/**
 * Graph debug behaviour.
 */
export class GraphDebugBehaviour implements IGraphBehaviour {
  #debugPanel?: DebugPanel;

  graphicsRendered({
    selection,
    application,
    appStateManager,
    allGraphics,
    nodes,
  }: IGraphBehaviourAllNodeOptions) {
    if (appStateManager.get('debug') && selection.size > 0) {
      if (!this.#debugPanel) {
        this.#debugPanel = new DebugPanel(
          application.stage.addChild(new pixi.Container()),
          new Rect2D(20, 500, 200, 200),
        );
      }

      const node = nodes[allGraphics.indexOf(selection.first()!)];

      const velocity = new Vector2D(node.vx, node.vy);
      const velocityAngle = velocity.angle();

      let direction = '';
      if (velocityAngle >= -Math.PI / 8 && velocityAngle < Math.PI / 8) {
        direction = 'E';
      } else if (
        velocityAngle >= Math.PI / 8 &&
        velocityAngle < (3 * Math.PI) / 8
      ) {
        direction = 'SE';
      } else if (
        velocityAngle >= (3 * Math.PI) / 8 &&
        velocityAngle < (5 * Math.PI) / 8
      ) {
        direction = 'S';
      } else if (
        velocityAngle >= (5 * Math.PI) / 8 &&
        velocityAngle < (7 * Math.PI) / 8
      ) {
        direction = 'SW';
      } else if (
        velocityAngle >= (7 * Math.PI) / 8 ||
        velocityAngle < (-7 * Math.PI) / 8
      ) {
        direction = 'W';
      } else if (
        velocityAngle >= (-7 * Math.PI) / 8 &&
        velocityAngle < (-5 * Math.PI) / 8
      ) {
        direction = 'NW';
      } else if (
        velocityAngle >= (-5 * Math.PI) / 8 &&
        velocityAngle < (-3 * Math.PI) / 8
      ) {
        direction = 'N';
      } else if (
        velocityAngle >= (-3 * Math.PI) / 8 &&
        velocityAngle < -Math.PI / 8
      ) {
        direction = 'NE';
      }

      this.#debugPanel.setText(0, `ID: ${node.id}`);
      this.#debugPanel.setText(1, `Dictionary: ${node.dictionary}`);
      this.#debugPanel.setText(2, `X: ${node.x?.toFixed(2)}`);
      this.#debugPanel.setText(3, `Y: ${node.y?.toFixed(2)}`);
      this.#debugPanel.setText(4, `VX: ${node.vx?.toFixed(2)}`);
      this.#debugPanel.setText(5, `VY: ${node.vy?.toFixed(2)}`);
      this.#debugPanel.setText(
        6,
        `Velocity magnitude: ${velocity.magnitude.toFixed(2)}`,
      );
      this.#debugPanel.setText(
        7,
        `Velocity angle: ${velocityAngle.toFixed(2)} (${direction})`,
      );
    }
  }
}

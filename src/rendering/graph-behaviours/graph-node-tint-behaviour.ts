import * as pixi from 'pixi.js';
import { IGraphBehaviourOptions, IGraphBehaviour } from './graph-behaviour.js';
import { GraphDragBehaviour } from './graph-drag-behaviour.js';

/**
 * Node tint behaviour.
 */
export class GraphNodeTintBehaviour implements IGraphBehaviour {
  nodeGraphicsCreated({
    graphics,
    selection,
    viewport,
    getState,
  }: IGraphBehaviourOptions) {
    const text = graphics.children.find(
      (child) => child instanceof pixi.Text,
    ) as pixi.Text;

    graphics.on('mouseover', () => {
      if (!getState(GraphDragBehaviour).isDragging) {
        graphics.tint = 0xbbbbbb;
      }
    });

    graphics.on('mouseout', () => {
      if (!getState(GraphDragBehaviour).isDragging) {
        graphics.tint = selection.has(graphics) ? selection.tint : 0xffffff;
      }
    });

    graphics.on('pointerdown', (event) => {
      graphics.tint = 0x888888;
      text.tint = 0x888888;
    });

    viewport.on('pointerup', () => {
      text.tint = 0xffffff;
      if (getState(GraphDragBehaviour).isDragging) {
        graphics.tint = selection.has(graphics) ? selection.tint : 0xffffff;
      }
    });

    viewport.on('pointerupoutside', () => {
      if (getState(GraphDragBehaviour).isDragging) {
        graphics.tint = selection.has(graphics) ? selection.tint : 0xffffff;
      }
    });
  }
}

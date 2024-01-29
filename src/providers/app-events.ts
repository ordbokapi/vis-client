import { Rect2D } from '../types/rect-2d.js';

/**
 * App event.
 */
export type AppEvent =
  | {
      name:
        | 'reload'
        | 'start-sim'
        | 'request-node-positions'
        | 'node-positions';
      args: [];
    }
  | {
      name: 'selection';
      args: [Rect2D];
    };

import { Rect2D } from '../types/index.js';

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

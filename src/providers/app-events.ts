import { Vector2D } from '../types/index.js';

/**
 * App event.
 */
export type AppEvent =
  | {
      name: 'reload' | 'start-sim' | 'request-node-positions';
      args: [];
    }
  | {
      name: 'node-positions';
      args: [{ [id: number]: Vector2D }];
    };

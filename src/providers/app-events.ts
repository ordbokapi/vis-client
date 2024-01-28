/**
 * App event.
 */
export type AppEvent = {
  name: 'reload' | 'start-sim' | 'request-node-positions' | 'node-positions';
  args: [];
};

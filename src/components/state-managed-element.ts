import { AppStateManager, ScopedAppStateManager } from '../providers/index.js';

/**
 * Base class for components that need to be aware of the application state.
 */
export abstract class StateManagedElement extends HTMLElement {
  /**
   * The application state manager.
   */
  #appStateManager: ScopedAppStateManager;

  constructor() {
    super();

    this.#appStateManager = AppStateManager.global.for(this);
  }

  /**
   * The application state.
   */
  get appStateManager() {
    return this.#appStateManager;
  }
}

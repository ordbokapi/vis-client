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

    if (!(window as any).appStateManager) {
      (window as any).appStateManager = new AppStateManager();
    }
    this.#appStateManager = (
      window as any as {
        appStateManager: AppStateManager;
      }
    ).appStateManager.for(this);
  }

  /**
   * The application state.
   */
  get appStateManager() {
    return this.#appStateManager;
  }
}

import { AppState } from './app-state.js';
import { TwoKeyMap } from '../types/index.js';

/**
 * Manages state for the application. Allows for state to be shared between
 * components.
 */
export interface ScopedAppStateManager {
  /**
   * Gets a value from the app state.
   * @param key The key to get the value for.
   */
  get<K extends keyof AppState>(key: K): AppState[K];

  /**
   * Sets a value on the app state.
   * @param key The key to set the value for.
   * @param value The value to set.
   */
  set<K extends keyof AppState>(key: K, value: AppState[K]): void;

  /**
   * Adds a listener for the given key. The listener is called when the value
   * for the given key changes.
   * @param key The key to listen for changes on.
   * @param listener The listener to call when the value for the given key
   * changes.
   * @remarks Only changes to the top-level properties of the app state are
   * tracked. Changes to nested properties are not tracked. Make sure to always
   * set objects on the app state directly, not by modifying nested properties.
   */
  observe<K extends keyof AppState>(
    key: K,
    listener: (value: AppState[K]) => void,
  ): void;

  /**
   * Removes a listener for the given key.
   * @param subscriber The subscriber to remove the listener for.
   * @param key The key to remove the listener for.
   * @param listener The listener to remove.
   */
  unobserve<K extends keyof AppState>(
    key: K,
    listener: (value: AppState[K]) => void,
  ): void;
}

/**
 * Manages state for the application. Allows for state to be shared between
 * components. Keeps track of listeners that are notified when the state
 * changes. Also serializes and deserializes the state to and from the
 * location's query string.
 */
export class AppStateManager {
  /**
   * The current state of the application.
   */
  #state: AppState;

  /**
   * Whether or not query string updates are currently blocked.
   */
  #blockUrlUpdates = true;

  /**
   * Timer used to debounce query string updates.
   */
  #updateQueryStringTimer: number | null = null;

  /**
   * The last query string that was requested to be set.
   */
  #lastQueryString = '';

  /**
   * Listeners that are notified when the app state changes.
   */
  private listeners: TwoKeyMap<keyof AppState, object, Set<Function>> =
    new TwoKeyMap();

  /**
   * Creates a new app state manager, initializing the state from the location's
   * query string.
   */
  constructor() {
    this.#state = AppState.deserialize();

    window.addEventListener('DOMContentLoaded', () => {
      this.#blockUrlUpdates = false;
      this.#updateStateFromQueryString();
    });

    window.addEventListener('popstate', () =>
      this.#updateStateFromQueryString(),
    );
  }

  /**
   * Gets an app state manager scoped to the given subscriber.
   * @param subscriber The subscriber to scope the app state manager to.
   */
  for(subscriber: object): ScopedAppStateManager {
    return {
      get: (key) => this.get(key),
      set: (key, value) => this.set(subscriber, key, value),
      observe: (key, listener) => this.observe(subscriber, key, listener),
      unobserve: (key, listener) => this.unobserve(subscriber, key, listener),
    };
  }

  /**
   * Gets a value from the app state.
   * @param key The key to get the value for.
   */
  get<K extends keyof AppState>(key: K): AppState[K] {
    return this.#state[key];
  }

  /**
   * Sets a value on the app state.
   * @param subscriber The subscriber that is setting the value.
   * @param key The key to set the value for.
   * @param value The value to set.
   */
  set<K extends keyof AppState>(
    subscriber: object,
    key: K,
    value: AppState[K],
  ) {
    this.#state[key] = value;
    this.#notifyListeners(subscriber, key, value);
    this.#updateQueryString();
  }

  /**
   * Adds a listener for the given key. The listener is called when the value
   * for the given key changes.
   * @param subscriber The subscriber that is adding the listener.
   * @param key The key to listen for changes on.
   * @param listener The listener to call when the value for the given key
   * changes.
   * @remarks Only changes to the top-level properties of the app state are
   * tracked. Changes to nested properties are not tracked. Make sure to always
   * set objects on the app state directly, not by modifying nested properties.
   */
  observe<K extends keyof AppState>(
    subscriber: object,
    key: K,
    listener: (value: AppState[K]) => void,
  ) {
    let set = this.listeners.get(key, subscriber);

    if (!set) {
      set = new Set();
      this.listeners.set(key, subscriber, set);
    }

    set.add(listener as (value: AppState[keyof AppState]) => void);
  }

  /**
   * Removes a listener for the given key.
   * @param subscriber The subscriber to remove the listener for.
   * @param key The key to remove the listener for.
   * @param listener The listener to remove.
   */
  unobserve<K extends keyof AppState>(
    subscriber: object,
    key: K,
    listener: (value: AppState[K]) => void,
  ) {
    const set = this.listeners.get(key, subscriber);
    if (!set) return;

    set.delete(listener as (value: AppState[keyof AppState]) => void);
  }

  /**
   * Notifies all listeners for the given key.
   * @param subscriber The subscriber whose action triggered the notification.
   * @param key The key to notify listeners for.
   * @param value The value to pass to the listeners.
   */
  #notifyListeners<K extends keyof AppState>(
    subscriber: object,
    key: K,
    value: AppState[K],
  ) {
    for (const [sub, listeners] of this.listeners.entriesForKey1(key)) {
      if (sub === subscriber) continue;

      for (const listener of listeners) {
        try {
          listener(value);
        } catch (error) {
          console.warn(`Failed to notify listener for ${key}: ${error}`);
        }
      }
    }
  }

  /**
   * Updates the location's query string with the current state.
   */
  #updateQueryString() {
    if (this.#blockUrlUpdates) return;

    const queryString = this.#state.serialize();

    if (this.#lastQueryString === queryString) return;

    this.#lastQueryString = queryString;

    const update = () => {
      window.history.replaceState(
        null,
        '',
        `${window.location.pathname}?${queryString}`,
      );
    };

    if (this.#updateQueryStringTimer) {
      window.clearTimeout(this.#updateQueryStringTimer);
    }

    this.#updateQueryStringTimer = window.setTimeout(update, 100);
  }

  /**
   * Updates the current state from the location's query string.
   */
  #updateStateFromQueryString() {
    this.#state = AppState.deserialize();

    for (const [key] of this.listeners.keys()) {
      this.#notifyListeners(this, key, this.#state[key]);
    }
  }
}

import { Article } from './api-client.js';
import { Dictionary, Vector2D } from '../types/index.js';
import * as msgpack from '@msgpack/msgpack';

/**
 * Manages state for the application. Allows for state to be shared between
 * components.
 */
export class AppState {
  /**
   * The current article that is acting as the root node of the graph view.
   */
  currentArticle: Pick<Article, 'id' | 'dictionary'> | null = null;

  /**
   * The current article that is being displayed in the sidebar.
   */
  sidebarArticle: Pick<Article, 'id' | 'dictionary'> | null = null;

  /**
   * The current zoom level of the graph view.
   */
  zoomLevel = 150;

  /**
   * The current translation of the graph view.
   */
  translation = new Vector2D(0, 0);

  /**
   * Whether the application is in debug mode.
   */
  debug = false;

  /**
   * The node positions for the current graph view.
   */
  nodePositions?: { [id: string]: Vector2D };

  /**
   * State of keyboard modifiers.
   */
  modifiers = {
    ctrl: false,
    shift: false,
  };

  /**
   * Converts an article ID and dictionary to a string.
   */
  static articleToString(
    article: Pick<Article, 'id' | 'dictionary'> | null,
  ): string {
    if (article === null) return '';
    return `${article.dictionary === Dictionary.Bokmaalsordboka ? 'bm' : 'nn'}-${article.id}`;
  }

  /**
   * Converts a string to an article ID and dictionary.
   */
  static stringToArticle(str: string): Pick<Article, 'id' | 'dictionary'> {
    const match = str.match(/^(bm|nn)-(\d+)$/);
    if (!match) throw new Error(`Invalid article string: ${str}`);

    const dictionary =
      match[1] === 'bm'
        ? Dictionary.Bokmaalsordboka
        : Dictionary.Nynorskordboka;
    const id = Number.parseInt(match[2], 10);

    return { dictionary, id };
  }

  /**
   * Serializes the current state of the application to a query string.
   * @param all Whether to include all state, or just the state that should be
   * routinely kept in the URL.
   */
  serialize(all = false): string {
    const params = new URLSearchParams();

    const addParam = (key: string, value: string | null | undefined) => {
      if (value === null || value === undefined || value === '') return;

      params.set(key, value);
    };

    addParam('currentArticle', AppState.articleToString(this.currentArticle));
    addParam('sidebarArticle', AppState.articleToString(this.sidebarArticle));
    addParam('zoomLevel', Math.round(this.zoomLevel).toString());
    addParam('translation', this.translation.toString());

    if (this.debug) addParam('debug', 'true');

    if (all && this.nodePositions) {
      const nodePositions: { [id: string]: { x: number; y: number } } = {};
      for (const [key, value] of Object.entries(this.nodePositions)) {
        nodePositions[key] = { x: value.x, y: value.y };
      }
      const encoded = msgpack.encode(nodePositions);
      addParam('nodePositions', btoa(String.fromCharCode(...encoded)));
    }

    return params.toString();
  }

  /**
   * Deserializes the current state of the application from the location's
   * query string.
   */
  static deserialize(): AppState {
    const queryString = new URLSearchParams(window.location.search);
    const state = new AppState();

    const trySet = <K extends keyof AppState>(
      key: K,
      valueFn: (queryValue: string) => AppState[K],
    ) => {
      const value = queryString.get(key);
      if (value === null) return;

      try {
        state[key] = valueFn(value);
      } catch (e) {
        console.warn(`Failed to deserialize ${key}: ${e}`);
      }
    };

    trySet('currentArticle', (value) => AppState.stringToArticle(value));
    trySet('sidebarArticle', (value) => AppState.stringToArticle(value));
    trySet('zoomLevel', (value) => Number.parseInt(value, 10));
    trySet('translation', (value) => Vector2D.parse(value));
    trySet('debug', (value) => value === 'true');
    trySet('nodePositions', (value) => {
      const decoded = msgpack.decode(
        Uint8Array.from(atob(value), (c) => c.charCodeAt(0)),
      );
      const nodePositions: { [id: string]: Vector2D } = {};
      for (const [key, value] of Object.entries(
        decoded as Record<string, { x: number; y: number }>,
      )) {
        nodePositions[key] = new Vector2D(value.x, value.y);
      }
      return nodePositions;
    });

    return state;
  }
}

import * as d3 from 'd3';
import * as pixi from 'pixi.js';
// @ts-ignore
import { Viewport } from 'pixi-viewport';
import { IndexedSet, TwoKeyMap } from '../../types/index.js';
import { Article, ScopedAppStateManager } from '../../providers/index.js';
import { NodeSelection } from '../node-selection.js';

/**
 * Interface for graph behaviour options.
 */
export interface IGraphBehaviourOptions {
  /** The graphical element representing the node. */
  graphics: pixi.Graphics;

  /** The d3 node datum. */
  node: d3.SimulationNodeDatum & Article;

  /** All graphical elements representing the nodes. */
  allGraphics: IndexedSet<pixi.Graphics>;

  /** All d3 node data. */
  nodes: (d3.SimulationNodeDatum & Article)[];

  /** The index of the node out of all nodes. */
  index: number;

  /** The d3 force simulation. */
  simulation: d3.Simulation<
    d3.SimulationNodeDatum & Article,
    d3.SimulationLinkDatum<d3.SimulationNodeDatum & Article>
  >;

  /** The viewport. */
  viewport: Viewport;

  /** The PixiJS application. */
  application: pixi.Application;

  /** The application state manager. */
  appStateManager: ScopedAppStateManager;

  /** The node selection. */
  selection: NodeSelection;

  /** The node graphics map, keyed by node ID and dictionary. */
  nodeMap: TwoKeyMap<number, string, pixi.Graphics>;

  /** Gets the state data for the graph behaviour. */
  getState<S>(behaviour: GraphBehaviourConstructor<S>): S;
}

/**
 * Graph behaviour constructor.
 * @template T The type of the state data the graph behaviour exposes to other
 * graph behaviours.
 * @param options The graph behaviour options.
 */
export type GraphBehaviourConstructor<T = never> = new (
  options: Pick<
    IGraphBehaviourOptions,
    keyof IGraphBehaviourOnlyInitializationOptions | 'getState'
  >,
) => IGraphBehaviour<T>;

/**
 * Interface for graph behaviour.
 * @template T The type of the state data the graph behaviour exposes to other
 * graph behaviours.
 */
export interface IGraphBehaviour<T = any> {
  /**
   * Runs when the graph behaviour is registered.
   * @param options The graph behaviour options.
   */
  constructor: GraphBehaviourConstructor<T> | Function;

  /**
   * Gets the state data for the graph behaviour.
   */
  getState?(): T;

  /**
   * Runs when the graphics for a node are created.
   * @param options The graph behaviour options.
   */
  nodeGraphicsCreated?(options: IGraphBehaviourOptions): void;

  /**
   * Runs when the graphics for a node are rendered.
   * @param options The graph behaviour options.
   */
  graphicsRendered?(options: IGraphBehaviourAllNodeOptions): void;
}

/**
 * Only graph behaviour options known at the time of construction.
 */
export type IGraphBehaviourOnlyInitializationOptions = Pick<
  IGraphBehaviourOptions,
  | 'viewport'
  | 'appStateManager'
  | 'selection'
  | 'nodeMap'
  | 'simulation'
  | 'application'
  | 'allGraphics'
  | 'nodes'
>;

/**
 * Only graph behaviour options available after node creation, per node.
 */
export type IGraphBehaviourOnlyNodeOptions = Omit<
  IGraphBehaviourOptions,
  keyof IGraphBehaviourOnlyInitializationOptions | 'getState'
>;

/**
 * Only graph behaviour options available after node creation, for all nodes.
 */
export type IGraphBehaviourOnlyAllNodeOptions = Omit<
  IGraphBehaviourOptions,
  | keyof IGraphBehaviourOnlyInitializationOptions
  | 'getState'
  | 'node'
  | 'index'
  | 'graphics'
>;

/**
 * Graph behaviour options available after node creation, for all nodes.
 */
export type IGraphBehaviourAllNodeOptions = Pick<
  IGraphBehaviourOptions,
  | keyof IGraphBehaviourOnlyAllNodeOptions
  | keyof IGraphBehaviourOnlyInitializationOptions
  | 'getState'
>;

/**
 * A graph behaviour manager, which hooks up graph behaviours.
 */
export class GraphBehaviourManager {
  /**
   * The graph behaviour options that are known at the time of construction.
   */
  #options: IGraphBehaviourOnlyInitializationOptions;

  /**
   * The graph behaviours.
   */
  #behaviours = new IndexedSet<IGraphBehaviour<any>>();

  /**
   * The graph behaviour constructors.
   */
  #constructors = new IndexedSet<GraphBehaviourConstructor<any>>();

  /**
   * Initializes a new instance of the GraphBehaviourManager class.
   * @param options The graph behaviour options.
   */
  constructor(options: IGraphBehaviourOnlyInitializationOptions) {
    this.#options = options;
  }

  /**
   * Registers a graph behaviour.
   * @param behaviour The graph behaviour.
   */
  register<S>(behaviour: GraphBehaviourConstructor<S>): this {
    if (this.#constructors.has(behaviour)) {
      throw new Error('Cannot add the same type of graph behaviour twice.');
    }

    const instance = new behaviour({
      ...this.#options,
      getState: <S>(constructor: GraphBehaviourConstructor<S>) =>
        this.#getState(constructor, behaviour as IGraphBehaviour),
    });

    this.#constructors.add(behaviour);
    this.#behaviours.add(instance);

    return this;
  }

  /**
   * Gets the state data for a graph behaviour.
   * @param behaviour The graph behaviour.
   */
  #getState<S>(
    behaviour: GraphBehaviourConstructor<S>,
    requestingBehaviour: IGraphBehaviour,
  ): S {
    // get index of requesting behaviour
    const requestingIndex = this.#behaviours.indexOf(requestingBehaviour);

    // get index of constructor for behaviour to get state for
    const index = this.#constructors.indexOf(
      behaviour as GraphBehaviourConstructor<S>,
    );

    // if index of requesting behaviour is less than index of behaviour to get
    // state for, then we cannot f/ulfill the request, since we cannot guarantee
    // that the behaviour to get state for has updated its state yet
    if (requestingIndex < index) {
      throw new Error(
        'Cannot get state for behaviour loaded after requesting behaviour.',
      );
    }

    // get the state for the behaviour
    return this.#behaviours.get(index).getState?.() as S;
  }

  /**
   * Runs behaviours on the graphics for a node on the graphicsCreated event.
   * @param options The graph behaviour options.
   */
  nodeGraphicsCreated(options: IGraphBehaviourOnlyNodeOptions): void {
    for (const behaviour of this.#behaviours) {
      behaviour.nodeGraphicsCreated?.({
        ...this.#options,
        ...options,
        getState: <S>(constructor: GraphBehaviourConstructor<S>) =>
          this.#getState(constructor, behaviour),
      });
    }
  }

  /**
   * Runs behaviours on the graphics for a node on the graphicsRendered event.
   * @param options The graph behaviour options.
   */
  graphicsRendered(options: IGraphBehaviourOnlyAllNodeOptions): void {
    for (const behaviour of this.#behaviours) {
      behaviour.graphicsRendered?.({
        ...this.#options,
        ...options,
        getState: <S>(constructor: GraphBehaviourConstructor<S>) =>
          this.#getState(constructor, behaviour),
      });
    }
  }
}

import * as d3 from 'd3';
import * as pixi from 'pixi.js';
// @ts-expect-error Broken types
import { Viewport } from 'pixi-viewport';
import { IndexedSet, TwoKeyMap } from '../../types/index.js';
import { Article, ScopedAppStateManager } from '../../providers/index.js';
import { NodeSelection } from '../node-selection.js';

type MethodInner<T, K extends keyof T> = K extends any
  ? // eslint-disable-next-line @typescript-eslint/ban-types
    T[K] extends Function
    ? K
    : never
  : never;
type NonConstructorRequired<T> = Required<Omit<T, 'constructor'>>;

/**
 * Narrows to only keys of type `T` that are optional callable methods and are
 * not the constructor.
 */
type MethodKeys<T> = MethodInner<
  NonConstructorRequired<T>,
  keyof NonConstructorRequired<T>
>;

/**
 * Type of option parameters for a method with the given key.
 */
type MethodOptions<T, K extends MethodKeys<T>> = Parameters<
  NonConstructorRequired<T>[K] extends (...args: any) => any
    ? NonConstructorRequired<T>[K]
    : never
>[0];

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

  /** All d3 link data. */
  links: d3.SimulationLinkDatum<d3.SimulationNodeDatum & Article>[];

  /** Links keyed by node. */
  nodeLinks: Map<
    d3.SimulationNodeDatum & Article,
    d3.SimulationLinkDatum<d3.SimulationNodeDatum & Article>[]
  >;

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
  graphicsMap: TwoKeyMap<number, string, pixi.Graphics>;

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
  options: IGraphBehaviourInitializationOptions,
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
  // eslint-disable-next-line @typescript-eslint/ban-types
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
   * Runs when all node graphics are created.
   * @param options The graph behaviour options.
   */
  allNodeGraphicsCreated?(options: IGraphBehaviourAllNodeOptions): void;

  /**
   * Runs when the graphics for a node are rendered.
   * @param options The graph behaviour options.
   */
  graphicsRendered?(options: IGraphBehaviourAllNodeOptions): void;

  /**
   * Runs when a re-render is requested.
   * @param options The graph behaviour options.
   */
  renderRequested?(options: IGraphBehaviourOptions): void;
}

/**
 * Only graph behaviour options known at the time of construction.
 */
export type IGraphBehaviourOnlyInitializationOptions = Pick<
  IGraphBehaviourOptions,
  | 'viewport'
  | 'appStateManager'
  | 'selection'
  | 'graphicsMap'
  | 'simulation'
  | 'application'
  | 'allGraphics'
  | 'nodes'
  | 'links'
  | 'nodeLinks'
>;

/**
 * Graph behaviour options passed to the constructor.
 */
export type IGraphBehaviourInitializationOptions = Pick<
  IGraphBehaviourOptions,
  keyof IGraphBehaviourOnlyInitializationOptions | 'getState'
>;

/**
 * Only graph behaviour options available after node creation, per node.
 */
export type IGraphBehaviourOnlyNodeOptions = Omit<
  IGraphBehaviourOptions,
  keyof IGraphBehaviourOnlyInitializationOptions | 'getState'
>;

/**
 * Graph behaviour options available after node creation, for all nodes.
 */
export type IGraphBehaviourAllNodeOptions = Pick<
  IGraphBehaviourOptions,
  keyof IGraphBehaviourOnlyInitializationOptions | 'getState'
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

    this.#constructors.add(behaviour);

    const instance = new behaviour({
      ...this.#options,
      getState: <S>(constructor: GraphBehaviourConstructor<S>) =>
        this.#getState(constructor, behaviour),
    });

    this.#behaviours.add(instance);

    return this;
  }

  /**
   * Gets the state data for a graph behaviour.
   * @param behaviour The graph behaviour.
   */
  #getState<S>(
    behaviour: GraphBehaviourConstructor<S>,
    requestingBehaviour: GraphBehaviourConstructor<any>,
  ): S {
    // get index of requesting behaviour
    const requestingIndex = this.#constructors.indexOf(requestingBehaviour);

    // get index of constructor for behaviour to get state for
    const index = this.#constructors.indexOf(
      behaviour as GraphBehaviourConstructor<S>,
    );

    // if index of requesting behaviour is less than index of behaviour to get
    // state for, then we cannot fulfill the request, since we cannot guarantee
    // that the behaviour to get state for has updated its state yet
    if (requestingIndex < index) {
      console.error(
        'Cannot get state for behaviour loaded after requesting behaviour.',
        behaviour,
        index,
        requestingBehaviour,
        requestingIndex,
      );
      throw new Error(
        'Cannot get state for behaviour loaded after requesting behaviour.',
      );
    }

    // get the state for the behaviour
    return this.#behaviours.get(index).getState?.() as S;
  }

  #runBehaviourMethod<K extends MethodKeys<IGraphBehaviour>>(
    methodName: K,
    options: Omit<
      MethodOptions<IGraphBehaviour, K>,
      keyof IGraphBehaviourOnlyInitializationOptions | 'getState'
    >,
  ): void {
    for (const behaviour of this.#behaviours) {
      behaviour[methodName]?.({
        ...this.#options,
        ...(options ?? {}),
        getState: <S>(constructor: GraphBehaviourConstructor<S>) =>
          this.#getState(
            constructor,
            behaviour.constructor as GraphBehaviourConstructor,
          ),
      } as IGraphBehaviourOptions);
    }
  }

  /**
   * Runs behaviours on the graphics for a node on the nodeGraphicsCreated event.
   * @param options The graph behaviour options.
   */
  nodeGraphicsCreated(options: IGraphBehaviourOnlyNodeOptions): void {
    this.#runBehaviourMethod('nodeGraphicsCreated', options);
  }

  /**
   * Runs behaviours on the graphics for all nodes on the allNodeGraphicsCreated
   * event.
   * @param options The graph behaviour options.
   */
  allNodeGraphicsCreated(): void {
    this.#runBehaviourMethod('allNodeGraphicsCreated', {});
  }

  /**
   * Runs behaviours on the graphics for a node on the graphicsRendered event.
   * @param options The graph behaviour options.
   */
  graphicsRendered(): void {
    this.#runBehaviourMethod('graphicsRendered', {});
  }
}

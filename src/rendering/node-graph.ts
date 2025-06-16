import * as pixi from 'pixi.js';
import { Viewport as PixiViewport } from 'pixi-viewport';
import {
  AppStateManager,
  Article,
  ScopedAppStateManager,
} from '../providers/index.js';
import { NodeSelection } from './node-selection.js';
import {
  IndexedSet,
  NodePositions,
  TwoKeyMap,
  Vector2D,
} from '../types/index.js';
import {
  GraphBehaviourManager,
  GraphDebugBehaviour,
  GraphDragBehaviour,
  GraphForceBehaviour,
  GraphSelectionBehaviour,
  GraphNodeTintBehaviour,
  GraphNodeBBoxBehaviour,
  GraphGridBehaviour,
} from './graph-behaviours/index.js';

/**
 * A graphical representation of a graph of nodes in the viewport.
 */
export class NodeGraph {
  /**
   * The nodes in the graph.
   */
  #nodes = new IndexedSet<pixi.Container>();

  /**
   * The node map, keyed by node ID.
   */
  #nodeMap = new Map<number, d3.SimulationNodeDatum & Article>();

  /**
   * The node graphics map, keyed by node ID and dictionary.
   */
  #graphicsMap = new TwoKeyMap<number, string, pixi.Container>();

  /**
   * The edge canvas.
   */
  #edgeCanvas = new pixi.Container();

  /**
   * The d3 nodes from which the graph is generated.
   */
  #d3Nodes: (d3.SimulationNodeDatum & Article)[] = [];

  /**
   * The d3 links from which the graph is generated.
   */
  #d3Links: d3.SimulationLinkDatum<d3.SimulationNodeDatum & Article>[] = [];

  /**
   * Links, keyed by node.
   */
  #nodeLinks = new Map<
    d3.SimulationNodeDatum & Article,
    d3.SimulationLinkDatum<d3.SimulationNodeDatum & Article>[]
  >();

  /**
   * The d3 force simulation.
   */
  #simulation: d3.Simulation<
    d3.SimulationNodeDatum & Article,
    d3.SimulationLinkDatum<d3.SimulationNodeDatum & Article>
  >;

  /**
   * The node selection.
   */
  #selection = new NodeSelection();

  /**
   * The viewport.
   */
  #viewport: PixiViewport;

  /**
   * The PixiJS application.
   */
  #application: pixi.Application;

  /**
   * The application state manager.
   */
  #appStateManager: ScopedAppStateManager;

  /**
   * The graph behaviour manager.
   */
  #nodeBehaviourManager: GraphBehaviourManager;

  /**
   * The node graphics container.
   */
  #nodeGraphicsContainer = new pixi.Container();

  /**
   * Whether or not this is the first time the graph has been rendered.
   */
  #firstRender = true;

  /**
   * Initializes a new instance of the NodeGraph class.
   * @param viewport The viewport.
   */
  constructor(
    application: pixi.Application,
    viewport: PixiViewport,
    simulation: d3.Simulation<
      d3.SimulationNodeDatum & Article,
      d3.SimulationLinkDatum<d3.SimulationNodeDatum & Article>
    >,
  ) {
    this.#viewport = viewport;
    this.#appStateManager = AppStateManager.global.for(this);
    this.#simulation = simulation;
    this.#application = application;

    this.#nodeBehaviourManager = new GraphBehaviourManager({
      appStateManager: this.#appStateManager,
      viewport: this.#viewport,
      application: this.#application,
      simulation: this.#simulation,
      selection: this.#selection,
      graphicsMap: this.#graphicsMap,
      allGraphics: this.#nodes,
      nodes: this.#d3Nodes,
      links: this.#d3Links,
      nodeLinks: this.#nodeLinks,
    });

    this.#viewport.addChild(this.#edgeCanvas);
    this.#viewport.addChild(this.#nodeGraphicsContainer);

    this.#nodeBehaviourManager
      .register(GraphGridBehaviour)
      .register(GraphNodeBBoxBehaviour)
      .register(GraphDragBehaviour)
      .register(GraphSelectionBehaviour)
      .register(GraphNodeTintBehaviour)
      .register(GraphForceBehaviour)
      .register(GraphDebugBehaviour);

    this.#viewport.on('zoomed', () => {
      const textResolution = this.#viewport.scale.x;

      for (const node of this.#nodes) {
        const text = node.getChildByLabel('text') as pixi.Text;
        text.resolution = textResolution * 2;
      }
    });

    this.#appStateManager.on('request-node-positions', () => {
      const nodePositions = new NodePositions();
      this.#simulation.nodes().forEach((node) => {
        nodePositions.set(
          node.id,
          new Vector2D(Math.round(node.x!), Math.round(node.y!)),
        );
      });
      this.#appStateManager.set('nodePositions', nodePositions);
      this.#appStateManager.emit('node-positions');
    });

    this.#application.ticker.add(() => {
      this.render();
    });
  }

  /**
   * Gets the nodes in the graph.
   */
  get nodes(): IndexedSet<pixi.Container> {
    return this.#nodes;
  }

  /**
   * Gets the node selection.
   */
  get selection(): NodeSelection {
    return this.#selection;
  }

  /**
   * Sets the graph data.
   */
  setData(
    nodes: (d3.SimulationNodeDatum & Article)[],
    links: d3.SimulationLinkDatum<d3.SimulationNodeDatum & Article>[],
  ) {
    this.#d3Nodes.splice(0, this.#d3Nodes.length, ...nodes);
    this.#nodeMap.clear();
    for (const node of nodes) {
      this.#nodeMap.set(node.id, node);
    }
    this.#d3Links.splice(0, this.#d3Links.length, ...links);
    this.#nodeLinks.clear();
    for (const node of nodes) {
      this.#nodeLinks.set(node, []);
    }
    for (const { source, target } of links) {
      const sourceNode =
        typeof source === 'object'
          ? source
          : this.#nodeMap.get(source as number);
      const targetNode =
        typeof target === 'object'
          ? target
          : this.#nodeMap.get(target as number);

      if (!sourceNode || !targetNode) {
        continue;
      }

      this.#nodeLinks
        .get(sourceNode)
        ?.push({ source: sourceNode, target: targetNode });
    }
    this.#createNodeGraphics();
    this.render();

    if (this.#firstRender) {
      this.#firstRender = false;

      if (this.#setNodePositions()) {
        this.#appStateManager.emit('start-sim');
        this.#simulation.stop();

        return;
      }
    }

    this.#simulation.alpha(4).restart().tick(200).alpha(1);
  }

  /**
   * Sets node positions from state. Returns true if all nodes had positions
   * set, false otherwise.
   */
  #setNodePositions() {
    const nodePositions = this.#appStateManager.get('nodePositions');

    if (!nodePositions) {
      return false;
    }

    let missed = false;

    for (const node of this.#simulation.nodes()) {
      const position = nodePositions.get(node.id);
      if (position) {
        node.x = position.x;
        node.y = position.y;
      } else {
        missed = true;
      }
    }

    return !missed;
  }

  /**
   * Creates the node graphics.
   */
  #createNodeGraphics() {
    // Remove old nodes
    for (const node of this.#nodes) {
      node.destroy();
    }
    this.#nodes.clear();

    // Create new nodes
    this.#d3Nodes.forEach((d3Node) => {
      const node = new pixi.Container();
      const text = new pixi.Text({
        text: d3Node.lemmas[0].lemma,
        style: {
          fontSize: 12,
          fill: 0xffffff,
          fontFamily: 'Lora',
        },
      });

      text.resolution = this.#viewport.scale.x * 2;

      // Adjust rectangle size based on text bounds
      const textBounds = pixi.CanvasTextMetrics.measureText(
        d3Node.lemmas[0].lemma,
        text.style,
      );
      const paddingX = 20;
      const paddingY = 10;
      const width = textBounds.width + paddingX;
      const height = textBounds.height + paddingY;
      const cornerRadius = 20;
      // colour the root node differently
      const color =
        this.#appStateManager.get('currentArticle')?.id === d3Node.id &&
        this.#appStateManager.get('currentArticle')?.dictionary ===
          d3Node.dictionary
          ? 0x97003d
          : 0x1b1b1b;
      const borderColor = 0x666666;

      node.addChild(
        new pixi.Graphics()
          .roundRect(-width / 2, -height / 2, width, height, cornerRadius)
          .fill({ color })
          .stroke({ color: borderColor, width: 1 }),
      );

      text.anchor.set(0.5);
      text.position.set(0, 0);
      text.label = 'text';
      node.addChild(text);

      node.x = d3Node.x!;
      node.y = d3Node.y!;
      this.#nodeGraphicsContainer.addChild(node);
      this.#nodes.add(node);
      this.#graphicsMap.set(d3Node.id, d3Node.dictionary, node);

      node.eventMode = 'dynamic';
      node.cursor = 'pointer';

      this.#nodeBehaviourManager.nodeGraphicsCreated({
        graphics: node,
        node: d3Node,
        index: this.#nodes.indexOf(node),
      });
    });

    this.#nodeBehaviourManager.allNodeGraphicsCreated();
  }

  /**
   * Renders the graph.
   */
  render() {
    // Update resolution value on text in nodes
    const textResolution = this.#viewport.scale.x;
    for (const node of this.#nodes) {
      const text = node.getChildByLabel('text') as pixi.Text;
      text.resolution = textResolution * 2;
    }

    this.#edgeCanvas.removeChildren();

    for (const { source, target } of this.#d3Links as {
      source: d3.SimulationNodeDatum & Article;
      target: d3.SimulationNodeDatum & Article;
    }[]) {
      if (
        source.x === undefined ||
        source.y === undefined ||
        target.x === undefined ||
        target.y === undefined
      )
        continue;

      this.#edgeCanvas.addChild(
        new pixi.Graphics()
          .moveTo(source.x, source.y)
          .lineTo(target.x, target.y)
          .stroke({ color: 0x00ffff, width: 1, alpha: 1 }),
      );
    }
    // Update node positions
    const simulationNodes = this.#d3Nodes;
    for (const [i, graphics] of this.#nodes.entries()) {
      graphics.x = simulationNodes[i].x!;
      graphics.y = simulationNodes[i].y!;
    }

    this.#nodeBehaviourManager.graphicsRendered();
  }
}

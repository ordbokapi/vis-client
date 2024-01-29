import * as pixi from 'pixi.js';
// @ts-ignore
import { Viewport as PixiViewport } from 'pixi-viewport';
import {
  AppStateManager,
  Article,
  ScopedAppStateManager,
} from '../providers/index.js';
import { NodeSelection } from './node-selection.js';
import { IndexedSet, TwoKeyMap, Vector2D } from '../types/index.js';
import {
  GraphBehaviourManager,
  GraphDebugBehaviour,
  GraphDragBehaviour,
  GraphForceBehaviour,
  GraphSelectionBehaviour,
  GraphNodeTintBehaviour,
} from './graph-behaviours/index.js';

/**
 * A graphical representation of a graph of nodes in the viewport.
 */
export class NodeGraph {
  /**
   * The nodes in the graph.
   */
  #nodes = new IndexedSet<pixi.Graphics>();

  /**
   * The node map, keyed by node ID and dictionary.
   */
  #nodeMap = new TwoKeyMap<number, string, pixi.Graphics>();

  /**
   * The edge canvas.
   */
  #edgeCanvas = new pixi.Graphics();

  /**
   * The d3 nodes from which the graph is generated.
   */
  #d3Nodes: (d3.SimulationNodeDatum & Article)[] = [];

  /**
   * The d3 links from which the graph is generated.
   */
  #d3Links: d3.SimulationLinkDatum<d3.SimulationNodeDatum & Article>[] = [];

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
      nodeMap: this.#nodeMap,
      allGraphics: this.#nodes,
      nodes: this.#d3Nodes,
    });

    this.#nodeBehaviourManager
      .register(GraphDragBehaviour)
      .register(GraphSelectionBehaviour)
      .register(GraphNodeTintBehaviour)
      .register(GraphForceBehaviour)
      .register(GraphDebugBehaviour);

    this.#viewport.addChild(this.#edgeCanvas);

    this.#viewport.on('zoomed', () => {
      const textResolution = this.#viewport.scale.x;

      for (const node of this.#nodes) {
        const text = node.getChildAt(0) as pixi.Text;
        text.resolution = textResolution;
      }
    });

    this.#appStateManager.on('request-node-positions', () => {
      const nodePositions: { [id: number]: Vector2D } = {};
      this.#simulation.nodes().forEach((node) => {
        nodePositions[node.id] = new Vector2D(
          Math.round(node.x!),
          Math.round(node.y!),
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
  get nodes(): IndexedSet<pixi.Graphics> {
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
    this.#d3Nodes = nodes;
    this.#d3Links = links;
    this.#createNodeGraphics();
    this.render();
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
      const node = new pixi.Graphics();
      const text = new pixi.Text(d3Node.lemmas[0].lemma, {
        fontSize: 12,
        fill: 0xffffff,
        fontFamily: 'Lora',
      });

      text.resolution = this.#viewport.scale.x;

      // Adjust rectangle size based on text bounds
      const textBounds = pixi.TextMetrics.measureText(
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

      node.beginFill(color);
      node.lineStyle(1, borderColor);
      node.drawRoundedRect(
        -width / 2,
        -height / 2,
        width,
        height,
        cornerRadius,
      );
      node.endFill();

      text.anchor.set(0.5);
      text.position.set(0, 0);
      node.addChild(text);

      node.x = d3Node.x!;
      node.y = d3Node.y!;
      this.#viewport.addChild(node);
      this.#nodes.add(node);
      this.#nodeMap.set(d3Node.id, d3Node.dictionary, node);

      node.eventMode = 'dynamic';
      node.cursor = 'pointer';

      this.#nodeBehaviourManager.nodeGraphicsCreated({
        graphics: node,
        node: d3Node,
        index: this.#nodes.indexOf(node),
      });
    });
  }

  /**
   * Renders the graph.
   */
  render() {
    this.#edgeCanvas.clear();

    this.#edgeCanvas.lineStyle(1, 0x00ffff, 1);
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

      this.#edgeCanvas.moveTo(source.x, source.y);
      this.#edgeCanvas.lineTo(target.x, target.y);
    }
    // Update node positions
    const simulationNodes = this.#d3Nodes;
    for (const [i, graphics] of this.#nodes.entries()) {
      graphics.x = simulationNodes[i].x!;
      graphics.y = simulationNodes[i].y!;
    }

    this.#nodeBehaviourManager.graphicsRendered({
      allGraphics: this.#nodes,
      nodes: this.#d3Nodes,
    });
  }
}

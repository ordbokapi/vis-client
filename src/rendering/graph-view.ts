import * as d3 from 'd3';
import * as pixi from 'pixi.js';
import { Viewport } from 'pixi-viewport';
import { Article, ArticleGraph } from '../providers/index.js';
import { NodeGraph } from './node-graph.js';

/**
 * Full-viewport graph view, built using D3 and a canvas. Nodes can be
 * interacted with, and the graph can be panned and zoomed.
 */
export class GraphView extends EventTarget {
  /**
   * Pixi-viewport instance.
   */
  #viewport: Viewport;

  /**
   * Pixi application instance.
   */
  #application: pixi.Application;

  /**
   * PixiJS canvas for overlay.
   */
  #overlayCanvas: pixi.Container;

  /**
   * The current graph being displayed.
   */
  #graph?: ArticleGraph;

  /**
   * The current graph being displayed.
   */
  get graph() {
    return this.#graph;
  }

  /**
   * D3 force simulation.
   */
  #simulation: d3.Simulation<
    d3.SimulationNodeDatum & Article,
    d3.SimulationLinkDatum<d3.SimulationNodeDatum & Article>
  >;

  /**
   * The node graph renderer.
   */
  #nodeGraph: NodeGraph;

  constructor(viewport: Viewport, application: pixi.Application) {
    super();

    this.#application = application;
    this.#viewport = viewport;

    this.#overlayCanvas = this.#viewport.addChild(new pixi.Container());

    this.#simulation = d3.forceSimulation<d3.SimulationNodeDatum & Article>();

    this.#nodeGraph = new NodeGraph(
      this.#application,
      this.#viewport,
      this.#simulation,
    );

    this.#viewport.on('zoomed', () => {
      this.#renderIsEmptyOverlay();
    });
  }

  setGraph(graph: ArticleGraph | undefined) {
    this.#graph = graph;

    if (!graph) {
      this.#nodeGraph.setData([], []);
      this.#simulation.nodes([]);
      this.#simulation
        .force<
          d3.ForceLink<
            d3.SimulationNodeDatum & Article,
            d3.SimulationLinkDatum<d3.SimulationNodeDatum & Article>
          >
        >('link')
        ?.links([]);
      this.#renderIsEmptyOverlay();
      return;
    }

    this.#simulation.nodes(graph.nodes);
    const links = this.#simulation
      .force<
        d3.ForceLink<
          d3.SimulationNodeDatum & Article,
          d3.SimulationLinkDatum<d3.SimulationNodeDatum & Article>
        >
      >('link')
      ?.links(
        graph.edges.map((edge) => ({
          source: edge.sourceId,
          target: edge.targetId,
        })),
      )
      .links();
    this.#nodeGraph.setData(graph.nodes, links ?? []);

    this.#renderIsEmptyOverlay();
  }

  /**
   * Forces the graph to re-render.
   */
  render() {
    this.#nodeGraph.render();
    this.#renderIsEmptyOverlay();
  }

  #renderIsEmptyOverlay() {
    this.#overlayCanvas.removeChildren();

    if (this.#simulation.nodes().length) {
      return;
    }

    const text = new pixi.Text({
      text: 'Ingen data. Søk etter ein artikkel for å starte.',
      style: {
        fontSize: 16,
        fill: 0xaaaaaa,
        fontFamily: 'IBM Plex Sans',
      },
    });

    text.resolution = this.#viewport.scale.x * 2;
    text.anchor.set(0.5);
    text.position.set(this.#viewport.width / 2, this.#viewport.height / 2);
    this.#overlayCanvas.addChild(text);
  }
}

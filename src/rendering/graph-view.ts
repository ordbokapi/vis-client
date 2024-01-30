import * as d3 from 'd3';
import * as pixi from 'pixi.js';
// @ts-ignore
import { Viewport } from 'pixi-viewport';
import {
  AppStateManager,
  Article,
  ArticleGraph,
  ScopedAppStateManager,
} from '../providers/index.js';
import { NodeGraph } from './node-graph.js';

/**
 * Full-viewport graph view, built using D3 and a canvas. Nodes can be
 * interacted with, and the graph can be panned and zoomed.
 */
export class GraphView extends EventTarget {
  /**
   * The application state manager.
   */
  #appStateManager: ScopedAppStateManager;

  /**
   * Pixi-viewport instance.
   */
  #viewport: Viewport;

  /**
   * Grid graphics.
   */
  #gridGraphics: pixi.Graphics;

  /**
   * Pixi application instance.
   */
  #application: pixi.Application;

  /**
   * PixiJS canvas for overlay.
   */
  #overlayCanvas: pixi.Graphics;

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
   * Whether or not this is the first time the graph has been rendered.
   */
  #firstRender = true;

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

    this.#appStateManager = AppStateManager.global.for(this);

    this.#overlayCanvas = this.#viewport.addChild(new pixi.Graphics());
    this.#gridGraphics = this.#viewport.addChild(new pixi.Graphics());

    this.#simulation = d3.forceSimulation<d3.SimulationNodeDatum & Article>();

    this.#nodeGraph = new NodeGraph(
      this.#application,
      this.#viewport,
      this.#simulation,
    );

    this.#viewport.on('zoomed', () => {
      this.#renderIsEmptyOverlay();
      this.#renderGrid();
    });

    this.#appStateManager.observe('translation', () => {
      window.requestAnimationFrame(() => {
        this.#renderGrid();
      });
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
    this.#renderGrid();
  }

  #renderIsEmptyOverlay() {
    this.#overlayCanvas.clear();
    this.#overlayCanvas.removeChildren();

    if (this.#simulation.nodes().length) {
      return;
    }

    const text = new pixi.Text(
      'Ingen data. Søk etter ein artikkel for å starta.',
      {
        fontSize: 16,
        fill: 0xaaaaaa,
        fontFamily: 'IBM Plex Sans',
      },
    );

    text.resolution = this.#viewport.scale.x;
    text.anchor.set(0.5);
    text.position.set(this.#viewport.width / 2, this.#viewport.height / 2);
    this.#overlayCanvas.addChild(text);
  }

  /**
   * Render an unobtrusive grid that fills the viewport background.
   */
  #renderGrid() {
    const { x, y, width, height } = this.#viewport.getVisibleBounds();

    const scale = this.#viewport.scale.x;
    const maxCellSize = 400;
    let steps: number;

    if (scale < 0.5) {
      steps = 1; // only 400px grid cells
    } else if (scale < 1) {
      steps = 2; // 400px and 200px grid cells
    } else if (scale < 1.5) {
      steps = 3; // 400px, 200px and 100px grid cells
    } else {
      steps = 4; // 400px, 200px, 100px and 50px grid cells
    }

    const [colorA, colorB] =
      steps % 2 ? [0x252525, 0x303030] : [0x303030, 0x252525];

    this.#gridGraphics.clear();

    const minCellSize = maxCellSize / Math.pow(2, steps - 1);

    // use modular math and the current viewport translation to ensure that
    // the grid seems to move with the viewport
    const offsetX = x % (minCellSize * 2);
    const offsetY = y % (minCellSize * 2);

    const startX = x - offsetX - minCellSize * 2;
    const startY = y - offsetY - minCellSize * 2;

    const endX = x + width + minCellSize;
    const endY = y + height + minCellSize;

    this.#gridGraphics.lineStyle(1 / scale, colorA, 0.8);

    for (let i = startX; i <= endX; i += minCellSize * 2) {
      this.#gridGraphics.moveTo(i, startY);
      this.#gridGraphics.lineTo(i, endY);
    }

    for (let i = startY; i <= endY; i += minCellSize * 2) {
      this.#gridGraphics.moveTo(startX, i);
      this.#gridGraphics.lineTo(endX, i);
    }

    this.#gridGraphics.lineStyle(1 / scale, colorB, 0.8);

    for (let i = startX + minCellSize; i <= endX; i += minCellSize * 2) {
      this.#gridGraphics.moveTo(i, startY);
      this.#gridGraphics.lineTo(i, endY);
    }

    for (let i = startY + minCellSize; i <= endY; i += minCellSize * 2) {
      this.#gridGraphics.moveTo(startX, i);
      this.#gridGraphics.lineTo(endX, i);
    }
  }
}

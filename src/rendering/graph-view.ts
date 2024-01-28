import * as d3 from 'd3';
import * as pixi from 'pixi.js';
// @ts-ignore
import { Viewport } from 'pixi-viewport';
import {
  AppStateManager,
  Article,
  ArticleGraph,
  ArticleGraphEdge,
  ScopedAppStateManager,
} from '../providers/index.js';
import { Dictionary, Vector2D, Rect2D } from '../types/index.js';
import { BBoxCollisionForce } from './bbox-collision-force.js';
import { DebugPanel } from './debug-panel.js';

/**
 * Full-viewport graph view, built using D3 and a canvas. Nodes can be interacted with,
 * and the graph can be panned and zoomed.
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
   * Pixi application instance.
   */
  #application: pixi.Application;

  /**
   * PixiJS canvas for overlay.
   */
  #overlayCanvas: pixi.Graphics;

  /**
   * PixiJS canvas for edges.
   */
  #edgeCanvas: pixi.Graphics;

  /**
   * Array of node PIXI objects.
   */
  #nodeGraphics: pixi.Graphics[];

  /**
   * PixiJS root container for nodes.
   */
  #nodeRoot: pixi.Container;

  /**
   * PixiJS canvas for debug drawing in the viewport.
   */
  #debugViewportCanvas?: pixi.Graphics;

  /**
   * PixiJS canvas for debug drawing directly in the application.
   */
  #debugAppCanvas?: pixi.Graphics;

  /**
   * Debug panel.
   */
  #debugPanel?: DebugPanel;

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
    { source: number; target: number }
  >;

  constructor(viewport: Viewport, application: pixi.Application) {
    super();

    this.#application = application;

    if (!(window as any).appStateManager) {
      (window as any).appStateManager = new AppStateManager();
    }
    this.#appStateManager = (
      window as any as {
        appStateManager: AppStateManager;
      }
    ).appStateManager.for(this);

    this.#viewport = viewport;
    this.#overlayCanvas = this.#viewport.addChild(new pixi.Graphics());
    this.#edgeCanvas = this.#viewport.addChild(new pixi.Graphics());
    this.#nodeRoot = this.#viewport.addChild(new pixi.Container());

    if (this.#appStateManager.get('debug')) {
      this.#debugViewportCanvas = this.#viewport.addChild(new pixi.Graphics());
      this.#debugAppCanvas = this.#application.stage.addChild(
        new pixi.Graphics(),
      );
    }
    this.#nodeGraphics = [];

    this.#simulation = d3
      .forceSimulation<d3.SimulationNodeDatum & Article>()
      .force(
        'link',
        d3
          .forceLink<
            d3.SimulationNodeDatum & Article,
            { source: number; target: number }
          >()
          .id((d) => d.id)
          .strength(0.1),
      )
      .force('charge', d3.forceManyBody().strength(-100))
      .force('center', d3.forceCenter(0, 0).strength(1))
      .force(
        'collide',
        new BBoxCollisionForce(
          this.#viewport,
          this.#nodeGraphics,
          this.#debugViewportCanvas,
          this.#debugAppCanvas,
        )
          .strength(2)
          .ticksToWait(200)
          .onStart(() => {
            this.#appStateManager.emit('start-sim');
          })
          .getD3Force(),
      )
      .alphaDecay(0.02)
      .alphaTarget(0)
      .velocityDecay(0.5);

    // tick only fires when the simulation is running, so we need to manually
    // call it every frame

    this.#application.ticker.add(() => {
      this.#tick();
    });

    this.#viewport.on('zoomed', () => {
      const textResolution = this.#viewport.scale.x;
      this.#nodeGraphics.forEach((node) => {
        const text = node.getChildAt(0) as pixi.Text;
        text.resolution = textResolution;
      });
      this.#renderIsEmptyOverlay();
    });

    this.#appStateManager.on('request-node-positions', () => {
      const nodePositions: { [id: number]: Vector2D } = {};
      this.#simulation.nodes().forEach((node) => {
        nodePositions[node.id] = new Vector2D(node.x!, node.y!);
      });
      this.#appStateManager.set('nodePositions', nodePositions);
    });
  }

  setGraph(graph: ArticleGraph | undefined) {
    this.#graph = graph;

    if (!graph) {
      this.#setNodes([]);
      this.#setLinks([]);
      this.#renderIsEmptyOverlay();
      return;
    }

    this.#setNodes(graph.nodes);
    this.#setLinks(graph.edges);

    if (this.#firstRender) {
      this.#firstRender = false;
      const nodePositions = this.#appStateManager.get('nodePositions');
      if (nodePositions) {
        let missed = false;
        this.#simulation.nodes().forEach((node) => {
          const position = nodePositions[node.id];
          if (position) {
            node.x = position.x;
            node.y = position.y;
          } else {
            missed = true;
          }
        });

        if (!missed) {
          this.#renderIsEmptyOverlay();
          this.#appStateManager.emit('start-sim');
          this.#simulation.stop();

          return;
        }
      }
    }

    this.#simulation.alpha(2).restart().tick(200).alpha(1);
    this.#renderIsEmptyOverlay();
  }

  #setNodes(nodes: Article[]) {
    this.#simulation.nodes(nodes);

    this.#createNodeGraphics();
  }

  #setLinks(links: ArticleGraphEdge[]) {
    this.#simulation.force<d3.ForceLink<any, any>>('link')?.links(
      links.map((link) => ({
        source: link.sourceId,
        target: link.targetId,
      })),
    );
  }

  /**
   * Forces the graph to re-render.
   */
  render() {
    this.#createNodeGraphics();
    this.#renderIsEmptyOverlay();
  }

  #selectedNode: pixi.Graphics | null = null;

  #renderIsEmptyOverlay() {
    this.#overlayCanvas.clear();
    this.#overlayCanvas.removeChildren();

    if (this.#simulation.nodes().length) {
      return;
    }

    this.#overlayCanvas.beginFill(0x000000, 0.5);
    this.#overlayCanvas.drawRect(
      0,
      0,
      this.#viewport.width,
      this.#viewport.height,
    );
    this.#overlayCanvas.endFill();

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

  #selectNode(node: pixi.Graphics, id: number, dictionary: Dictionary) {
    if (this.#selectedNode) {
      // Reset style of previously selected node
      this.#selectedNode.tint = 0xffffff;

      if (this.#selectedNode === node) {
        this.#selectedNode = null;
        this.#appStateManager.set('sidebarArticle', null);
        return;
      }
    }

    this.#appStateManager.set('sidebarArticle', { id, dictionary });

    // Update style of newly selected node
    node.tint = 0x666666;
    this.#selectedNode = node;
  }

  #createNodeGraphics() {
    // Remove old nodes
    this.#nodeGraphics.forEach((node) => this.#nodeRoot.removeChild(node));
    this.#nodeGraphics.length = 0;

    // Create new nodes
    this.#simulation.nodes().forEach((d) => {
      const node = new pixi.Graphics();
      const text = new pixi.Text(d.lemmas[0].lemma, {
        fontSize: 12,
        fill: 0xffffff,
        fontFamily: 'Lora',
      });

      text.resolution = this.#viewport.scale.x;

      // Adjust rectangle size based on text bounds
      const textBounds = pixi.TextMetrics.measureText(
        d.lemmas[0].lemma,
        text.style,
      );
      const paddingX = 20;
      const paddingY = 10;
      const width = textBounds.width + paddingX;
      const height = textBounds.height + paddingY;
      const cornerRadius = 20;
      const color = 0x1b1b1b;
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

      node.x = d.x!;
      node.y = d.y!;
      this.#nodeRoot.addChild(node);
      this.#nodeGraphics.push(node);

      node.eventMode = 'dynamic';
      node.cursor = 'pointer';

      // Dragging state
      let isDragging = false;
      let data: Vector2D = new Vector2D();
      let initialPosition = new Vector2D();
      let anchorOffset = new Vector2D();

      node.on('mouseover', () => {
        if (!isDragging) {
          node.tint = 0xbbbbbb;
        }
      });

      node.on('mouseout', () => {
        if (!isDragging) {
          node.tint = this.#selectedNode !== node ? 0xffffff : 0x666666;
        }
      });

      node.on('pointerdown', (event) => {
        // disable viewport dragging
        this.#viewport.plugins.pause('drag');

        isDragging = true;
        node.tint = 0x888888;
        text.tint = 0x888888;
        // calculate offset from location of pointer to center of node
        anchorOffset = new Vector2D(
          event.getLocalPosition(node.parent),
        ).subtract(new Vector2D(node));
        data = new Vector2D(node);
        initialPosition = new Vector2D(node);
      });

      this.#viewport.on('pointermove', (event: pixi.FederatedMouseEvent) => {
        if (isDragging) {
          data = new Vector2D(event.getLocalPosition(node.parent));
          const newPosition = data.subtract(anchorOffset);
          d.fx = newPosition.x;
          d.fy = newPosition.y;
          d.x = newPosition.x;
          d.y = newPosition.y;
        }
      });

      this.#viewport.on('pointerup', () => {
        if (isDragging) {
          // enable viewport dragging
          this.#viewport.plugins.resume('drag');

          isDragging = false;
          node.tint = this.#selectedNode !== node ? 0xffffff : 0x666666;
          text.tint = 0xffffff;
          d.fx = null;
          d.fy = null;

          const distance = initialPosition.distance(data);

          if (distance < 10) {
            this.#selectNode(node, d.id, d.dictionary);
          }
        }
      });

      this.#viewport.on('pointerupoutside', () => {
        if (isDragging) {
          isDragging = false;
          node.tint = this.#selectedNode !== node ? 0xffffff : 0x666666;
          d.fx = null;
          d.fy = null;
        }
      });
    });
  }

  #tick(): void {
    this.#edgeCanvas.clear();
    this.#edgeCanvas.lineStyle(1, 0x00ffff, 1);

    this.#simulation
      .force<d3.ForceLink<any, any>>('link')
      ?.links()
      .forEach((link) => {
        this.#edgeCanvas.moveTo(link.source.x!, link.source.y!);
        this.#edgeCanvas.lineTo(link.target.x!, link.target.y!);
      });

    // Update node positions
    const simulationNodes = this.#simulation.nodes();
    this.#nodeGraphics.forEach((node, i) => {
      node.x = simulationNodes[i].x!;
      node.y = simulationNodes[i].y!;
    });

    if (this.#appStateManager.get('debug') && this.#selectedNode) {
      if (!this.#debugPanel) {
        this.#debugPanel = new DebugPanel(
          this.#application.stage.addChild(new pixi.Graphics()),
          new Rect2D(20, 500, 200, 200),
        );
      }

      const node =
        simulationNodes[this.#nodeGraphics.indexOf(this.#selectedNode)];

      const velocity = new Vector2D(node.vx, node.vy);
      const velocityAngle = velocity.angle();

      let direction = '';
      if (velocityAngle >= -Math.PI / 8 && velocityAngle < Math.PI / 8) {
        direction = 'E';
      } else if (
        velocityAngle >= Math.PI / 8 &&
        velocityAngle < (3 * Math.PI) / 8
      ) {
        direction = 'SE';
      } else if (
        velocityAngle >= (3 * Math.PI) / 8 &&
        velocityAngle < (5 * Math.PI) / 8
      ) {
        direction = 'S';
      } else if (
        velocityAngle >= (5 * Math.PI) / 8 &&
        velocityAngle < (7 * Math.PI) / 8
      ) {
        direction = 'SW';
      } else if (
        velocityAngle >= (7 * Math.PI) / 8 ||
        velocityAngle < (-7 * Math.PI) / 8
      ) {
        direction = 'W';
      } else if (
        velocityAngle >= (-7 * Math.PI) / 8 &&
        velocityAngle < (-5 * Math.PI) / 8
      ) {
        direction = 'NW';
      } else if (
        velocityAngle >= (-5 * Math.PI) / 8 &&
        velocityAngle < (-3 * Math.PI) / 8
      ) {
        direction = 'N';
      } else if (
        velocityAngle >= (-3 * Math.PI) / 8 &&
        velocityAngle < -Math.PI / 8
      ) {
        direction = 'NE';
      }

      this.#debugPanel.setText(0, `ID: ${node.id}`);
      this.#debugPanel.setText(1, `Dictionary: ${node.dictionary}`);
      this.#debugPanel.setText(2, `X: ${node.x?.toFixed(2)}`);
      this.#debugPanel.setText(3, `Y: ${node.y?.toFixed(2)}`);
      this.#debugPanel.setText(4, `VX: ${node.vx?.toFixed(2)}`);
      this.#debugPanel.setText(5, `VY: ${node.vy?.toFixed(2)}`);
      this.#debugPanel.setText(
        6,
        `Velocity magnitude: ${velocity.magnitude.toFixed(2)}`,
      );
      this.#debugPanel.setText(
        7,
        `Velocity angle: ${velocityAngle.toFixed(2)} (${direction})`,
      );
    }
  }
}

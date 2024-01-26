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
import { Dictionary, Vector2D } from '../types/index.js';

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
   * D3 force simulation.
   */
  #simulation: d3.Simulation<
    d3.SimulationNodeDatum & Article,
    { source: number; target: number }
  >;

  constructor(viewport: Viewport) {
    super();

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
          .strength(0.05),
      )
      .force('charge', d3.forceManyBody().strength(-50))
      // d3 collision force only works with circles, so we use a custom
      // implementation instead that uses the PixiJS rectangle bounding boxes
      .force('collision', () => {
        const nodes = this.#simulation.nodes();
        const quadtree = d3.quadtree(
          nodes,
          (d) => d.x!,
          (d) => d.y!,
        );

        nodes.forEach((node) => {
          const nodeBounds =
            this.#nodeGraphics[nodes.indexOf(node)].getBounds();
          quadtree.visit((quad) => {
            if (!quad) return;

            if ('data' in quad && quad.data !== node) {
              const quadNodeBounds =
                this.#nodeGraphics[nodes.indexOf(quad.data)].getBounds();

              // expand bounds slightly to give nodes some breathing room
              const margin = 10;

              quadNodeBounds.x -= margin;
              quadNodeBounds.y -= margin;
              quadNodeBounds.width += margin;
              quadNodeBounds.height += margin;

              // Calculate overlap and apply force to separate nodes

              // Calculate overlap on x-axis
              const xOverlap = Math.max(
                0,
                Math.min(nodeBounds.right, quadNodeBounds.right) -
                  Math.max(nodeBounds.left, quadNodeBounds.left),
              );
              // Calculate overlap on y-axis
              const yOverlap = Math.max(
                0,
                Math.min(nodeBounds.bottom, quadNodeBounds.bottom) -
                  Math.max(nodeBounds.top, quadNodeBounds.top),
              );

              // Calculate total overlap
              const overlap = xOverlap * yOverlap;

              // Adjust node position if overlap exists
              if (overlap > 0) {
                const force =
                  (overlap * 20) / (nodeBounds.width * nodeBounds.height);
                const dx = node.x! - quad.data.x! || 1;
                const dy = node.y! - quad.data.y! || 1;
                const angle = Math.atan2(dy, dx);
                node.x! += Math.cos(angle) * force + Math.random() * 0.1;
                node.y! += Math.sin(angle) * force + Math.random() * 0.1;
              }
            }

            // Return false to only check nodes in the current quad
            return false;
          });
        });
      })
      .force(
        'center',
        d3.forceCenter(this.#viewport.width / 2, this.#viewport.height / 2),
      )
      .alphaTarget(0.1)
      .on('tick', () => this.#tick());

    this.#viewport.on('zoomed', () => {
      const textResolution = this.#viewport.scale.x;
      this.#nodeGraphics.forEach((node) => {
        const text = node.getChildAt(0) as pixi.Text;
        text.resolution = textResolution;
      });
      this.#renderIsEmptyOverlay();
    });
  }

  setGraph(graph: ArticleGraph) {
    this.#setNodes(graph.nodes);
    this.#setLinks(graph.edges);
    this.#simulation.alpha(1).restart();
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
    }

    this.#appStateManager.set('sidebarArticle', { id, dictionary });

    // Update style of newly selected node
    node.tint = 0x666666;
    this.#selectedNode = node;
  }

  #createNodeGraphics() {
    // Remove old nodes
    this.#nodeGraphics.forEach((node) => this.#viewport.removeChild(node));
    this.#nodeGraphics = [];

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
      this.#viewport.addChild(node);
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
    this.#nodeGraphics.forEach((node, i) => {
      node.x = this.#simulation.nodes()[i].x!;
      node.y = this.#simulation.nodes()[i].y!;
    });
  }
}

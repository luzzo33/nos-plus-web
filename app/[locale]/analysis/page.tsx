'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import {
  Search,
  AlertCircle,
  ExternalLink,
  Loader2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Info,
  BookOpen,
  HelpCircle,
  RefreshCw,
  Layers,
  Settings,
  Activity,
  TrendingUp,
  GitBranch,
  Clock,
  Hash,
  Wallet,
  ArrowRight,
  Filter,
  Database,
  Zap,
  Network,
  DollarSign,
  Eye,
  EyeOff,
} from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import type { FlowEdge, FlowTraceResponse } from '@/lib/api/flow-client';
import { AnalysisLocaleNotice } from '@/components/analysis/AnalysisLocaleNotice';

type SvgSelection = d3.Selection<SVGSVGElement, unknown, null, undefined>;
type GroupSelection = d3.Selection<SVGGElement, unknown, null, undefined>;

interface PositionedNode {
  x: number;
  y: number;
  data: D3Node;
}

interface LinkDatum {
  source: PositionedNode;
  target: PositionedNode;
  amount: number;
}

type TreeDatum = { id: string; parentId: string | null; data: D3Node };

declare global {
  interface Window {
    zoomInFlow?: () => void;
    zoomOutFlow?: () => void;
    resetZoomFlow?: () => void;
  }
}
import { cn } from '@/lib/utils';
import { KNOWN_ADDRESS_ALIASES } from '@/lib/aliases';
import * as d3 from 'd3';
import { sankey as d3Sankey, sankeyLinkHorizontal, sankeyCenter } from 'd3-sankey';
import { Download } from 'lucide-react';

type TraceParams = Parameters<typeof apiClient.traceFlow>[0];

type FlowNode = {
  id: string;
  label: string;
  type?: string;
};

type FlowLink = {
  source: string;
  target: string;
  amount: number;
  ts?: number | null;
  signature?: string;
};

type D3Node = d3.SimulationNodeDatum & {
  id: string;
  label: string;
  type?: string;
  depth: number;
  totalReceived: number;
  totalSent: number;
  netFlow: number;
  isStart: boolean;
  group?: number;
};

type FlowTraceMeta = {
  rpcUsed?: number;
  depthReached?: number | string;
  truncated?: boolean;
};

interface FlowTraceNormalized {
  nodes: FlowNode[];
  links: FlowLink[];
  cached: boolean;
  keyHash: string;
  meta?: FlowTraceMeta;
  createdAt?: string;
}

type ForceNodeDatum = D3Node;
type ForceLinkDatum = d3.SimulationLinkDatum<ForceNodeDatum> & FlowLink;

interface SankeyNodeLayout extends D3Node {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
  value?: number;
}

interface SankeyLinkLayout {
  source: SankeyNodeLayout;
  target: SankeyNodeLayout;
  value: number;
  width: number;
}

export default function AnalysisPage() {
  const t = useTranslations('analysis');

  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const gRootRef = useRef<d3.Selection<SVGGElement, unknown, null, undefined> | null>(null);
  const pendingStartedAtRef = useRef<number | null>(null);

  const [dimensions, setDimensions] = useState({ width: 1200, height: 800 });

  const [address, setAddress] = useState('');
  const [rpcUrl, setRpcUrl] = useState('https://api.mainnet-beta.solana.com');
  const [startType, setStartType] = useState<TraceParams['startType']>('auto');
  const [addressType, setAddressType] = useState<TraceParams['addressType']>('auto');
  const [maxDepth, setMaxDepth] = useState(4);
  const [maxFanout, setMaxFanout] = useState(20);
  const [minAmount, setMinAmount] = useState(10);
  const [sinceDays, setSinceDays] = useState(90);
  const [rpcBudgetMode, setRpcBudgetMode] = useState<'auto' | 'custom'>('auto');
  const [rpcBudget, setRpcBudget] = useState<number>(300);
  const [loading, setLoading] = useState(false);
  const [waitingLong, setWaitingLong] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [viewMode, setViewMode] = useState<'force' | 'tree' | 'sankey'>('tree');
  const [showLabels, setShowLabels] = useState(true);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [showInfo, setShowInfo] = useState(false);
  const [recentRuns, setRecentRuns] = useState<
    Array<{ keyHash: string; params: TraceParams; ts: number }>
  >([]);
  const [preferCache, setPreferCache] = useState(true);
  const [showDocs, setShowDocs] = useState(false);
  const [avoidOverlap, setAvoidOverlap] = useState(true);
  const [lastParamsUsed, setLastParamsUsed] = useState<TraceParams | null>(null);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const submitOverrideRef = useRef<TraceParams | null>(null);

  const [result, setResult] = useState<FlowTraceNormalized | null>(null);

  const normalizeFlowCache = (
    raw: FlowTraceResponse | null | undefined,
  ): FlowTraceNormalized | null => {
    if (!raw) return null;

    const mapNode = (node: { id: string; label: string; type?: string | null }): FlowNode => ({
      id: node.id,
      label: node.label,
      type: node.type ?? undefined,
    });

    const nodes: FlowNode[] =
      Array.isArray(raw.nodesDetailed) && raw.nodesDetailed.length
        ? raw.nodesDetailed.map(mapNode)
        : Array.isArray(raw.nodes)
          ? raw.nodes.map(mapNode)
          : [];

    const mapLink = (link: {
      source: string;
      target: string;
      amount: number;
      ts?: number | null;
      signature?: string | null;
    }): FlowLink => ({
      source: link.source,
      target: link.target,
      amount: link.amount,
      ts: link.ts ?? undefined,
      signature: link.signature ?? undefined,
    });

    let links: FlowLink[] = [];
    if (Array.isArray(raw.linksDetailed) && raw.linksDetailed.length) {
      links = raw.linksDetailed.map(mapLink);
    } else if (Array.isArray(raw.links) && raw.links.length) {
      links = raw.links.map(mapLink);
    } else if (Array.isArray(raw.edges) && raw.edges.length) {
      links = raw.edges
        .filter(
          (edge): edge is FlowEdge =>
            typeof edge.source === 'string' &&
            typeof edge.destination === 'string' &&
            typeof edge.amount === 'number',
        )
        .map((edge) => ({
          source: edge.source,
          target: edge.destination,
          amount: edge.amount,
          ts: edge.blockTime ?? undefined,
          signature: edge.signature ?? undefined,
        }));
    }

    return {
      nodes,
      links,
      cached: Boolean(raw.cached),
      keyHash: raw.keyHash,
      meta: raw.meta,
      createdAt: raw.createdAt,
    };
  };

  const [startNode, setStartNode] = useState<string>('');

  const getAlias = (addr: string) => KNOWN_ADDRESS_ALIASES[addr];
  const shortAddr = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  const displayName = (addr: string) => getAlias(addr) || shortAddr(addr);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('analysis.recent');
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) setRecentRuns(arr);
      }
    } catch {}
  }, []);

  useEffect(() => {
    const update = () => {
      if (!containerRef.current) return;
      const { width } = containerRef.current.getBoundingClientRect();
      setDimensions({
        width: Math.max(320, width),
        height: Math.min(800, window.innerHeight * 0.7),
      });
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    const key = url.searchParams.get('key');
    const paramsB64 = url.searchParams.get('params');
    if (key) {
      loadFromCache(key);
    } else if (paramsB64) {
      try {
        const raw = JSON.parse(decodeURIComponent(atob(paramsB64)));
        if (raw.start) setAddress(raw.start);
        if (raw.rpcUrl) setRpcUrl(raw.rpcUrl);
        if (raw.startType) setStartType(raw.startType);
        if (raw.addressType) setAddressType(raw.addressType);
        if (typeof raw.maxDepth === 'number') setMaxDepth(raw.maxDepth);
        if (typeof raw.maxFanout === 'number') setMaxFanout(raw.maxFanout);
        if (typeof raw.minAmount === 'number') setMinAmount(raw.minAmount);
        if (typeof raw.sinceDays === 'number') setSinceDays(raw.sinceDays);
        if (typeof raw.rpcBudget === 'number') {
          setRpcBudgetMode('custom');
          setRpcBudget(raw.rpcBudget);
        } else {
          setRpcBudgetMode('auto');
        }
      } catch {}
    }
  }, []);

  const graphData = useMemo(() => {
    if (!result?.nodes || !result?.links) return { nodes: [] as D3Node[], links: [] as FlowLink[] };

    const nodeIds = new Set(result.nodes.map((n) => n.id));

    const adjacency = new Map<string, Set<string>>();
    const indegree = new Map<string, number>();
    result.nodes.forEach((n) => indegree.set(n.id, 0));
    result.links.forEach((l) => {
      if (!adjacency.has(l.source)) adjacency.set(l.source, new Set());
      adjacency.get(l.source)!.add(l.target);
      if (indegree.has(l.target)) indegree.set(l.target, (indegree.get(l.target) || 0) + 1);
    });

    const startIsValid = !!startNode && nodeIds.has(startNode);
    let seeds: string[] = [];
    if (startIsValid) seeds = [startNode];
    else {
      seeds = Array.from(indegree.entries())
        .filter(([, v]) => (v || 0) === 0)
        .map(([k]) => k);
      if (seeds.length === 0 && result.nodes.length) {
        const srcCount = new Map<string, number>();
        result.links.forEach((l) => srcCount.set(l.source, (srcCount.get(l.source) || 0) + 1));
        const top = Array.from(srcCount.entries()).sort((a, b) => b[1] - a[1])[0]?.[0];
        if (top) seeds = [top];
      }
    }

    const depthMap = new Map<string, number>();
    const q: string[] = [];
    seeds.forEach((s) => {
      depthMap.set(s, 0);
      q.push(s);
    });
    while (q.length) {
      const n = q.shift()!;
      const ns = adjacency.get(n);
      if (!ns) continue;
      ns.forEach((m) => {
        if (!depthMap.has(m)) {
          depthMap.set(m, (depthMap.get(n) || 0) + 1);
          q.push(m);
        }
      });
    }

    const recv = new Map<string, number>();
    const sent = new Map<string, number>();
    result.links.forEach((l) => {
      recv.set(l.target, (recv.get(l.target) || 0) + l.amount);
      sent.set(l.source, (sent.get(l.source) || 0) + l.amount);
    });

    const highlightId = startIsValid ? startNode : seeds.length ? seeds[0] : '';

    const nodes: D3Node[] = result.nodes.map((n) => ({
      id: n.id,
      label: n.label,
      type: n.type,
      depth: depthMap.get(n.id) ?? 999,
      totalReceived: recv.get(n.id) || 0,
      totalSent: sent.get(n.id) || 0,
      netFlow: (recv.get(n.id) || 0) - (sent.get(n.id) || 0),
      isStart: n.id === highlightId,
      group: depthMap.get(n.id) ?? 999,
    }));

    return { nodes, links: result.links };
  }, [result, startNode]);

  const radiusFor = (n: D3Node) =>
    n.isStart ? 28 : Math.max(14, Math.min(42, Math.log10(n.totalReceived + 1) * 10));
  const linkWidth = (amt: number) => Math.max(1.5, Math.min(14, Math.sqrt(amt || 0) / 80));
  const linkColor = (amt: number) =>
    amt > 100000 ? '#ef4444' : amt > 10000 ? '#f59e0b' : '#2563eb';
  const formatNumber = (n: number) => Math.round(n).toLocaleString();
  const formatCompact = (n: number) =>
    new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 0 }).format(
      Math.round(n),
    );

  const prepareSvg = (): { svg: SvgSelection; g: GroupSelection } | null => {
    if (!svgRef.current) return null;
    const svg = d3.select<SVGSVGElement, unknown>(svgRef.current);
    svg.selectAll('*').remove();

    const g = svg.append<SVGGElement>('g');

    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
        setZoomLevel(event.transform.k);
      });

    svg.call(zoom);
    zoomRef.current = zoom;
    gRootRef.current = g;

    if (typeof window !== 'undefined') {
      window.zoomInFlow = () => svg.transition().call(zoom.scaleBy, 1.3);
      window.zoomOutFlow = () => svg.transition().call(zoom.scaleBy, 0.7);
      window.resetZoomFlow = () => {
        const node = g.node();
        if (!node) return;
        const bounds = node.getBBox();
        const fullW = bounds.width;
        const fullH = bounds.height;
        const midX = bounds.x + fullW / 2;
        const midY = bounds.y + fullH / 2;
        const scale = 0.85 / Math.max(fullW / dimensions.width, fullH / dimensions.height);
        const translate: [number, number] = [
          dimensions.width / 2 - scale * midX,
          dimensions.height / 2 - scale * midY,
        ];
        svg
          .transition()
          .call(zoom.transform, d3.zoomIdentity.translate(translate[0], translate[1]).scale(scale));
      };
    }

    const defs = svg.append('defs');
    const colors = ['#059669', '#0369a1', '#6d28d9', '#be185d', '#b45309'];
    colors.forEach((c, i) => {
      const grad = defs
        .append('linearGradient')
        .attr('id', `gradient-${i}`)
        .attr('x1', '0%')
        .attr('y1', '0%')
        .attr('x2', '0%')
        .attr('y2', '100%');
      grad.append('stop').attr('offset', '0%').attr('stop-color', c).attr('stop-opacity', 0.9);
      grad.append('stop').attr('offset', '100%').attr('stop-color', c).attr('stop-opacity', 0.45);
    });
    const filter = defs
      .append('filter')
      .attr('id', 'glow')
      .attr('x', '-50%')
      .attr('y', '-50%')
      .attr('width', '200%')
      .attr('height', '200%');
    filter.append('feGaussianBlur').attr('stdDeviation', 4).attr('result', 'blur');
    const merge = filter.append('feMerge');
    merge.append('feMergeNode').attr('in', 'blur');
    merge.append('feMergeNode').attr('in', 'SourceGraphic');

    return { svg, g };
  };

  const fitToContent = (svg: SvgSelection, g: GroupSelection) => {
    const node = g.node();
    if (!node || !zoomRef.current) return;
    const bounds = node.getBBox();
    const fullW = bounds.width;
    const fullH = bounds.height;
    const midX = bounds.x + fullW / 2;
    const midY = bounds.y + fullH / 2;
    const scale = 0.85 / Math.max(fullW / dimensions.width, fullH / dimensions.height);
    const translate: [number, number] = [
      dimensions.width / 2 - scale * midX,
      dimensions.height / 2 - scale * midY,
    ];
    svg.call(
      zoomRef.current.transform,
      d3.zoomIdentity.translate(translate[0], translate[1]).scale(scale),
    );
  };

  const drawTree = () => {
    if (!graphData.nodes.length || !svgRef.current) return;

    const prepared = prepareSvg();
    if (!prepared) return;
    const { svg, g } = prepared;
    const margin = { top: 80, right: 80, bottom: 80, left: 80 };
    const innerW = Math.max(200, dimensions.width - margin.left - margin.right);
    const innerH = Math.max(200, dimensions.height - margin.top - margin.bottom);

    const depthLookup = new Map(graphData.nodes.map((n) => [n.id, n.depth] as const));
    const parentOf = new Map<string, string | null>();
    graphData.nodes.forEach((n) => {
      if (n.depth === 0) parentOf.set(n.id, null);
    });
    for (const l of graphData.links) {
      const sd = depthLookup.get(l.source);
      const td = depthLookup.get(l.target);
      if (sd !== undefined && td !== undefined && sd !== 999 && td !== 999 && td === sd + 1) {
        if (!parentOf.has(l.target)) parentOf.set(l.target, l.source);
      }
    }

    const nodesForTree = graphData.nodes
      .filter((n) => n.depth !== 999 && parentOf.has(n.id))
      .map((n) => ({ id: n.id, parentId: parentOf.get(n.id), data: n }));

    let useTree = nodesForTree.length > 0;
    let nodePos = new Map<string, PositionedNode>();
    let linkPairs: LinkDatum[] = [];

    if (useTree) {
      try {
        const root = d3
          .stratify<TreeDatum>()
          .id((d) => d.id)
          .parentId((d) => d.parentId ?? undefined)(nodesForTree);

        const maxR = d3.max(graphData.nodes, (n) => radiusFor(n)) || 24;
        const maxDepthVal = d3.max(graphData.nodes, (n) => n.depth) || 1;
        const columnsCount = Math.max(2, (maxDepthVal ?? 0) + 1);

        const populateFromLayout = (treeData: d3.HierarchyPointNode<TreeDatum>) => {
          const descendants = treeData.descendants();
          nodePos = new Map(
            descendants.map((node) => {
              const payload =
                node.data.data ??
                graphData.nodes.find((candidate) => candidate.id === node.data.id);
              const safePayload: D3Node = payload ?? {
                id: node.data.id,
                label: node.data.id,
                depth: 0,
                totalReceived: 0,
                totalSent: 0,
                netFlow: 0,
                isStart: false,
                group: 0,
              };
              return [
                safePayload.id,
                {
                  x: node.x + margin.left,
                  y: node.y + margin.top,
                  data: safePayload,
                } satisfies PositionedNode,
              ];
            }),
          );

          linkPairs = treeData.links().map((link): LinkDatum => {
            const sid = link.source.data.data?.id ?? link.source.data.id;
            const tid = link.target.data.data?.id ?? link.target.data.id;
            const direct = graphData.links.find((l) => l.source === sid && l.target === tid);
            const reverse = graphData.links.find((l) => l.source === tid && l.target === sid);
            const amount = direct?.amount ?? reverse?.amount ?? 0;
            return {
              source: nodePos.get(sid)!,
              target: nodePos.get(tid)!,
              amount,
            };
          });
        };

        if (avoidOverlap) {
          const xStep = Math.max(
            maxR * 2 + 2,
            Math.min(80, innerW / Math.max(columnsCount + 2, 6)),
          );
          const yStep = Math.max(maxR * 2 + 56, 104);
          const treeLayout = d3
            .tree<TreeDatum>()
            .nodeSize([xStep, yStep])
            .separation((a, b) => (a.parent === b.parent ? 1.01 : 1.2));
          const laidOut = treeLayout(root);
          populateFromLayout(laidOut);
        } else {
          const treeLayout = d3.tree<TreeDatum>().size([innerW, innerH]);
          const laidOut = treeLayout(root);
          populateFromLayout(laidOut);
        }
      } catch {
        useTree = false;
      }
    }

    if (!useTree) {
      const nodesByDepth = d3.group(
        graphData.nodes.filter((n) => n.depth !== 999),
        (d) => d.depth,
      );
      const depths = Array.from(nodesByDepth.keys()).sort((a, b) => a - b);
      const columns = Math.max(1, depths.length);
      const tightInnerW = avoidOverlap ? innerW * 0.65 : innerW;
      const startX = margin.left + (innerW - tightInnerW) / 2;
      const colX = (idx: number) =>
        startX + (columns > 1 ? (idx * tightInnerW) / (columns - 1) : tightInnerW / 2);
      depths.forEach((dVal, colIdx) => {
        const arr = (nodesByDepth.get(dVal) || [])
          .slice()
          .sort((a, b) => b.totalReceived + b.totalSent - (a.totalReceived + a.totalSent));
        const maxRDepth = d3.max(arr, (n) => radiusFor(n)) || 20;
        const minSpacingNoOverlap = maxRDepth * 2 + 56;
        const spacing = avoidOverlap
          ? Math.max(innerH / (arr.length + 1), minSpacingNoOverlap)
          : innerH / (arr.length + 1);
        arr.forEach((n, i) =>
          nodePos.set(n.id, { x: colX(colIdx), y: margin.top + (i + 1) * spacing, data: n }),
        );
      });
      linkPairs = graphData.links
        .filter((l) => nodePos.has(l.source) && nodePos.has(l.target))
        .map((l) => ({
          source: nodePos.get(l.source)!,
          target: nodePos.get(l.target)!,
          amount: l.amount,
        }));
    }

    g.append('g')
      .selectAll('path')
      .data(linkPairs)
      .enter()
      .append('path')
      .attr('d', (datum) => {
        const { source, target } = datum;
        const midY = (source.y + target.y) / 2;
        return `M${source.x},${source.y} C${source.x},${midY} ${target.x},${midY} ${target.x},${target.y}`;
      })
      .attr('fill', 'none')
      .attr('stroke', (datum) => linkColor(datum.amount))
      .attr('stroke-width', (datum) => linkWidth(datum.amount))
      .attr('stroke-opacity', 0.45)
      .on('mouseover', function (event, datum) {
        void datum;
        d3.select<SVGPathElement, LinkDatum>(this)
          .attr('stroke-opacity', 0.95)
          .attr('filter', 'url(#glow)');
      })
      .on('mouseout', function () {
        d3.select<SVGPathElement, LinkDatum>(this)
          .attr('stroke-opacity', 0.45)
          .attr('filter', null);
      });

    const nodesSel = g
      .append('g')
      .selectAll('g')
      .data(Array.from(nodePos.values()))
      .enter()
      .append('g')
      .attr('transform', (d) => `translate(${d.x},${d.y})`)
      .attr('class', 'cursor-pointer')
      .on('click', (event, d) => {
        event.stopPropagation();
        window.open(`https://solscan.io/account/${d.data.id}`, '_blank');
      })
      .on('mouseover', function (event, d) {
        setHoveredNode(d.data.id);
        d3.select<SVGGElement, PositionedNode>(event.currentTarget)
          .select('circle')
          .attr('filter', 'url(#glow)');
      })
      .on('mouseout', function (event) {
        setHoveredNode(null);
        d3.select<SVGGElement, PositionedNode>(event.currentTarget)
          .select('circle')
          .attr('filter', null);
      });

    nodesSel
      .append('circle')
      .attr('r', (d) => radiusFor(d.data))
      .attr('fill', (d) =>
        d.data.isStart ? '#10b981' : `url(#gradient-${Math.min(d.data.depth, 4)})`,
      )
      .attr('stroke', '#fff')
      .attr('stroke-width', 1.5);

    if (showLabels) {
      nodesSel
        .append('text')
        .attr('dy', (d) => radiusFor(d.data) + 14)
        .attr('text-anchor', 'middle')
        .attr('class', 'text-xs fill-current')
        .text((d) => displayName(d.data.id));

      nodesSel
        .append('text')
        .attr('y', (d) => {
          const r = radiusFor(d.data);
          const pad = 10;
          return r >= 26 ? -r + pad : -(r + pad);
        })
        .attr('dominant-baseline', 'hanging')
        .attr('text-anchor', 'middle')
        .attr('class', 'text-[10px] font-semibold')
        .style('fill', (d) => (radiusFor(d.data) >= 26 ? '#ffffff' : '#d1d5db'))
        .text((d) =>
          d.data.isStart
            ? 'START'
            : d.data.totalReceived > 0
              ? `+${formatNumber(d.data.totalReceived)}`
              : '',
        );
    }

    fitToContent(svg, g);
  };

  const drawForce = () => {
    if (!graphData.nodes.length || !svgRef.current) return;
    const prepared = prepareSvg();
    if (!prepared) return;
    const { svg, g } = prepared;

    const nodes: ForceNodeDatum[] = graphData.nodes.map((d) => ({ ...d }));
    const links: ForceLinkDatum[] = graphData.links.map((l) => ({ ...l }));
    const nodesById = new Map<string, ForceNodeDatum>();
    nodes.forEach((node) => nodesById.set(node.id, node));

    const simulation = d3.forceSimulation<ForceNodeDatum>(nodes);

    svg
      .append('defs')
      .append('marker')
      .attr('id', 'arrow')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 12)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', '#9ca3af');

    const linkSel = g
      .append('g')
      .selectAll<SVGLineElement, ForceLinkDatum>('line')
      .data(links)
      .enter()
      .append('line')
      .attr('stroke', (d) => linkColor(d.amount))
      .attr('stroke-width', (d) => linkWidth(d.amount))
      .attr('stroke-opacity', 0.5)
      .attr('marker-end', 'url(#arrow)');

    const nodeSel = g
      .append('g')
      .selectAll<SVGGElement, ForceNodeDatum>('g')
      .data(nodes)
      .enter()
      .append('g')
      .attr('class', 'cursor-pointer')
      .call(
        d3
          .drag<SVGGElement, ForceNodeDatum>()
          .on('start', (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on('drag', (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on('end', (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          }),
      )
      .on('click', (_event, d) => window.open(`https://solscan.io/account/${d.id}`, '_blank'))
      .on('mouseover', function (this: SVGGElement, _event, d) {
        setHoveredNode(d.id);
        d3.select(this).select('circle').attr('filter', 'url(#glow)');
      })
      .on('mouseout', function (this: SVGGElement) {
        setHoveredNode(null);
        d3.select(this).select('circle').attr('filter', null);
      });

    nodeSel
      .append('circle')
      .attr('r', (d) => radiusFor(d))
      .attr('fill', (d) => (d.isStart ? '#10b981' : `url(#gradient-${Math.min(d.depth, 4)})`))
      .attr('stroke', '#fff')
      .attr('stroke-width', 1.5);

    if (showLabels) {
      nodeSel
        .append('text')
        .attr('dy', (d) => radiusFor(d) + 12)
        .attr('text-anchor', 'middle')
        .attr('class', 'text-xs fill-current')
        .text((d) => displayName(d.id));
    }

    simulation
      .force(
        'link',
        d3
          .forceLink<ForceNodeDatum, ForceLinkDatum>(links)
          .id((d) => d.id)
          .distance((d) => 110 - Math.min(60, Math.log(d.amount + 1) * 8))
          .strength(0.12),
      )
      .force('charge', d3.forceManyBody<ForceNodeDatum>().strength(-220))
      .force('x', d3.forceX<ForceNodeDatum>(dimensions.width / 2).strength(0.06))
      .force('y', d3.forceY<ForceNodeDatum>(dimensions.height / 2).strength(0.06));

    if (avoidOverlap) {
      simulation.force(
        'collide',
        d3
          .forceCollide<ForceNodeDatum>()
          .radius((d) => radiusFor(d) + 2)
          .iterations(1),
      );
    } else {
      simulation.force('collide', null);
    }

    const resolveEndpoint = (endpoint: ForceLinkDatum['source']): ForceNodeDatum | undefined => {
      if (typeof endpoint === 'object' && endpoint !== null) {
        return endpoint as ForceNodeDatum;
      }
      if (typeof endpoint === 'string') {
        return nodesById.get(endpoint);
      }
      if (typeof endpoint === 'number') {
        return nodes[endpoint];
      }
      return undefined;
    };

    simulation.on('tick', () => {
      linkSel
        .attr('x1', (d) => resolveEndpoint(d.source)?.x ?? 0)
        .attr('y1', (d) => resolveEndpoint(d.source)?.y ?? 0)
        .attr('x2', (d) => resolveEndpoint(d.target)?.x ?? 0)
        .attr('y2', (d) => resolveEndpoint(d.target)?.y ?? 0);

      nodeSel.attr('transform', (d) => `translate(${d.x ?? 0},${d.y ?? 0})`);
    });

    setTimeout(() => fitToContent(svg, g), 500);
  };

  const drawSankey = () => {
    if (!graphData.nodes.length || !svgRef.current) return;
    const prepared = prepareSvg();
    if (!prepared) return;
    const { svg, g } = prepared;

    const margin = { top: 30, right: 30, bottom: 30, left: 30 };

    const sankey = d3Sankey<SankeyNodeLayout, SankeyLinkLayout>()
      .nodeId((d) => d.id)
      .nodeWidth(18)
      .nodePadding(14)
      .nodeAlign(sankeyCenter)
      .extent([
        [margin.left, margin.top],
        [dimensions.width - margin.right, dimensions.height - margin.bottom],
      ]);

    const graph = sankey({
      nodes: graphData.nodes.map((n) => ({ ...n })),
      links: graphData.links.map((l) => ({ source: l.source, target: l.target, value: l.amount })),
    }) as { nodes: SankeyNodeLayout[]; links: SankeyLinkLayout[] };

    const linkPath = sankeyLinkHorizontal<SankeyNodeLayout, SankeyLinkLayout>();

    g.append('g')
      .attr('fill', 'none')
      .selectAll<SVGPathElement, SankeyLinkLayout>('path')
      .data(graph.links)
      .enter()
      .append('path')
      .attr('d', linkPath)
      .attr('stroke', (d) => linkColor(d.value))
      .attr('stroke-width', (d) => Math.max(1, d.width))
      .attr('stroke-opacity', 0.4)
      .on('mouseover', function (this: SVGPathElement) {
        d3.select(this).attr('stroke-opacity', 0.9).attr('filter', 'url(#glow)');
      })
      .on('mouseout', function (this: SVGPathElement) {
        d3.select(this).attr('stroke-opacity', 0.4).attr('filter', null);
      });

    const node = g
      .append('g')
      .selectAll<SVGGElement, SankeyNodeLayout>('g')
      .data(graph.nodes)
      .enter()
      .append('g')
      .attr('class', 'cursor-pointer')
      .attr('transform', (d) => `translate(${d.x0},${d.y0})`)
      .on('click', (_event, d) => window.open(`https://solscan.io/account/${d.id}`, '_blank'))
      .on('mouseover', function (this: SVGGElement, _event, d) {
        setHoveredNode(d.id);
        d3.select(this).select('rect').attr('filter', 'url(#glow)');
      })
      .on('mouseout', function (this: SVGGElement) {
        setHoveredNode(null);
        d3.select(this).select('rect').attr('filter', null);
      });

    node
      .append('rect')
      .attr('height', (d) => Math.max(6, d.y1 - d.y0))
      .attr('width', (d) => Math.max(18, d.x1 - d.x0))
      .attr('fill', (d) => (d.isStart ? '#10b981' : `url(#gradient-${Math.min(d.depth ?? 3, 4)})`))
      .attr('stroke', '#fff')
      .attr('stroke-width', 1.2)
      .attr('rx', 6);

    if (showLabels) {
      node
        .append('text')
        .attr('x', (d) => (d.x0 < dimensions.width / 2 ? d.x1 - d.x0 + 8 : -8))
        .attr('y', (d) => (d.y1 - d.y0) / 2)
        .attr('dy', '0.32em')
        .attr('text-anchor', (d) => (d.x0 < dimensions.width / 2 ? 'start' : 'end'))
        .attr('class', 'text-xs fill-current')
        .text((d) => displayName(d.id));
    }

    fitToContent(svg, g);
  };

  useEffect(() => {
    if (!svgRef.current) return;
    if (!graphData.nodes.length) {
      const svg = d3.select(svgRef.current);
      svg.selectAll('*').remove();
      return;
    }

    if (viewMode === 'tree') drawTree();
    else if (viewMode === 'force') drawForce();
    else drawSankey();
  }, [graphData, dimensions, viewMode, showLabels, avoidOverlap]);

  useEffect(() => {
    if (!pendingKey) return;
    let cancelled = false;
    const interval = setInterval(async () => {
      try {
        const cached = await apiClient.getFlowCache(pendingKey!);
        if (!cached || !cached.cached) return;
        if (cancelled) return;
        const norm = normalizeFlowCache(cached);
        if (norm) setResult(norm);
        setStatusMsg(null);
        setPendingKey(null);
        pendingStartedAtRef.current = null;
      } catch {}
    }, 10000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [pendingKey]);

  const inlineStylesIntoSvg = (svg: SVGSVGElement) => {
    const clone = svg.cloneNode(true) as SVGSVGElement;
    const origNodes = svg.querySelectorAll('*');
    const cloneNodes = clone.querySelectorAll('*');
    const n = Math.min(origNodes.length, cloneNodes.length);
    for (let i = 0; i < n; i++) {
      const orig = origNodes[i];
      const node = cloneNodes[i] as Element & { style: CSSStyleDeclaration };
      const style = getComputedStyle(orig);
      const inline: Record<string, string | undefined> = {
        fill: style.fill,
        stroke: style.stroke,
        color: style.color,
        fontFamily: style.fontFamily,
        fontSize: style.fontSize,
        fontWeight: style.fontWeight,
        opacity: style.opacity,
        letterSpacing: style.letterSpacing,
        wordSpacing: style.wordSpacing,
        textAnchor: orig.getAttribute?.('text-anchor') ?? undefined,
      };
      Object.entries(inline).forEach(([key, value]) => {
        if (value !== undefined) node.style.setProperty(key, value);
      });
    }
    return clone;
  };

  const serializeSvg = (svg: SVGSVGElement, padding = 16) => {
    const content =
      (svg.querySelector(':scope > g') as SVGGElement) || (svg as unknown as SVGGElement);

    const applyMatrix = (matrix: DOMMatrix, x: number, y: number) => ({
      x: matrix.a * x + matrix.c * y + matrix.e,
      y: matrix.b * x + matrix.d * y + matrix.f,
    });

    let tight = { x: 0, y: 0, width: svg.clientWidth || 1200, height: svg.clientHeight || 800 };
    try {
      const b = typeof content.getBBox === 'function' ? content.getBBox() : null;
      if (
        b &&
        Number.isFinite(b.width) &&
        Number.isFinite(b.height) &&
        b.width >= 0 &&
        b.height >= 0
      ) {
        const matrix = typeof content.getCTM === 'function' ? content.getCTM() : null;
        if (matrix) {
          const p1 = applyMatrix(matrix, b.x, b.y);
          const p2 = applyMatrix(matrix, b.x + b.width, b.y);
          const p3 = applyMatrix(matrix, b.x, b.y + b.height);
          const p4 = applyMatrix(matrix, b.x + b.width, b.y + b.height);
          const minX = Math.min(p1.x, p2.x, p3.x, p4.x);
          const maxX = Math.max(p1.x, p2.x, p3.x, p4.x);
          const minY = Math.min(p1.y, p2.y, p3.y, p4.y);
          const maxY = Math.max(p1.y, p2.y, p3.y, p4.y);
          tight = {
            x: minX,
            y: minY,
            width: Math.max(1, maxX - minX),
            height: Math.max(1, maxY - minY),
          };
        } else {
          tight = { x: b.x, y: b.y, width: Math.max(1, b.width), height: Math.max(1, b.height) };
        }
      }
    } catch {}

    const vbX = Math.floor(tight.x - padding);
    const vbY = Math.floor(tight.y - padding);
    const vbWidth = Math.ceil(tight.width + padding * 2);
    const vbHeight = Math.ceil(tight.height + padding * 2);

    const working = inlineStylesIntoSvg(svg);
    working.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    working.setAttribute('viewBox', `${vbX} ${vbY} ${vbWidth} ${vbHeight}`);
    working.removeAttribute('width');
    working.removeAttribute('height');

    const serializer = new XMLSerializer();
    const svgStr = serializer.serializeToString(working);
    return { svgStr, viewBox: { x: vbX, y: vbY, width: vbWidth, height: vbHeight } };
  };

  const exportRasterFromSvg = async (opts?: {
    scale?: number;
    format?: 'png' | 'jpeg';
    background?: string;
    fileName?: string;
    quality?: number;
  }) => {
    if (!svgRef.current) return;
    const svg = svgRef.current as SVGSVGElement;
    const { svgStr, viewBox } = serializeSvg(svg);
    const scale = Math.max(1, Math.min(opts?.scale ?? 8, 16));
    let outW = Math.round(viewBox.width * scale);
    let outH = Math.round(viewBox.height * scale);
    const maxDim = 16384;
    const ratio = Math.min(1, maxDim / Math.max(outW, outH));
    if (ratio < 1) {
      outW = Math.floor(outW * ratio);
      outH = Math.floor(outH * ratio);
    }

    const blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    try {
      const img = new Image();
      img.decoding = 'async';
      const loaded = new Promise<HTMLImageElement>((resolve, reject) => {
        img.onload = () => resolve(img);
        img.onerror = reject;
      });
      img.src = url;
      await loaded;

      const canvas = document.createElement('canvas');
      canvas.width = outW;
      canvas.height = outH;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas 2D context not available');
      if (opts?.background) {
        ctx.fillStyle = opts.background;
        ctx.fillRect(0, 0, outW, outH);
      }
      ctx.drawImage(img, 0, 0, outW, outH);

      const format = opts?.format ?? 'png';
      const quality = opts?.quality ?? (format === 'jpeg' ? 0.95 : 1.0);
      const dataUrl = canvas.toDataURL(`image/${format}`, quality);

      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = (opts?.fileName || 'flow-diagram') + `-${outW}x${outH}.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } finally {
      URL.revokeObjectURL(url);
    }
  };

  const exportSvgFile = () => {
    if (!svgRef.current) return;
    const svg = svgRef.current as SVGSVGElement;
    const { svgStr } = serializeSvg(svg);
    const blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'flow-diagram.svg';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  async function sha256Hex(input: string) {
    const enc = new TextEncoder();
    const data = enc.encode(input);
    const digest = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }

  async function expectedKeyHash(p: TraceParams) {
    const norm = {
      start: p.start,
      startType: p.startType && p.startType !== 'auto' ? p.startType : 'wallet',
      addressType: p.addressType && p.addressType !== 'auto' ? p.addressType : 'owner',
      rpcUrl: p.rpcUrl,
      apiKey: p.apiKey ? 'HAS_KEY' : '',
      nosMint: p.nosMint || undefined,
      maxDepth: Number(p.maxDepth ?? 2),
      maxFanout: Number(p.maxFanout ?? 12),
      minAmount: Number(p.minAmount ?? 10),
      sinceDays: Number(p.sinceDays ?? 90),
      rpcBudget: Number(p.rpcBudget ?? 150),
      maxSigsPerWallet: Number(p.maxSigsPerWallet ?? 60),
    } as const;
    const str = JSON.stringify(norm);
    return await sha256Hex(str);
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    setWaitingLong(false);
    const longTimer = setTimeout(() => setWaitingLong(true), 5000);

    try {
      let params: TraceParams = {
        start: address.trim(),
        rpcUrl: rpcUrl.trim(),
        startType: startType || 'auto',
        addressType: addressType || 'auto',
        maxDepth,
        maxFanout,
        minAmount,
        sinceDays,
        ...(rpcBudgetMode === 'custom' ? { rpcBudget } : {}),
      };
      if (submitOverrideRef.current) {
        params = submitOverrideRef.current;
        submitOverrideRef.current = null;
      }
      if (!params.start || !params.rpcUrl) {
        const recentParams = result?.keyHash
          ? recentRuns.find((r) => r.keyHash === result.keyHash)?.params || null
          : null;
        const fallback = lastParamsUsed || recentParams;
        if (fallback) {
          params = { ...fallback, ...params };
        }
      }
      if (!params.start || !params.rpcUrl) {
        throw new Error('Missing start or rpcUrl');
      }
      const computedBudget = Number(params.rpcBudget ?? 150);
      const isHeavy =
        Number(params.maxDepth ?? 2) * Number(params.maxFanout ?? 12) >= 25 || computedBudget > 300;
      const postParams: TraceParams = {
        ...params,
        ...(!preferCache ? { forceFresh: true } : {}),
        ...(isHeavy ? { async: true } : {}),
      };
      setStatusMsg(null);
      const keyExpected = await expectedKeyHash(params);

      if (preferCache && !params.forceFresh) {
        try {
          const cached = await apiClient.getFlowCache(keyExpected, { stale: true });
          if (cached && cached.success && cached.cached) {
            const norm = normalizeFlowCache(cached);
            if (norm) setResult(norm);
            setStartNode(params.start);
            setLastParamsUsed(params);
            const entry = { keyHash: cached.keyHash, params, ts: Date.now() };
            const next = [entry, ...recentRuns.filter((r) => r.keyHash !== cached.keyHash)].slice(
              0,
              10,
            );
            setRecentRuns(next);
            try {
              localStorage.setItem('analysis.recent', JSON.stringify(next));
            } catch {}
            return;
          }
        } catch {}
      }

      const data = await apiClient.traceFlow(postParams);
      let effectiveData: FlowTraceResponse = data;

      if (data.accepted) {
        const key = data.keyHash;
        setPendingKey(key);
        pendingStartedAtRef.current = Date.now();
        let resultData: FlowTraceResponse | null = null;
        let jobUnsupported = false;

        for (let i = 0; i < 120; i++) {
          await new Promise((resolve) => setTimeout(resolve, 10000));
          try {
            const job = await apiClient.getFlowJob(key);
            if (
              job &&
              job.success &&
              ((job.found && job.status === 'done') || job.cacheReady === true)
            ) {
              const cached = await apiClient.getFlowCache(key);
              if (cached && cached.cached && cached.nodes && cached.links) {
                resultData = cached;
                break;
              }
            }
            if (job && job.success && job.found && job.status === 'error') {
              throw new Error(job?.meta?.error || 'Background job failed');
            }
          } catch {
            jobUnsupported = true;
            break;
          }
        }

        if (!resultData && jobUnsupported) {
          for (let i = 0; i < 120; i++) {
            await new Promise((resolve) => setTimeout(resolve, 10000));
            try {
              const cached = await apiClient.getFlowCache(key);
              if (cached && cached.cached && cached.nodes && cached.links) {
                resultData = cached;
                break;
              }
            } catch {}
          }
        }

        setPendingKey(null);
        pendingStartedAtRef.current = null;

        if (!resultData) {
          throw new Error("Analysis queued but not ready yet. Please try 'Use Cache' shortly.");
        }

        effectiveData = resultData;
      }

      if (!effectiveData.success) {
        throw new Error('Request failed');
      }

      const createdAtCandidate =
        typeof effectiveData.createdAt === 'string' ? effectiveData.createdAt : undefined;
      const normData = normalizeFlowCache(effectiveData) ?? {
        nodes: [],
        links: [],
        cached: effectiveData.cached,
        keyHash: effectiveData.keyHash,
        meta: effectiveData.meta,
        createdAt: createdAtCandidate,
      };
      setResult(normData);

      setStartNode(params.start);
      setLastParamsUsed(params);

      const entry = { keyHash: effectiveData.keyHash, params, ts: Date.now() };
      const next = [entry, ...recentRuns.filter((r) => r.keyHash !== effectiveData.keyHash)].slice(
        0,
        10,
      );
      setRecentRuns(next);
      try {
        localStorage.setItem('analysis.recent', JSON.stringify(next));
      } catch {}
    } catch (outerError) {
      setError(null);
      setStatusMsg(
        'This request is heavy and may still be processing. We’ll check for results automatically.',
      );
      try {
        const recentParams = result?.keyHash
          ? recentRuns.find((r) => r.keyHash === result.keyHash)?.params || null
          : null;
        const fallbackParams: TraceParams = {
          start: (address?.trim() || startNode || '').trim(),
          rpcUrl: rpcUrl.trim(),
          startType: startType || 'auto',
          addressType: addressType || 'auto',
          maxDepth,
          maxFanout,
          minAmount,
          sinceDays,
          ...(rpcBudgetMode === 'custom' ? { rpcBudget } : {}),
        };
        const base: TraceParams = lastParamsUsed ?? recentParams ?? fallbackParams;

        if (!base.start || !base.rpcUrl) throw new Error('Missing required params');

        let key = await expectedKeyHash(base);

        try {
          const kick = await apiClient.traceFlow({ ...base, async: true });
          if (kick && kick.accepted && kick.keyHash) {
            key = kick.keyHash;
          }
        } catch {}

        setPendingKey(key);
        pendingStartedAtRef.current = Date.now();
        let resultData: FlowTraceResponse | null = null;
        let jobUnsupported2 = false;
        for (let i = 0; i < 120; i++) {
          await new Promise((r) => setTimeout(r, 10000));
          try {
            const job = await apiClient.getFlowJob(key);
            if (
              job &&
              job.success &&
              ((job.found && job.status === 'done') || job.cacheReady === true)
            ) {
              const cached = await apiClient.getFlowCache(key);
              if (cached && cached.cached && cached.nodes && cached.links) {
                resultData = cached;
                break;
              }
            }
            if (job && job.success && job.found && job.status === 'error') {
              throw new Error(job?.meta?.error || 'Background job failed');
            }
          } catch {
            jobUnsupported2 = true;
            break;
          }
        }
        if (!resultData && jobUnsupported2) {
          for (let i = 0; i < 120; i++) {
            await new Promise((r) => setTimeout(r, 10000));
            try {
              const cached = await apiClient.getFlowCache(key);
              if (cached && cached.cached && cached.nodes && cached.links) {
                resultData = cached;
                break;
              }
            } catch {}
          }
        }
        setPendingKey(null);
        pendingStartedAtRef.current = null;
        if (!resultData) {
          setStatusMsg(null);
          setError(
            "This request is taking longer than usual. Please try 'Use Cache' from Recent or try again later.",
          );
        } else {
          const normRes = normalizeFlowCache(resultData);
          if (normRes) setResult(normRes);
          setStartNode(base.start);
          setLastParamsUsed(base);
          const entry = { keyHash: resultData.keyHash, params: base, ts: Date.now() };
          const next = [entry, ...recentRuns.filter((r) => r.keyHash !== resultData.keyHash)].slice(
            0,
            10,
          );
          setRecentRuns(next);
          try {
            localStorage.setItem('analysis.recent', JSON.stringify(next));
          } catch {}
          setStatusMsg(null);
        }
      } catch {
        setStatusMsg(null);
        const fallbackMessage = outerError instanceof Error ? outerError.message : undefined;
        setError(fallbackMessage || 'Network timeout. Please try again later.');
      }
    } finally {
      clearTimeout(longTimer);
      setWaitingLong(false);
      setLoading(false);
    }
  };

  const loadFromCache = async (keyHash: string) => {
    setError(null);
    setLoading(true);
    try {
      const data = await apiClient.getFlowCache(keyHash);
      if (!('success' in data) || !data.success) throw new Error('Cache fetch failed');
      const norm = normalizeFlowCache(data);
      if (norm) setResult(norm);
      const p = recentRuns.find((r) => r.keyHash === keyHash)?.params;
      if (p?.start) {
        setStartNode(p.start);
        setLastParamsUsed(p);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load cache';
      setError(message || 'Failed to load cache');
    } finally {
      setLoading(false);
    }
  };

  const loadParamsFromRecent = (keyHash: string) => {
    const p = recentRuns.find((r) => r.keyHash === keyHash)?.params;
    if (!p) return;
    setAddress(p.start);
    setRpcUrl(p.rpcUrl);
    setStartType(p.startType || 'auto');
    setAddressType(p.addressType || 'auto');
    setMaxDepth(p.maxDepth ?? maxDepth);
    setMaxFanout(p.maxFanout ?? maxFanout);
    setMinAmount(p.minAmount ?? minAmount);
    setSinceDays(p.sinceDays ?? sinceDays);
    if (typeof p.rpcBudget === 'number') {
      setRpcBudgetMode('custom');
      setRpcBudget(p.rpcBudget);
    } else {
      setRpcBudgetMode('auto');
    }
  };

  const continueAnalysis = async () => {
    if (!result) return;
    const recentParams = result?.keyHash
      ? recentRuns.find((r) => r.keyHash === result.keyHash)?.params || null
      : null;
    const fallbackParams: TraceParams = {
      start: (address?.trim() || startNode || '').trim(),
      rpcUrl: rpcUrl.trim(),
      startType: startType || 'auto',
      addressType: addressType || 'auto',
      maxDepth,
      maxFanout,
      minAmount,
      sinceDays,
      ...(rpcBudgetMode === 'custom' ? { rpcBudget } : {}),
    };
    const base: TraceParams = lastParamsUsed ?? recentParams ?? fallbackParams;
    if (!base.start) {
      alert('Missing start address. Load parameters from Recent first.');
      return;
    }
    const lastBudgetSource =
      lastParamsUsed?.rpcBudget ?? base.rpcBudget ?? (rpcBudgetMode === 'custom' ? rpcBudget : 300);
    const lastBudget = typeof lastBudgetSource === 'number' ? lastBudgetSource : 300;
    const suggested = Math.min(Math.max(400, Math.ceil(lastBudget * 1.5)), 5000);
    const input = window.prompt(
      `Enter RPC budget for the next run (50 - 5000):`,
      String(suggested),
    );
    if (input === null) return;
    let next = Number.parseInt(input, 10);
    if (!Number.isFinite(next)) {
      alert('Invalid number. Please try again.');
      return;
    }
    next = Math.min(Math.max(50, next), 5000);
    const p: TraceParams = { ...base, rpcBudget: next };
    const resumeFromKey = result?.keyHash || '';
    if (resumeFromKey) {
      submitOverrideRef.current = { ...p, resumeFromKey, async: true };
    } else {
      submitOverrideRef.current = { ...p, forceFresh: true, async: true };
    }
    await handleSubmit(new Event('submit') as unknown as React.FormEvent<HTMLFormElement>);
  };

  const refreshBypassCache = async () => {
    const prev = preferCache;
    setPreferCache(false);
    try {
      await handleSubmit(new Event('submit') as unknown as React.FormEvent<HTMLFormElement>);
    } finally {
      setPreferCache(prev);
    }
  };

  const buildShareUrlForKey = (keyHash: string) => {
    if (typeof window === 'undefined') return '';
    const url = new URL(window.location.href);
    url.searchParams.set('key', keyHash);
    url.searchParams.delete('params');
    return url.toString();
  };
  const buildShareUrlForParams = (p: TraceParams) => {
    if (typeof window === 'undefined') return '';
    const url = new URL(window.location.href);
    url.searchParams.delete('key');
    const payload = {
      start: p.start,
      rpcUrl: p.rpcUrl,
      startType: p.startType,
      addressType: p.addressType,
      maxDepth: p.maxDepth,
      maxFanout: p.maxFanout,
      minAmount: p.minAmount,
      sinceDays: p.sinceDays,
      rpcBudget: p.rpcBudget,
    };
    url.searchParams.set('params', btoa(encodeURIComponent(JSON.stringify(payload))));
    return url.toString();
  };
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setStatusMsg('Share link copied to clipboard.');
      setTimeout(() => setStatusMsg(null), 3000);
    } catch {}
  };

  const stats = useMemo(() => {
    if (!result) return null;
    const links = result.links;
    const nodesArr = result.nodes;
    const totalVolume = links.reduce((s, l) => s + (Number(l.amount) || 0), 0);
    const avgTransaction = totalVolume / (links.length || 1);
    const maxTransaction = Math.max(...links.map((l) => Number(l.amount) || 0), 0);
    const uniqueWallets = new Set([...links.map((l) => l.source), ...links.map((l) => l.target)])
      .size;
    return {
      totalVolume,
      avgTransaction,
      maxTransaction,
      uniqueWallets,
      nodeCount: nodesArr.length,
      linkCount: links.length,
      cached: result.cached,
      rpcUsed: result.meta?.rpcUsed || 0,
      depthReached: result.meta?.depthReached || 0,
      truncated: result.meta?.truncated || false,
    };
  }, [result]);

  return (
    <>
      <AnalysisLocaleNotice />
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight mb-2">{t('title')}</h1>
          <p className="text-muted-foreground">{t('subtitle')}</p>
        </div>

        {/* Search Form */}
        <div className="rounded-xl border bg-card p-6 mb-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2">{t('walletOrSignature')}</label>
              <div className="relative">
                <Wallet className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder={t('addressPlaceholder')}
                  className="w-full pl-10 pr-3 py-3 border rounded-lg bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                  <Filter className="w-3 h-3" />
                  {t('startType')}
                </label>
                <select
                  value={startType}
                  onChange={(e) => setStartType(e.target.value as TraceParams['startType'])}
                  className="w-full px-3 py-2 border rounded-lg bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  disabled={loading}
                >
                  <option value="auto">{t('auto')}</option>
                  <option value="wallet">{t('wallet')}</option>
                  <option value="signature">{t('signature')}</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                  <Database className="w-3 h-3" />
                  {t('addressType')}
                </label>
                <select
                  value={addressType}
                  onChange={(e) => setAddressType(e.target.value as TraceParams['addressType'])}
                  className="w-full px-3 py-2 border rounded-lg bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  disabled={loading}
                >
                  <option value="auto">{t('auto')}</option>
                  <option value="owner">{t('owner')}</option>
                  <option value="token">{t('tokenAccount')}</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                  <GitBranch className="w-3 h-3" />
                  {t('maxDepth')}
                </label>
                <input
                  type="number"
                  value={maxDepth}
                  onChange={(e) => setMaxDepth(Number(e.target.value))}
                  min={1}
                  max={10}
                  className="w-full px-3 py-2 border rounded-lg bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                  <Network className="w-3 h-3" />
                  {t('maxFanout')}
                </label>
                <input
                  type="number"
                  value={maxFanout}
                  onChange={(e) => setMaxFanout(Number(e.target.value))}
                  min={1}
                  max={100}
                  className="w-full px-3 py-2 border rounded-lg bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                  <Clock className="w-3 h-3" />
                  {t('sinceDays')}
                </label>
                <input
                  type="number"
                  value={sinceDays}
                  onChange={(e) => setSinceDays(Number(e.target.value))}
                  min={1}
                  max={3605}
                  className="w-full px-3 py-2 border rounded-lg bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  disabled={loading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                  <DollarSign className="w-3 h-3" />
                  {t('minAmount')}
                </label>
                <input
                  type="number"
                  value={minAmount}
                  onChange={(e) => setMinAmount(Number(e.target.value))}
                  min={0}
                  step="0.01"
                  className="w-full px-3 py-2 border rounded-lg bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  disabled={loading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                  <Zap className="w-3 h-3" />
                  {t('rpcUrl')}
                </label>
                <input
                  type="text"
                  value={rpcUrl}
                  onChange={(e) => setRpcUrl(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  disabled={loading}
                />
              </div>
              {/* RPC Budget selector */}
              <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                    <Database className="w-3 h-3" />
                    RPC Budget
                  </label>
                  <select
                    value={rpcBudgetMode}
                    onChange={(e) =>
                      setRpcBudgetMode(e.target.value === 'custom' ? 'custom' : 'auto')
                    }
                    className="w-full px-3 py-2 border rounded-lg bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    disabled={loading}
                  >
                    <option value="auto">Auto</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-2">
                    Max RPC calls (when Custom)
                  </label>
                  <input
                    type="number"
                    value={rpcBudget}
                    onChange={(e) => setRpcBudget(Math.max(1, Number(e.target.value)))}
                    min={1}
                    step={1}
                    className="w-full px-3 py-2 border rounded-lg bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all disabled:opacity-60"
                    disabled={loading || rpcBudgetMode !== 'custom'}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Auto uses backend defaults; Custom lets you raise the cap (e.g., 1000).
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <button
                type="submit"
                disabled={loading || !address}
                className={cn(
                  'px-6 py-3 rounded-lg font-medium flex items-center gap-2 transition-all',
                  'bg-primary text-primary-foreground hover:bg-primary/90',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                )}
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Search className="w-4 h-4" />
                )}
                {t('analyze')}
              </button>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="accent-primary"
                    checked={preferCache}
                    onChange={(e) => setPreferCache(e.target.checked)}
                    disabled={loading}
                  />
                  Use cache (faster)
                </label>
                <button
                  type="button"
                  onClick={() => setShowInfo((v) => !v)}
                  className="px-3 py-2 rounded-lg border hover:bg-muted text-sm"
                  title="Show info"
                >
                  <Info className="w-4 h-4 inline mr-1" /> Info
                </button>
              </div>
              {error && (
                <div className="flex items-center text-sm text-red-500 gap-2">
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </div>
              )}
            </div>
            {loading && waitingLong && (
              <div className="mt-4 rounded-md border border-amber-300 bg-amber-50 text-amber-800 p-3 text-sm">
                This analysis is still running. Higher depth/fanout or budget may take over a
                minute. Keep this page open; results will appear automatically.
              </div>
            )}
            {statusMsg && (
              <div className="mt-3 rounded-md border border-blue-300 bg-blue-50 text-blue-800 p-3 text-sm">
                {statusMsg}
              </div>
            )}
          </form>
        </div>

        {/* Export Controls */}
        <div className="flex items-center gap-3 mb-4">
          <button
            type="button"
            className="inline-flex items-center gap-2 px-3 py-2 rounded-md border bg-background hover:bg-accent transition"
            onClick={() =>
              exportRasterFromSvg({
                scale: 8,
                format: 'png',
                background: '#0b0f14',
                fileName: 'flow-ultra',
              })
            }
            title="Download Ultra HD PNG (8x)"
          >
            <Download className="w-4 h-4" />
            <span>Download PNG (Ultra HD)</span>
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-2 px-3 py-2 rounded-md border bg-background hover:bg-accent transition"
            onClick={() =>
              exportRasterFromSvg({
                scale: 8,
                format: 'jpeg',
                background: '#ffffff',
                fileName: 'flow-ultra',
              })
            }
            title="Download Ultra HD JPEG (8x)"
          >
            <Download className="w-4 h-4" />
            <span>Download JPEG (Ultra HD)</span>
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-2 px-3 py-2 rounded-md border bg-background hover:bg-accent transition"
            onClick={exportSvgFile}
            title="Download as SVG (Vector)"
          >
            <Download className="w-4 h-4" />
            <span>Download SVG</span>
          </button>
        </div>

        {/* Help & Docs */}
        <div className="rounded-xl border bg-card overflow-hidden mb-6">
          <div className="bg-gradient-to-r from-primary/15 via-transparent to-transparent px-5 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-primary" />
              <span className="font-semibold">Help & Docs</span>
              <span className="ml-2 text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                Updated
              </span>
            </div>
            <button
              className={cn(
                'text-sm px-2 py-1 rounded border hover:bg-muted inline-flex items-center gap-1',
                showDocs ? 'opacity-90' : '',
              )}
              onClick={() => setShowDocs(!showDocs)}
            >
              <HelpCircle className="w-4 h-4" /> {showDocs ? 'Hide' : 'Show'}
            </button>
          </div>
          {showDocs && (
            <div className="p-5">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Quick Start */}
                <div className="rounded-lg border bg-background p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="w-4 h-4 text-amber-500" />
                    <h3 className="font-semibold">Quick Start</h3>
                  </div>
                  <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                    <li>Paste a wallet address or a transaction signature.</li>
                    <li>
                      Pick depth/fanout and filters. Leave <b>Use cache</b> on for faster load.
                    </li>
                    <li>
                      Click <b>Analyze</b>. Heavy runs may queue; the app polls automatically.
                    </li>
                  </ol>
                </div>

                {/* Form Fields */}
                <div className="rounded-lg border bg-background p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Settings className="w-4 h-4 text-sky-500" />
                    <h3 className="font-semibold">Form</h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="font-medium">Wallet/Signature</span>
                      <div className="text-muted-foreground">Start node for the trace.</div>
                    </div>
                    <div>
                      <span className="font-medium">Start Type</span>
                      <div className="text-muted-foreground">Auto, or force Wallet/Signature.</div>
                    </div>
                    <div>
                      <span className="font-medium">Address Type</span>
                      <div className="text-muted-foreground">Owner vs Token Account.</div>
                    </div>
                    <div>
                      <span className="font-medium">Max Depth</span>
                      <div className="text-muted-foreground">Hops from the start node.</div>
                    </div>
                    <div>
                      <span className="font-medium">Max Fanout</span>
                      <div className="text-muted-foreground">Unique neighbors per node.</div>
                    </div>
                    <div>
                      <span className="font-medium">Since Days</span>
                      <div className="text-muted-foreground">Lookback window.</div>
                    </div>
                    <div>
                      <span className="font-medium">Min Amount</span>
                      <div className="text-muted-foreground">Filter tiny transfers.</div>
                    </div>
                    <div>
                      <span className="font-medium">RPC URL</span>
                      <div className="text-muted-foreground">Your Solana RPC endpoint.</div>
                    </div>
                    <div className="sm:col-span-2">
                      <span className="font-medium">RPC Budget</span>
                      <div className="text-muted-foreground">
                        Auto defaults; Custom sets a hard cap. If truncated, try <i>Continue</i> or
                        raise budget.
                      </div>
                    </div>
                  </div>
                </div>

                {/* Controls & Buttons */}
                <div className="rounded-lg border bg-background p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <RefreshCw className="w-4 h-4 text-emerald-500" />
                    <h3 className="font-semibold">Controls & Buttons</h3>
                  </div>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>
                      <b>Analyze</b>: Run the trace (heavy runs may queue).
                    </li>
                    <li>
                      <b>Info</b>: Run status, RPC calls, truncation, depth reached.
                    </li>
                    <li>
                      <b>Use cache</b>: Show cached result first with timestamp.
                    </li>
                    <li>
                      <b>Refresh</b>: Bypass cache and recompute now.
                    </li>
                    <li>
                      <b>Continue</b>: Raise RPC budget to extend a truncated run.
                    </li>
                    <li>
                      <b>Recent</b>: Load params or reuse a cached result.
                    </li>
                  </ul>
                </div>

                {/* Visualization */}
                <div className="rounded-lg border bg-background p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Layers className="w-4 h-4 text-violet-500" />
                    <h3 className="font-semibold">Visualization</h3>
                  </div>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>
                      <b>Tree / Force / Sankey</b>: Three layouts of the same graph.
                    </li>
                    <li>
                      <b>Nodes</b>: Click to open Solscan; hover for details.
                    </li>
                    <li>
                      <b>Toolbar</b>: Zoom in/out, reset, toggle labels.
                    </li>
                    <li>
                      <b>No overlap</b>: Space nodes to avoid overlaps (may expand layout).
                    </li>
                    <li>
                      <b>Top Transactions</b>: Highest value edges with Solscan links (if signatures
                      available).
                    </li>
                  </ul>
                </div>

                {/* Caching */}
                <div className="rounded-lg border bg-background p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Database className="w-4 h-4 text-indigo-500" />
                    <h3 className="font-semibold">Caching & Freshness</h3>
                  </div>
                  <div className="text-sm text-muted-foreground space-y-2">
                    <div className="rounded-md border border-amber-300 bg-amber-50/80 text-amber-900 px-3 py-2">
                      Default TTL is <b>24h</b>. With <b>Use cache</b> enabled, the app shows the
                      latest cached result first (timestamped), then you can <b>Refresh</b> to
                      recompute.
                    </div>
                    <ul className="list-disc list-inside space-y-1">
                      <li>
                        Disable <b>Use cache</b> to bypass cache entirely.
                      </li>
                      <li>Heavy runs return 202 Accepted; we poll up to ~10 minutes.</li>
                    </ul>
                  </div>
                </div>

                {/* Aliases & Tips */}
                <div className="rounded-lg border bg-background p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Info className="w-4 h-4 text-cyan-500" />
                    <h3 className="font-semibold">Aliases & Tips</h3>
                  </div>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>
                      Known wallets render with friendly names; otherwise, we show shortened
                      addresses.
                    </li>
                    <li>
                      Edit <code>lib/aliases.ts</code> to add more.
                    </li>
                    <li>
                      If you see <b>truncated</b>, increase RPC Budget or reduce fanout.
                    </li>
                    <li>Depth × Fanout grows quickly—balance for clarity.</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Recent */}
        {recentRuns.length > 0 && (
          <div className="rounded-xl border bg-card p-4 mb-6">
            <div className="flex items-center justify-between mb-3">
              <div className="font-semibold">Recent Analyses</div>
              <button
                className="text-xs text-muted-foreground hover:underline"
                onClick={() => {
                  setRecentRuns([]);
                  try {
                    localStorage.removeItem('analysis.recent');
                  } catch {}
                }}
              >
                Clear
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {recentRuns.map((r) => (
                <div
                  key={r.keyHash}
                  className="border rounded-lg px-3 py-2 text-xs bg-background flex items-center gap-2"
                >
                  <span className="font-mono">
                    {r.params.start.slice(0, 6)}...{r.params.start.slice(-4)}
                  </span>
                  <span className="text-muted-foreground">·</span>
                  <span>depth {r.params.maxDepth ?? '-'}</span>
                  <span className="text-muted-foreground">·</span>
                  <span>{new Date(r.ts).toLocaleString()}</span>
                  <button
                    className="ml-2 px-2 py-1 rounded bg-muted hover:bg-muted/80"
                    onClick={() => loadFromCache(r.keyHash)}
                  >
                    Use Cache
                  </button>
                  <button
                    className="px-2 py-1 rounded bg-primary text-primary-foreground hover:bg-primary/90"
                    onClick={() => loadParamsFromRecent(r.keyHash)}
                  >
                    Load Params
                  </button>
                  <button
                    className="px-2 py-1 rounded bg-emerald-600 text-white hover:bg-emerald-700"
                    onClick={() => copyToClipboard(buildShareUrlForKey(r.keyHash))}
                    title="Copy share link (use cache)"
                  >
                    Share
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Results */}
        {result && stats && (
          <>
            {/* Cache info and actions */}
            {result.cached && (
              <div className="rounded-lg border bg-muted/20 p-3 mb-4 text-sm flex items-center justify-between">
                <div>
                  Showing cached result
                  {result.createdAt ? ` from ${new Date(result.createdAt).toLocaleString()}` : ''}.
                </div>
                <div className="flex items-center gap-2">
                  <button
                    className="px-3 py-2 rounded bg-primary text-primary-foreground hover:bg-primary/90"
                    onClick={refreshBypassCache}
                    disabled={loading}
                  >
                    Refresh (bypass cache)
                  </button>
                </div>
              </div>
            )}
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
              <div className="rounded-lg border bg-card p-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <Activity className="w-3 h-3" /> Total Volume
                </div>
                <div className="text-2xl font-bold">{formatNumber(stats.totalVolume)}</div>
                <div className="text-xs text-muted-foreground">NOS</div>
              </div>
              <div className="rounded-lg border bg-card p-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <GitBranch className="w-3 h-3" /> Nodes
                </div>
                <div className="text-2xl font-bold">{stats.nodeCount}</div>
                <div className="text-xs text-muted-foreground">wallets</div>
              </div>
              <div className="rounded-lg border bg-card p-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <ArrowRight className="w-3 h-3" /> Flows
                </div>
                <div className="text-2xl font-bold">{stats.linkCount}</div>
                <div className="text-xs text-muted-foreground">transactions</div>
              </div>
              <div className="rounded-lg border bg-card p-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <Hash className="w-3 h-3" /> Avg Size
                </div>
                <div className="text-2xl font-bold">{formatNumber(stats.avgTransaction)}</div>
                <div className="text-xs text-muted-foreground">NOS/tx</div>
              </div>
              <div className="rounded-lg border bg-card p-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <TrendingUp className="w-3 h-3" /> Max Flow
                </div>
                <div className="text-2xl font-bold">{formatCompact(stats.maxTransaction)}</div>
                <div className="text-xs text-muted-foreground">NOS</div>
              </div>
              <div className="rounded-lg border bg-card p-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <Info className="w-3 h-3" /> RPC Calls
                </div>
                <div className="text-2xl font-bold">{stats.rpcUsed}</div>
                <div className="text-xs text-muted-foreground">
                  {stats.cached && <span className="text-green-500">cached</span>}
                  {stats.truncated && <span className="text-yellow-500">truncated</span>}
                  {!stats.cached && !stats.truncated && <span>fresh</span>}
                  {result?.cached && result?.createdAt && (
                    <span className="ml-2">· {new Date(result.createdAt).toLocaleString()}</span>
                  )}
                </div>
              </div>
            </div>
            {stats.truncated && (
              <div className="rounded-lg border bg-amber-50 text-amber-900 p-4 mb-4 text-sm flex items-center justify-between">
                <div>
                  The previous run was truncated (depth or budget limits). You can continue with a
                  higher RPC budget.
                </div>
                <button
                  className="px-3 py-2 rounded bg-primary text-primary-foreground hover:bg-primary/90"
                  onClick={continueAnalysis}
                  disabled={loading}
                >
                  Continue (increase budget)
                </button>
              </div>
            )}

            {/* Visualization */}
            <div className="rounded-xl border bg-card overflow-hidden">
              <div className="border-b bg-muted/30 px-6 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold">{t('flowDiagram')}</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      Interactive visualization • {stats.nodeCount} nodes • {stats.linkCount} flows
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex items-center rounded-lg border bg-background p-1">
                      <button
                        onClick={() => setViewMode('tree')}
                        className={cn(
                          'px-3 py-1 rounded text-sm transition-all',
                          viewMode === 'tree'
                            ? 'bg-primary text-primary-foreground'
                            : 'hover:bg-muted',
                        )}
                      >
                        Tree
                      </button>
                      <button
                        onClick={() => setViewMode('force')}
                        className={cn(
                          'px-3 py-1 rounded text-sm transition-all',
                          viewMode === 'force'
                            ? 'bg-primary text-primary-foreground'
                            : 'hover:bg-muted',
                        )}
                      >
                        Force
                      </button>
                      <button
                        onClick={() => setViewMode('sankey')}
                        className={cn(
                          'px-3 py-1 rounded text-sm transition-all',
                          viewMode === 'sankey'
                            ? 'bg-primary text-primary-foreground'
                            : 'hover:bg-muted',
                        )}
                      >
                        Sankey
                      </button>
                    </div>

                    <div className="flex items-center gap-1 border rounded-lg bg-background p-1">
                      <button
                        onClick={() => window.zoomInFlow?.()}
                        className="p-1.5 rounded hover:bg-muted transition-colors"
                        title="Zoom In"
                      >
                        <ZoomIn className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => window.zoomOutFlow?.()}
                        className="p-1.5 rounded hover:bg-muted transition-colors"
                        title="Zoom Out"
                      >
                        <ZoomOut className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => window.resetZoomFlow?.()}
                        className="p-1.5 rounded hover:bg-muted transition-colors"
                        title="Reset View"
                      >
                        <Maximize2 className="w-4 h-4" />
                      </button>
                      <div className="w-px h-6 bg-border mx-1" />
                      <button
                        onClick={() => setShowLabels(!showLabels)}
                        className="p-1.5 rounded hover:bg-muted transition-colors"
                        title="Toggle Labels"
                      >
                        {showLabels ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      </button>
                    </div>

                    {/* Overlap control */}
                    <label className="ml-2 text-xs inline-flex items-center gap-2 select-none">
                      <input
                        type="checkbox"
                        className="accent-primary"
                        checked={avoidOverlap}
                        onChange={(e) => setAvoidOverlap(e.target.checked)}
                      />
                      No overlap
                    </label>

                    {/* Share current */}
                    {result && (
                      <button
                        className="ml-2 px-3 py-1.5 rounded bg-emerald-600 text-white text-sm hover:bg-emerald-700"
                        onClick={() => {
                          if (result.cached) {
                            copyToClipboard(buildShareUrlForKey(result.keyHash));
                            return;
                          }
                          const fallbackParams: TraceParams = {
                            start: address.trim(),
                            rpcUrl: rpcUrl.trim(),
                            startType,
                            addressType,
                            maxDepth,
                            maxFanout,
                            minAmount,
                            sinceDays,
                            ...(rpcBudgetMode === 'custom' ? { rpcBudget } : {}),
                          };
                          const paramsForShare = lastParamsUsed ?? fallbackParams;
                          copyToClipboard(buildShareUrlForParams(paramsForShare));
                        }}
                        title={
                          result?.cached
                            ? 'Copy link to load from cache'
                            : 'Copy link that loads the form'
                        }
                      >
                        Share
                      </button>
                    )}

                    <span className="text-xs text-muted-foreground px-2">
                      {(zoomLevel * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
              </div>

              <div ref={containerRef} className="relative w-full">
                {/* Full-bleed background that always fills the container */}
                <div
                  className="absolute inset-0 -z-10 pointer-events-none"
                  style={{
                    background: 'radial-gradient(120% 120% at 50% 50%, #0b1220 0%, #05080f 100%)',
                  }}
                />
                <svg
                  ref={svgRef}
                  width={dimensions.width}
                  height={dimensions.height}
                  className="w-full cursor-move block"
                  style={{ touchAction: 'none' }}
                />

                {/* Hover card */}
                {hoveredNode && (
                  <div className="absolute top-4 left-4 bg-background/95 backdrop-blur-sm border rounded-lg shadow-lg p-4 max-w-sm pointer-events-none">
                    {(() => {
                      const node = graphData.nodes.find((n) => n.id === hoveredNode);
                      if (!node) return null;
                      return (
                        <>
                          <div className="font-semibold mb-2">
                            {node.isStart ? '🎯 Start Node' : `Node Details`}
                          </div>
                          <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Address:</span>
                              <span className="font-mono">{displayName(node.id)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Depth:</span>
                              <span>{node.depth}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Received:</span>
                              <span className="text-green-500">
                                {formatNumber(node.totalReceived)} NOS
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Sent:</span>
                              <span className="text-red-500">
                                {formatNumber(node.totalSent)} NOS
                              </span>
                            </div>
                            <div className="flex justify-between font-semibold pt-1 border-t">
                              <span className="text-muted-foreground">Net:</span>
                              <span
                                className={node.netFlow >= 0 ? 'text-green-500' : 'text-red-500'}
                              >
                                {node.netFlow >= 0 ? '+' : ''}
                                {formatNumber(node.netFlow)} NOS
                              </span>
                            </div>
                          </div>
                          <div className="text-xs text-muted-foreground mt-2">
                            Click to view on Solscan
                          </div>
                        </>
                      );
                    })()}
                  </div>
                )}

                {/* Info panel */}
                {showInfo && result && (
                  <div className="absolute top-4 right-4 bg-background/95 backdrop-blur-sm border rounded-lg shadow-lg p-4 w-80">
                    <div className="font-semibold mb-2">Run Info</div>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span>Status:</span>
                        <span>{result.cached ? 'Cached' : 'Live'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Truncated:</span>
                        <span>{result.meta?.truncated ? 'Yes' : 'No'}</span>
                      </div>
                      {result.meta?.depthReached !== undefined && (
                        <div className="flex justify-between">
                          <span>Depth Reached:</span>
                          <span>{String(result.meta.depthReached)}</span>
                        </div>
                      )}
                      {result.meta?.rpcUsed !== undefined && (
                        <div className="flex justify-between">
                          <span>RPC Calls:</span>
                          <span>{result.meta.rpcUsed}</span>
                        </div>
                      )}
                    </div>
                    {result.meta?.truncated && (
                      <div className="mt-3">
                        <button
                          className="w-full px-3 py-2 rounded bg-primary text-primary-foreground hover:bg-primary/90 text-sm"
                          onClick={() => setMaxDepth((d) => Math.min(10, d + 1))}
                        >
                          Continue (increase depth)
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Legend */}
                <div className="absolute bottom-4 right-4 bg-background/95 backdrop-blur-sm border rounded-lg p-3 text-xs">
                  <div className="font-semibold mb-2">Legend</div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-emerald-500" />
                      <span>Start</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-sky-500" />
                      <span>Depth 1</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-violet-500" />
                      <span>Depth 2</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-fuchsia-500" />
                      <span>Depth 3+</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Transactions */}
            <div className="rounded-xl border bg-card mt-6 overflow-hidden">
              <div className="border-b bg-muted/30 px-6 py-4">
                <h3 className="text-lg font-semibold">Top Transactions</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b bg-muted/20">
                    <tr>
                      <th className="text-left px-6 py-3 text-sm font-medium">From</th>
                      <th className="text-left px-6 py-3 text-sm font-medium">To</th>
                      <th className="text-right px-6 py-3 text-sm font-medium">Amount</th>
                      <th className="text-center px-6 py-3 text-sm font-medium">Time</th>
                      <th className="text-center px-6 py-3 text-sm font-medium">Transaction</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {(Array.isArray(result.links) ? result.links : [])
                      .slice()
                      .sort((a, b) => b.amount - a.amount)
                      .slice(0, 10)
                      .map((link, idx) => (
                        <tr key={idx} className="hover:bg-muted/30 transition-colors">
                          <td className="px-6 py-4">
                            <a
                              href={`https://solscan.io/account/${link.source}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-mono text-sm hover:text-primary inline-flex items-center gap-1"
                            >
                              {displayName(link.source)}
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </td>
                          <td className="px-6 py-4">
                            <a
                              href={`https://solscan.io/account/${link.target}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-mono text-sm hover:text-primary inline-flex items-center gap-1"
                            >
                              {displayName(link.target)}
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </td>
                          <td className="text-right px-6 py-4">
                            <span className="font-semibold">{formatNumber(link.amount)}</span>
                            <span className="text-muted-foreground text-sm ml-1">NOS</span>
                          </td>
                          <td className="text-center px-6 py-4 text-sm text-muted-foreground">
                            {link.ts ? new Date(link.ts * 1000).toLocaleDateString() : '-'}
                          </td>
                          <td className="text-center px-6 py-4">
                            {link.signature ? (
                              <a
                                href={`https://solscan.io/tx/${link.signature}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                              >
                                View <ExternalLink className="w-3 h-3" />
                              </a>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}

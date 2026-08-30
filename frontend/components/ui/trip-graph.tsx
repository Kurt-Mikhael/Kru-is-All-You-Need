"use client"

export type GraphNode = {
  id: number
  title: string
  booking_type: string
  start_time: string
  status: string
}

export type GraphEdge = {
  source: number
  target: number
  relation_type: string
}

export type TripGraphData = {
  trip_id: number
  nodes: GraphNode[]
  edges: GraphEdge[]
}

const GRAPH_WIDTH = 640
const NODE_WIDTH = 270
const NODE_HEIGHT = 76
const COLUMN_GAP = 60
const ROW_GAP = 22
const LEFT_PADDING = 20
const TOP_PADDING = 24
const NODE_TITLE_LEFT_PADDING = 14
const NODE_TITLE_RIGHT_PADDING = 14
const AFFECTED_LABEL_RESERVED_WIDTH = 76
const MAX_NODE_TITLE_LENGTH = 34

function nodePosition(index: number) {
  const column = index % 2
  const row = Math.floor(index / 2)
  return {
    x: LEFT_PADDING + column * (NODE_WIDTH + COLUMN_GAP),
    y: TOP_PADDING + row * (NODE_HEIGHT + ROW_GAP),
  }
}
function nodeEdgePoint(node: { x: number; y: number }, toward: { x: number; y: number }) {
  const centerX = node.x + NODE_WIDTH / 2
  const centerY = node.y + NODE_HEIGHT / 2
  const dx = toward.x - centerX
  const dy = toward.y - centerY
  const scale = Math.min(
    dx === 0 ? Number.POSITIVE_INFINITY : NODE_WIDTH / 2 / Math.abs(dx),
    dy === 0 ? Number.POSITIVE_INFINITY : NODE_HEIGHT / 2 / Math.abs(dy),
  )
  return { x: centerX + dx * scale, y: centerY + dy * scale }
}

function selfLoopPath(node: { x: number; y: number }) {
  const startX = node.x + NODE_WIDTH / 3
  const endX = node.x + (NODE_WIDTH * 2) / 3
  const controlY = node.y - 24
  return `M ${startX} ${node.y} C ${startX} ${controlY}, ${endX} ${controlY}, ${endX} ${node.y}`
}

function graphDescription(graph: TripGraphData) {
  const titles = new Map(graph.nodes.map((node) => [node.id, node.title]))
  const nodes = graph.nodes.length
    ? graph.nodes.map((node) => `${node.title} (${node.booking_type}, ${node.status}, starts ${node.start_time})`).join("; ")
    : "none"
  const dependencies = graph.edges.length
    ? graph.edges
        .map((edge) => `${titles.get(edge.source) ?? `Booking ${edge.source}`} ${edge.relation_type} ${titles.get(edge.target) ?? `Booking ${edge.target}`}`)
        .join("; ")
    : "none"
  return `Trip ${graph.trip_id} dependency graph. Nodes: ${nodes}. Directed dependencies: ${dependencies}.`
}

export function TripGraph({ graph, affectedBookingIds = [] }: { graph: TripGraphData | null; affectedBookingIds?: number[] }): JSX.Element {
  if (!graph) {
    return (
      <section className="card p-4" aria-label="Trip dependency graph">
        <h2 className="text-[13px] font-extrabold uppercase tracking-widest text-[var(--navy)]">Trip dependency graph</h2>
        <p className="mt-3 rounded-xl border border-dashed bg-[var(--surface-2)] p-5 text-center text-[13px] text-muted-foreground">No trip dependency data available.</p>
      </section>
    )
  }

  const rows = Math.max(1, Math.ceil(graph.nodes.length / 2))
  const graphHeight = TOP_PADDING + rows * NODE_HEIGHT + (rows - 1) * ROW_GAP + TOP_PADDING
  const positions = new Map(graph.nodes.map((node, index) => [node.id, nodePosition(index)]))
  const affected = new Set(affectedBookingIds)
  const titles = new Map(graph.nodes.map((node) => [node.id, node.title]))
  const missingEdges = graph.edges.filter((edge) => !positions.has(edge.source) || !positions.has(edge.target))
  const descriptionId = `trip-graph-description-${graph.trip_id}`

  return (
    <section className="card p-4" aria-label={`Trip dependency graph for trip ${graph.trip_id}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-[13px] font-extrabold uppercase tracking-widest text-[var(--navy)]">Trip dependency graph</h2>
        <span className="text-[11px] text-muted-foreground">{graph.nodes.length} bookings · {graph.edges.length} dependencies</span>
      </div>
      <p id={descriptionId} className="sr-only">{graphDescription(graph)}</p>
      {missingEdges.length > 0 && (
        <p className="mt-3 rounded-xl border border-dashed border-amber-300 bg-amber-50 p-3 text-[12px] text-amber-950" role="status">
          Some dependencies could not be displayed: {missingEdges.map((edge) => `${titles.get(edge.source) ?? `Booking ${edge.source}`} ${edge.relation_type} ${titles.get(edge.target) ?? `Booking ${edge.target}`}`).join("; ")}.
        </p>
      )}
      {graph.nodes.length === 0 ? (
        <p className="mt-3 rounded-xl border border-dashed bg-[var(--surface-2)] p-5 text-center text-[13px] text-muted-foreground">No bookings in this trip.</p>
      ) : (
        <div className="mt-3 overflow-x-auto rounded-xl border bg-[var(--surface-2)]" tabIndex={0} aria-label="Scrollable trip dependency graph">
          <svg className="h-auto min-w-[600px] w-full" viewBox={`0 0 ${GRAPH_WIDTH} ${graphHeight}`} role="img" aria-label={`Dependencies for trip ${graph.trip_id}`} aria-describedby={descriptionId}>
            <title>Trip booking dependencies</title>
            <defs>
              <marker id="trip-graph-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto" markerUnits="strokeWidth">
                <path d="M0,0 L8,4 L0,8 z" fill="currentColor" />
              </marker>
              {graph.nodes.map((node, index) => {
                const { x, y } = nodePosition(index)
                const isAffected = affected.has(node.id)
                const titleWidth = NODE_WIDTH - NODE_TITLE_LEFT_PADDING - NODE_TITLE_RIGHT_PADDING - (isAffected ? AFFECTED_LABEL_RESERVED_WIDTH : 0)
                return (
                  <clipPath key={node.id} id={`trip-graph-title-clip-${graph.trip_id}-${node.id}`} clipPathUnits="userSpaceOnUse">
                    <rect x={x + NODE_TITLE_LEFT_PADDING} y={y + 6} width={titleWidth} height="20" />
                  </clipPath>
                )
              })}
            </defs>
            <g aria-label="Dependency edges">
              {graph.edges.map((edge, index) => {
                const source = positions.get(edge.source)
                const target = positions.get(edge.target)
                if (!source || !target) return null
                const edgeLabel = `${edge.relation_type}: ${edge.source} to ${edge.target}`
                const isSelfLoop = edge.source === edge.target
                if (isSelfLoop) {
                  return (
                    <g key={`${edge.source}-${edge.target}-${edge.relation_type}-${index}`} aria-label={edgeLabel}>
                      <path d={selfLoopPath(source)} data-edge-kind="self-loop" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="6 4" markerEnd="url(#trip-graph-arrow)" />
                      <text x={source.x + NODE_WIDTH / 2} y={source.y - 6} textAnchor="middle" className="fill-current text-[10px] font-semibold">{edge.relation_type}</text>
                    </g>
                  )
                }
                const sourceCenter = { x: source.x + NODE_WIDTH / 2, y: source.y + NODE_HEIGHT / 2 }
                const targetCenter = { x: target.x + NODE_WIDTH / 2, y: target.y + NODE_HEIGHT / 2 }
                const start = nodeEdgePoint(source, targetCenter)
                const end = nodeEdgePoint(target, sourceCenter)
                return (
                  <g key={`${edge.source}-${edge.target}-${edge.relation_type}-${index}`} aria-label={edgeLabel}>
                    <line x1={start.x} y1={start.y} x2={end.x} y2={end.y} stroke="currentColor" strokeWidth="2" strokeDasharray="6 4" markerEnd="url(#trip-graph-arrow)" />
                    <text x={(start.x + end.x) / 2} y={(start.y + end.y) / 2 - 6} textAnchor="middle" className="fill-current text-[10px] font-semibold">{edge.relation_type}</text>
                  </g>
                )
              })}
            </g>
            <g aria-label="Dependency nodes">
              {graph.nodes.map((node, index) => {
                const { x, y } = nodePosition(index)
                const isAffected = affected.has(node.id)
                const description = `${node.title}, ${node.booking_type}, ${node.status}${isAffected ? ", affected" : ""}`
                const displayTitle = node.title.length > MAX_NODE_TITLE_LENGTH ? `${node.title.slice(0, MAX_NODE_TITLE_LENGTH - 3)}…` : node.title
                const titleWasTruncated = displayTitle !== node.title
                const titleWidth = NODE_WIDTH - NODE_TITLE_LEFT_PADDING - NODE_TITLE_RIGHT_PADDING - (isAffected ? AFFECTED_LABEL_RESERVED_WIDTH : 0)
                const titleClipId = `trip-graph-title-clip-${graph.trip_id}-${node.id}`
                return (
                  <g key={node.id} data-node-id={node.id} role="group" aria-label={description}>
                    <title>{node.title}</title>
                    <rect x={x} y={y} width={NODE_WIDTH} height={NODE_HEIGHT} rx="12" fill={isAffected ? "#fff7ed" : "white"} stroke={isAffected ? "#c2410c" : "currentColor"} strokeWidth={isAffected ? "3" : "1.5"} />
                    <text x={x + NODE_TITLE_LEFT_PADDING} y={y + 22} clipPath={`url(#${titleClipId})`} textLength={titleWasTruncated ? titleWidth : undefined} lengthAdjust={titleWasTruncated ? "spacingAndGlyphs" : undefined} className="fill-current text-[13px] font-bold">{displayTitle}</text>
                    <text x={x + NODE_TITLE_LEFT_PADDING} y={y + 42} className="fill-current text-[11px]">{node.booking_type} · {node.status}</text>
                    <text x={x + NODE_TITLE_LEFT_PADDING} y={y + 60} className="fill-current text-[10px]">Starts {node.start_time}</text>
                    {isAffected && <text x={x + NODE_WIDTH - NODE_TITLE_RIGHT_PADDING} y={y + 22} textAnchor="end" className="fill-[#9a3412] text-[10px] font-extrabold uppercase tracking-wider">Affected</text>}
                  </g>
                )
              })}
            </g>
          </svg>
        </div>
      )}
    </section>
  )
}

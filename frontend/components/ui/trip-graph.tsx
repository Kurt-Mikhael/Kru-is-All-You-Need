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

function nodePosition(index: number) {
  const column = index % 2
  const row = Math.floor(index / 2)
  return {
    x: LEFT_PADDING + column * (NODE_WIDTH + COLUMN_GAP),
    y: TOP_PADDING + row * (NODE_HEIGHT + ROW_GAP),
  }
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

  return (
    <section className="card p-4" aria-label={`Trip dependency graph for trip ${graph.trip_id}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-[13px] font-extrabold uppercase tracking-widest text-[var(--navy)]">Trip dependency graph</h2>
        <span className="text-[11px] text-muted-foreground">{graph.nodes.length} bookings · {graph.edges.length} dependencies</span>
      </div>
      {graph.nodes.length === 0 ? (
        <p className="mt-3 rounded-xl border border-dashed bg-[var(--surface-2)] p-5 text-center text-[13px] text-muted-foreground">No bookings in this trip.</p>
      ) : (
        <div className="mt-3 overflow-x-auto rounded-xl border bg-[var(--surface-2)]" tabIndex={0} aria-label="Scrollable trip dependency graph">
          <svg className="h-auto min-w-[600px] w-full" viewBox={`0 0 ${GRAPH_WIDTH} ${graphHeight}`} role="img" aria-label={`Dependencies for trip ${graph.trip_id}`}>
            <title>Trip booking dependencies</title>
            <defs>
              <marker id="trip-graph-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto" markerUnits="strokeWidth">
                <path d="M0,0 L8,4 L0,8 z" fill="currentColor" />
              </marker>
            </defs>
            <g aria-label="Dependency edges">
              {graph.edges.map((edge, index) => {
                const source = positions.get(edge.source)
                const target = positions.get(edge.target)
                if (!source || !target) return null
                const startX = source.x + NODE_WIDTH / 2
                const startY = source.y + NODE_HEIGHT / 2
                const endX = target.x + NODE_WIDTH / 2
                const endY = target.y + NODE_HEIGHT / 2
                return (
                  <g key={`${edge.source}-${edge.target}-${edge.relation_type}-${index}`} aria-label={`${edge.relation_type}: ${edge.source} to ${edge.target}`}>
                    <line x1={startX} y1={startY} x2={endX} y2={endY} stroke="currentColor" strokeWidth="2" strokeDasharray="6 4" markerEnd="url(#trip-graph-arrow)" />
                    <text x={(startX + endX) / 2} y={(startY + endY) / 2 - 6} textAnchor="middle" className="fill-current text-[10px] font-semibold">{edge.relation_type}</text>
                  </g>
                )
              })}
            </g>
            <g aria-label="Dependency nodes">
              {graph.nodes.map((node, index) => {
                const { x, y } = nodePosition(index)
                const isAffected = affected.has(node.id)
                const description = `${node.title}, ${node.booking_type}, ${node.status}${isAffected ? ", affected" : ""}`
                return (
                  <g key={node.id} data-node-id={node.id} role="group" aria-label={description}>
                    <rect x={x} y={y} width={NODE_WIDTH} height={NODE_HEIGHT} rx="12" fill={isAffected ? "#fff7ed" : "white"} stroke={isAffected ? "#c2410c" : "currentColor"} strokeWidth={isAffected ? "3" : "1.5"} />
                    <text x={x + 14} y={y + 22} className="fill-current text-[13px] font-bold">{node.title}</text>
                    <text x={x + 14} y={y + 42} className="fill-current text-[11px]">{node.booking_type} · {node.status}</text>
                    <text x={x + 14} y={y + 60} className="fill-current text-[10px]">Starts {node.start_time}</text>
                    {isAffected && <text x={x + NODE_WIDTH - 14} y={y + 22} textAnchor="end" className="fill-[#9a3412] text-[10px] font-extrabold uppercase tracking-wider">Affected</text>}
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

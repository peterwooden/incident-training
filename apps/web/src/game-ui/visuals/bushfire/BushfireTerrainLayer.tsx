import type { BushfireMapPayload } from "@incident/shared";

interface BushfireTerrainLayerProps {
  payload: BushfireMapPayload;
}

export function BushfireTerrainLayer({ payload }: BushfireTerrainLayerProps) {
  return (
    <g className="terrain-layers" aria-hidden="true">
      {payload.terrainLayers.map((layer) => (
        <g key={layer.id} className={`terrain-layer ${layer.material}`}>
          {layer.polygons.map((polygon, idx) => (
            <polygon
              key={`${layer.id}-${idx}`}
              points={polygon.map((point) => `${point.x},${point.y}`).join(" ")}
              style={{ opacity: 0.2 + Math.min(0.65, layer.elevation) }}
            />
          ))}
        </g>
      ))}

      {payload.roadGraph.map((road) => (
        <polyline
          key={road.id}
          className="terrain-road"
          points={road.points.map((point) => `${point.x},${point.y}`).join(" ")}
          style={{ strokeWidth: road.width }}
        />
      ))}

      {payload.riverPaths.map((river) => (
        <polyline
          key={river.id}
          className="terrain-river"
          points={river.points.map((point) => `${point.x},${point.y}`).join(" ")}
          style={{ strokeWidth: river.width }}
        />
      ))}

      {payload.treeClusters.map((trees) => (
        <circle
          key={trees.id}
          className="terrain-trees"
          cx={trees.x}
          cy={trees.y}
          r={trees.radius}
          style={{ opacity: 0.22 + trees.density * 0.26 }}
        />
      ))}

      {payload.landmarkSprites.map((landmark) => (
        <g key={landmark.id} className={`terrain-landmark ${landmark.kind}`} transform={`translate(${landmark.x} ${landmark.y}) scale(${landmark.scale})`}>
          <rect x={-7} y={-7} width={14} height={14} rx={3} />
        </g>
      ))}
    </g>
  );
}

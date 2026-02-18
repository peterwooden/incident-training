import type { BushfireMapPayload } from "@incident/shared";

interface BushfireTerrainLayerProps {
  payload: BushfireMapPayload;
}

export function BushfireTerrainLayer({ payload }: BushfireTerrainLayerProps) {
  const landmarkGlyph = (kind: BushfireMapPayload["landmarkSprites"][number]["kind"]) => {
    if (kind === "hospital") {
      return (
        <g className="terrain-landmark-glyph">
          <rect x={-2} y={-8} width={4} height={16} rx={1} />
          <rect x={-8} y={-2} width={16} height={4} rx={1} />
        </g>
      );
    }
    if (kind === "school") {
      return (
        <g className="terrain-landmark-glyph">
          <path d="M -8 4 L 0 -8 L 8 4 Z" />
          <rect x={-6} y={4} width={12} height={7} rx={1} />
        </g>
      );
    }
    if (kind === "depot") {
      return (
        <g className="terrain-landmark-glyph">
          <rect x={-8} y={-6} width={16} height={12} rx={2} />
          <line x1={-8} y1={-1} x2={8} y2={-1} />
          <line x1={-8} y1={3} x2={8} y2={3} />
        </g>
      );
    }
    return (
      <g className="terrain-landmark-glyph">
        <rect x={-7} y={-9} width={14} height={16} rx={2} />
        <circle cx={0} cy={-11} r={3} />
      </g>
    );
  };

  return (
    <g className="terrain-layers" aria-hidden="true">
      {payload.terrainLayers.map((layer) => (
        <g key={layer.id} className={`terrain-layer ${layer.material}`}>
          {layer.polygons.map((polygon, idx) => (
            <g key={`${layer.id}-${idx}`}>
              <polygon
                className="terrain-patch-shadow"
                points={polygon
                  .map((point) => `${point.x + 1.2},${point.y + 2.4}`)
                  .join(" ")}
                style={{ opacity: 0.1 + Math.min(0.38, layer.elevation) }}
              />
              <polygon
                className="terrain-patch-fill"
                points={polygon.map((point) => `${point.x},${point.y}`).join(" ")}
                style={{ opacity: 0.24 + Math.min(0.7, layer.elevation) }}
              />
              <polyline
                className="terrain-patch-rim"
                points={polygon
                  .concat([polygon[0]])
                  .map((point) => `${point.x},${point.y}`)
                  .join(" ")}
              />
            </g>
          ))}
        </g>
      ))}

      {payload.roadGraph.map((road) => (
        <g key={road.id}>
          <polyline
            className="terrain-road-shadow"
            points={road.points.map((point) => `${point.x},${point.y}`).join(" ")}
            style={{ strokeWidth: road.width + 4 }}
          />
          <polyline
            className="terrain-road"
            points={road.points.map((point) => `${point.x},${point.y}`).join(" ")}
            style={{ strokeWidth: road.width }}
          />
          <polyline
            className="terrain-road-centerline"
            points={road.points.map((point) => `${point.x},${point.y}`).join(" ")}
            style={{ strokeWidth: Math.max(1.2, road.width * 0.16) }}
          />
        </g>
      ))}

      {payload.riverPaths.map((river) => (
        <g key={river.id}>
          <polyline
            className="terrain-river-bed"
            points={river.points.map((point) => `${point.x},${point.y}`).join(" ")}
            style={{ strokeWidth: river.width + 6 }}
          />
          <polyline
            className="terrain-river"
            points={river.points.map((point) => `${point.x},${point.y}`).join(" ")}
            style={{ strokeWidth: river.width }}
          />
          <polyline
            className="terrain-river-highlight"
            points={river.points.map((point) => `${point.x},${point.y}`).join(" ")}
            style={{ strokeWidth: Math.max(1.5, river.width * 0.18) }}
          />
        </g>
      ))}

      {payload.treeClusters.map((trees, idx) => (
        <g key={trees.id} className="terrain-trees" style={{ opacity: 0.22 + trees.density * 0.4 }}>
          <circle cx={trees.x} cy={trees.y} r={trees.radius} className="terrain-tree-shadow" />
          {Array.from({ length: 5 }).map((_, leafIdx) => {
            const angle = (Math.PI * 2 * leafIdx) / 5;
            const offset = trees.radius * 0.42;
            const jitter = ((idx + leafIdx * 3) % 4) - 1.5;
            return (
              <circle
                key={`${trees.id}_${leafIdx}`}
                cx={trees.x + Math.cos(angle) * offset + jitter}
                cy={trees.y + Math.sin(angle) * offset + jitter * 0.35}
                r={Math.max(3.5, trees.radius * (0.36 + (leafIdx % 3) * 0.08))}
                className="terrain-tree-canopy"
              />
            );
          })}
        </g>
      ))}

      {payload.landmarkSprites.map((landmark) => (
        <g
          key={landmark.id}
          className={`terrain-landmark ${landmark.kind}`}
          transform={`translate(${landmark.x} ${landmark.y}) scale(${landmark.scale})`}
        >
          <ellipse cx={0} cy={6} rx={10} ry={4} className="terrain-landmark-shadow" />
          <circle cx={0} cy={0} r={10} className="terrain-landmark-disc" />
          {landmarkGlyph(landmark.kind)}
        </g>
      ))}
    </g>
  );
}

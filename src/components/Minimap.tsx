import { useRef, useMemo, useState, useCallback, useEffect } from "react";
import { MatchData, GameEvent, EventLayer, HeatmapMode } from "@/lib/types";
import { MAP_CONFIGS, worldToPixel } from "@/lib/mapConfigs";

interface MinimapViewerProps {
  match: MatchData;
  layers: Record<EventLayer, boolean>;
  heatmapMode: HeatmapMode;
  currentTime: number;
}

const MAP_SIZE = 1024;
const GRID_SIZE = 32; // heatmap grid cells

function eventToLayer(event: string): EventLayer | null {
  switch (event) {
    case "Position":
    case "BotPosition":
      return "movement";
    case "Kill":
    case "BotKill":
      return "kills";
    case "Killed":
    case "BotKilled":
      return "deaths";
    case "KilledByStorm":
      return "storm";
    case "Loot":
      return "loot";
    default:
      return null;
  }
}

const Minimap = ({ match, layers, heatmapMode, currentTime }: MinimapViewerProps) => {
  const config = MAP_CONFIGS[match.map_name];
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Zoom & pan state
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const lastMouse = useRef({ x: 0, y: 0 });

  // Reset zoom/pan when match changes
  useEffect(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, [match.match_id]);

  // Attach wheel listener with passive:false to allow preventDefault
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      // Normalized mouse position 0-1 within container
      const mx = (e.clientX - rect.left) / rect.width;
      const my = (e.clientY - rect.top) / rect.height;

      setZoom((prevZoom) => {
        // Gentle exponential zoom like Google Maps
        const factor = Math.pow(1.002, -e.deltaY);
        const newZoom = Math.min(20, Math.max(1, prevZoom * factor));

        setPan((prevPan) => {
          // Zoom toward mouse cursor
          const s = newZoom / prevZoom;
          return clampPan(
            mx - s * (mx - prevPan.x),
            my - s * (my - prevPan.y),
            newZoom
          );
        });

        return newZoom;
      });
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (zoom <= 1) return;
    e.preventDefault();
    setIsPanning(true);
    lastMouse.current = { x: e.clientX, y: e.clientY };
  }, [zoom]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const dx = (e.clientX - lastMouse.current.x) / rect.width;
    const dy = (e.clientY - lastMouse.current.y) / rect.height;
    lastMouse.current = { x: e.clientX, y: e.clientY };
    setPan((prev) => clampPan(prev.x + dx, prev.y + dy, zoom));
  }, [isPanning, zoom]);

  const handleMouseUp = useCallback(() => setIsPanning(false), []);

  function clampPan(x: number, y: number, z: number) {
    const limit = (z - 1) / (2 * z);
    return {
      x: Math.min(limit, Math.max(-limit, x)),
      y: Math.min(limit, Math.max(-limit, y)),
    };
  }

  // Filter events by time
  const visibleEvents = useMemo(() => {
    return match.events.filter((e) => e.ts <= currentTime);
  }, [match.events, currentTime]);

  // Build heatmap grid
  const heatmapData = useMemo(() => {
    if (heatmapMode === "none" || !config) return null;

    const targetEvents: string[] =
      heatmapMode === "movement"
        ? ["Position", "BotPosition"]
        : heatmapMode === "kills"
        ? ["Kill", "BotKill"]
        : ["Killed", "BotKilled", "KilledByStorm"];

    const grid = Array.from({ length: GRID_SIZE }, () =>
      new Float32Array(GRID_SIZE)
    );
    let max = 0;

    for (const e of visibleEvents) {
      if (!targetEvents.includes(e.event)) continue;
      const { px, py } = worldToPixel(e.x, e.z, config, MAP_SIZE);
      const gx = Math.min(GRID_SIZE - 1, Math.max(0, Math.floor((px / MAP_SIZE) * GRID_SIZE)));
      const gy = Math.min(GRID_SIZE - 1, Math.max(0, Math.floor((py / MAP_SIZE) * GRID_SIZE)));
      grid[gy][gx]++;
      if (grid[gy][gx] > max) max = grid[gy][gx];
    }

    return { grid, max };
  }, [visibleEvents, heatmapMode, config]);

  if (!config) {
    return (
      <div className="flex items-center justify-center h-64 rounded-lg bg-muted text-muted-foreground">
        Unknown map: {match.map_name}
      </div>
    );
  }

  const cellSize = MAP_SIZE / GRID_SIZE;

  const heatColor =
    heatmapMode === "movement"
      ? [200, 80]
      : heatmapMode === "kills"
      ? [142, 70]
      : [0, 80]; // h, s for HSL

  // Compute SVG viewBox based on zoom & pan
  const vbSize = MAP_SIZE / zoom;
  const vbX = (MAP_SIZE - vbSize) / 2 - pan.x * MAP_SIZE;
  const vbY = (MAP_SIZE - vbSize) / 2 - pan.y * MAP_SIZE;

  return (
    <div className="relative w-full max-w-[1024px] mx-auto">
      {zoom > 1 && (
        <button
          onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}
          className="absolute top-2 right-2 z-10 px-2 py-1 text-xs rounded bg-card/80 border border-border text-foreground hover:bg-accent backdrop-blur-sm"
        >
          Reset Zoom ({zoom.toFixed(1)}×)
        </button>
      )}
      <div
        ref={containerRef}
        className="relative aspect-square w-full rounded-lg overflow-hidden border border-border shadow-sm"
        style={{
          background: config.image
            ? `url(${config.image}) center/cover no-repeat`
            : `hsl(var(--minimap-bg))`,
          backgroundPosition: `${50 + pan.x * 100}% ${50 + pan.y * 100}%`,
          backgroundSize: `${zoom * 100}%`,
          cursor: zoom > 1 ? (isPanning ? 'grabbing' : 'grab') : 'zoom-in',
        }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <svg
          ref={svgRef}
          viewBox={`${vbX} ${vbY} ${vbSize} ${vbSize}`}
          className="absolute inset-0 w-full h-full"
        >
          {/* Heatmap overlay */}
          {heatmapData &&
            heatmapData.max > 0 &&
            heatmapData.grid.map((row, gy) =>
              Array.from(row).map((val, gx) => {
                if (val === 0) return null;
                const intensity = val / heatmapData.max;
                return (
                  <rect
                    key={`h-${gy}-${gx}`}
                    x={gx * cellSize}
                    y={gy * cellSize}
                    width={cellSize}
                    height={cellSize}
                    fill={`hsla(${heatColor[0]}, ${heatColor[1]}%, 50%, ${intensity * 0.7})`}
                    rx={2}
                  />
                );
              })
            )}

          {/* Movement events (subtle) */}
          {layers.movement &&
            visibleEvents
              .filter((e) => e.event === "Position" || e.event === "BotPosition")
              .map((e, i) => {
                const { px, py } = worldToPixel(e.x, e.z, config, MAP_SIZE);
                return (
                  <circle
                    key={`mv-${i}`}
                    cx={px}
                    cy={py}
                    r={2.5}
                    fill={
                      e.is_bot
                        ? "hsl(var(--event-movement-bot))"
                        : "hsl(var(--event-movement-human))"
                    }
                    opacity={0.25}
                  />
                );
              })}

          {/* Loot events */}
          {layers.loot &&
            visibleEvents
              .filter((e) => e.event === "Loot")
              .map((e, i) => {
                const { px, py } = worldToPixel(e.x, e.z, config, MAP_SIZE);
                return (
                  <circle
                    key={`lt-${i}`}
                    cx={px}
                    cy={py}
                    r={4}
                    fill="hsl(var(--event-loot))"
                    opacity={0.6}
                  >
                    <title>Loot — {e.player_id}</title>
                  </circle>
                );
              })}

          {/* Kill events */}
          {layers.kills &&
            visibleEvents
              .filter((e) => e.event === "Kill" || e.event === "BotKill")
              .map((e, i) => {
                const { px, py } = worldToPixel(e.x, e.z, config, MAP_SIZE);
                const color = "hsl(var(--event-kill))";
                return (
                  <circle
                    key={`kl-${i}`}
                    cx={px}
                    cy={py}
                    r={5}
                    fill={color}
                    stroke={color}
                    strokeWidth={2}
                    fillOpacity={0.8}
                  >
                    <title>
                      {e.event} — {e.player_id}
                    </title>
                  </circle>
                );
              })}

          {/* Death events (cross marker) */}
          {layers.deaths &&
            visibleEvents
              .filter((e) => e.event === "Killed" || e.event === "BotKilled")
              .map((e, i) => {
                const { px, py } = worldToPixel(e.x, e.z, config, MAP_SIZE);
                const s = 5;
                return (
                  <g key={`dt-${i}`} opacity={0.9}>
                    <line
                      x1={px - s}
                      y1={py - s}
                      x2={px + s}
                      y2={py + s}
                      stroke="hsl(var(--event-death))"
                      strokeWidth={2.5}
                      strokeLinecap="round"
                    />
                    <line
                      x1={px + s}
                      y1={py - s}
                      x2={px - s}
                      y2={py + s}
                      stroke="hsl(var(--event-death))"
                      strokeWidth={2.5}
                      strokeLinecap="round"
                    />
                    <title>
                      {e.event} — {e.player_id}
                    </title>
                  </g>
                );
              })}

          {/* Storm deaths (diamond marker) */}
          {layers.storm &&
            visibleEvents
              .filter((e) => e.event === "KilledByStorm")
              .map((e, i) => {
                const { px, py } = worldToPixel(e.x, e.z, config, MAP_SIZE);
                const s = 6;
                return (
                  <polygon
                    key={`st-${i}`}
                    points={`${px},${py - s} ${px + s},${py} ${px},${py + s} ${px - s},${py}`}
                    fill="hsl(var(--event-storm))"
                    fillOpacity={0.85}
                    stroke="hsl(var(--event-storm))"
                    strokeWidth={1.5}
                    strokeOpacity={0.5}
                  >
                    <title>KilledByStorm — {e.player_id}</title>
                  </polygon>
                );
              })}
        </svg>
      </div>
    </div>
  );
};

export default Minimap;

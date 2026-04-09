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
const GRID_SIZE = 32;

interface TooltipData {
  screenX: number;
  screenY: number;
  events: GameEvent[];
}

const Minimap = ({ match, layers, heatmapMode, currentTime }: MinimapViewerProps) => {
  const config = MAP_CONFIGS[match.map_name];
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const lastMouse = useRef({ x: 0, y: 0 });
  const dragDistance = useRef(0);
  const lastTouchCenter = useRef<{ x: number; y: number } | null>(null);
  const lastTouchDist = useRef<number | null>(null);

  useEffect(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setTooltip(null);
  }, [match.match_id]);

  function clampPan(x: number, y: number, z: number) {
    const limit = (z - 1) / (2 * z);
    return {
      x: Math.min(limit, Math.max(-limit, x)),
      y: Math.min(limit, Math.max(-limit, y)),
    };
  }

  // Wheel zoom
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const mx = (e.clientX - rect.left) / rect.width;
      const my = (e.clientY - rect.top) / rect.height;
      setZoom((prevZoom) => {
        const factor = Math.pow(1.004, -e.deltaY);
        const newZoom = Math.min(20, Math.max(1, prevZoom * factor));
        setPan((prevPan) => {
          const s = newZoom / prevZoom;
          return clampPan(mx - s * (mx - prevPan.x), my - s * (my - prevPan.y), newZoom);
        });
        return newZoom;
      });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  // Touch handlers
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        const t0 = e.touches[0], t1 = e.touches[1];
        lastTouchCenter.current = { x: (t0.clientX + t1.clientX) / 2, y: (t0.clientY + t1.clientY) / 2 };
        lastTouchDist.current = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY);
      }
    };
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        const rect = el.getBoundingClientRect();
        const t0 = e.touches[0], t1 = e.touches[1];
        const cx = (t0.clientX + t1.clientX) / 2, cy = (t0.clientY + t1.clientY) / 2;
        const dist = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY);
        if (lastTouchCenter.current && lastTouchDist.current) {
          const dx = (cx - lastTouchCenter.current.x) / rect.width;
          const dy = (cy - lastTouchCenter.current.y) / rect.height;
          const scaleFactor = dist / lastTouchDist.current;
          setZoom((prevZoom) => {
            const newZoom = Math.min(20, Math.max(1, prevZoom * scaleFactor));
            const mx = (cx - rect.left) / rect.width, my = (cy - rect.top) / rect.height;
            setPan((prevPan) => {
              const s = newZoom / prevZoom;
              return clampPan(mx - s * (mx - prevPan.x) + dx, my - s * (my - prevPan.y) + dy, newZoom);
            });
            return newZoom;
          });
        }
        lastTouchCenter.current = { x: cx, y: cy };
        lastTouchDist.current = dist;
      }
    };
    const onTouchEnd = () => { lastTouchCenter.current = null; lastTouchDist.current = null; };
    el.addEventListener("touchstart", onTouchStart, { passive: false });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd);
    el.addEventListener("touchcancel", onTouchEnd);
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("touchcancel", onTouchEnd);
    };
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsPanning(true);
    dragDistance.current = 0;
    lastMouse.current = { x: e.clientX, y: e.clientY };
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const dx = (e.clientX - lastMouse.current.x) / rect.width;
    const dy = (e.clientY - lastMouse.current.y) / rect.height;
    dragDistance.current += Math.abs(e.clientX - lastMouse.current.x) + Math.abs(e.clientY - lastMouse.current.y);
    lastMouse.current = { x: e.clientX, y: e.clientY };
    if (zoom > 1) {
      setPan((prev) => clampPan(prev.x + dx, prev.y + dy, zoom));
    }
  }, [isPanning, zoom]);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    const wasDrag = dragDistance.current > 5;
    setIsPanning(false);
    if (wasDrag) return;

    // Click — find nearby events
    if (!svgRef.current || !containerRef.current || !config) return;
    const rect = containerRef.current.getBoundingClientRect();
    const vbSize = MAP_SIZE / zoom;
    const vbX = (MAP_SIZE - vbSize) / 2 - pan.x * MAP_SIZE;
    const vbY = (MAP_SIZE - vbSize) / 2 - pan.y * MAP_SIZE;
    const svgX = vbX + ((e.clientX - rect.left) / rect.width) * vbSize;
    const svgY = vbY + ((e.clientY - rect.top) / rect.height) * vbSize;
    const hitRadius = Math.max(8, 12 / zoom);

    const hits = visibleEvents.filter((ev) => {
      const layer = eventToLayer(ev.event);
      if (!layer || !layers[layer]) return false;
      const { px, py } = worldToPixel(ev.x, ev.z, config, MAP_SIZE);
      return Math.hypot(px - svgX, py - svgY) <= hitRadius;
    });

    if (hits.length > 0) {
      setTooltip({ screenX: e.clientX - rect.left, screenY: e.clientY - rect.top, events: hits });
    } else {
      setTooltip(null);
    }
  }, [zoom, pan, config, layers]);

  const visibleEvents = useMemo(() => {
    return match.events.filter((e) => e.ts <= currentTime);
  }, [match.events, currentTime]);

  const heatmapData = useMemo(() => {
    if (heatmapMode === "none" || !config) return null;
    const targetEvents: string[] =
      heatmapMode === "movement" ? ["Position", "BotPosition"]
        : heatmapMode === "kills" ? ["Kill", "BotKill"]
        : ["Killed", "BotKilled", "KilledByStorm"];
    const grid = Array.from({ length: GRID_SIZE }, () => new Float32Array(GRID_SIZE));
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
  const heatColor = heatmapMode === "movement" ? [200, 80] : heatmapMode === "kills" ? [142, 70] : [0, 80];
  const vbSize = MAP_SIZE / zoom;
  const vbX = (MAP_SIZE - vbSize) / 2 - pan.x * MAP_SIZE;
  const vbY = (MAP_SIZE - vbSize) / 2 - pan.y * MAP_SIZE;

  return (
    <div className="relative w-full max-w-[1024px] mx-auto">
      {zoom > 1 && (
        <button
          onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); setTooltip(null); }}
          className="absolute top-2 right-2 z-10 px-2 py-1 text-xs rounded bg-card/80 border border-border text-foreground hover:bg-accent backdrop-blur-sm"
        >
          Reset Zoom ({zoom.toFixed(1)}×)
        </button>
      )}
      <div
        ref={containerRef}
        className="relative aspect-square w-full rounded-lg overflow-hidden border border-border shadow-sm touch-none"
        style={{
          background: !config.image ? `hsl(var(--minimap-bg))` : undefined,
          cursor: zoom > 1 ? (isPanning ? 'grabbing' : 'grab') : 'crosshair',
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => setIsPanning(false)}
      >
        <svg
          ref={svgRef}
          viewBox={`${vbX} ${vbY} ${vbSize} ${vbSize}`}
          className="absolute inset-0 w-full h-full"
        >
          {config.image && (
            <image href={config.image} x={0} y={0} width={MAP_SIZE} height={MAP_SIZE} preserveAspectRatio="none" />
          )}
          {heatmapData && heatmapData.max > 0 &&
            heatmapData.grid.map((row, gy) =>
              Array.from(row).map((val, gx) => {
                if (val === 0) return null;
                const intensity = val / heatmapData.max;
                return (
                  <rect key={`h-${gy}-${gx}`} x={gx * cellSize} y={gy * cellSize} width={cellSize} height={cellSize}
                    fill={`hsla(${heatColor[0]}, ${heatColor[1]}%, 50%, ${intensity * 0.7})`} rx={2} />
                );
              })
            )}

          {layers.movement && visibleEvents
            .filter((e) => e.event === "Position" || e.event === "BotPosition")
            .map((e, i) => {
              const { px, py } = worldToPixel(e.x, e.z, config, MAP_SIZE);
              return <circle key={`mv-${i}`} cx={px} cy={py} r={2.5}
                fill={e.is_bot ? "hsl(var(--event-movement-bot))" : "hsl(var(--event-movement-human))"} opacity={0.25} />;
            })}

          {layers.loot && visibleEvents
            .filter((e) => e.event === "Loot")
            .map((e, i) => {
              const { px, py } = worldToPixel(e.x, e.z, config, MAP_SIZE);
              return <circle key={`lt-${i}`} cx={px} cy={py} r={4} fill="hsl(var(--event-loot))" opacity={0.6} />;
            })}

          {layers.kills && visibleEvents
            .filter((e) => e.event === "Kill" || e.event === "BotKill")
            .map((e, i) => {
              const { px, py } = worldToPixel(e.x, e.z, config, MAP_SIZE);
              const color = "hsl(var(--event-kill))";
              return <circle key={`kl-${i}`} cx={px} cy={py} r={5} fill={color} stroke={color} strokeWidth={2} fillOpacity={0.8} />;
            })}

          {layers.deaths && visibleEvents
            .filter((e) => e.event === "Killed" || e.event === "BotKilled")
            .map((e, i) => {
              const { px, py } = worldToPixel(e.x, e.z, config, MAP_SIZE);
              const s = 5;
              return (
                <g key={`dt-${i}`} opacity={0.9}>
                  <line x1={px - s} y1={py - s} x2={px + s} y2={py + s} stroke="hsl(var(--event-death))" strokeWidth={2.5} strokeLinecap="round" />
                  <line x1={px + s} y1={py - s} x2={px - s} y2={py + s} stroke="hsl(var(--event-death))" strokeWidth={2.5} strokeLinecap="round" />
                </g>
              );
            })}

          {layers.storm && visibleEvents
            .filter((e) => e.event === "KilledByStorm")
            .map((e, i) => {
              const { px, py } = worldToPixel(e.x, e.z, config, MAP_SIZE);
              const s = 6;
              return (
                <polygon key={`st-${i}`}
                  points={`${px},${py - s} ${px + s},${py} ${px},${py + s} ${px - s},${py}`}
                  fill="hsl(var(--event-storm))" fillOpacity={0.85}
                  stroke="hsl(var(--event-storm))" strokeWidth={1.5} strokeOpacity={0.5} />
              );
            })}
        </svg>

        {/* Click tooltip */}
        {tooltip && (
          <div
            className="absolute z-20 max-w-[260px] rounded-lg border border-border bg-card/95 backdrop-blur-sm shadow-lg p-2 text-xs pointer-events-auto"
            style={{
              left: Math.min(tooltip.screenX + 12, (containerRef.current?.clientWidth ?? 300) - 270),
              top: Math.min(tooltip.screenY - 8, (containerRef.current?.clientHeight ?? 300) - 100),
            }}
          >
            <button
              onClick={() => setTooltip(null)}
              className="absolute top-1 right-1.5 text-muted-foreground hover:text-foreground text-xs leading-none"
            >
              ✕
            </button>
            <div className="space-y-1 pr-4">
              <div className="font-semibold text-foreground">{tooltip.events.length} event{tooltip.events.length > 1 ? "s" : ""} here</div>
              {tooltip.events.map((ev, i) => (
                <div key={i} className="border-t border-border/50 pt-1">
                  <span className="font-medium text-foreground">{ev.event}</span>
                  <span className="text-muted-foreground"> — {ev.is_bot ? "Bot" : "Human"}</span>
                  <div className="text-muted-foreground">
                    ID: {ev.player_id.slice(0, 12)}…
                  </div>
                  <div className="text-muted-foreground">
                    x: {ev.x.toFixed(0)}, z: {ev.z.toFixed(0)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

function eventToLayer(event: string): EventLayer | null {
  switch (event) {
    case "Position": case "BotPosition": return "movement";
    case "Kill": case "BotKill": return "kills";
    case "Killed": case "BotKilled": return "deaths";
    case "KilledByStorm": return "storm";
    case "Loot": return "loot";
    default: return null;
  }
}

export default Minimap;

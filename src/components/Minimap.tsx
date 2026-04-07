import { useRef } from "react";
import { MatchData } from "@/lib/types";
import { MAP_CONFIGS, worldToPixel } from "@/lib/mapConfigs";

interface MinimapViewerProps {
  match: MatchData;
}

const MAP_SIZE = 1024;

const Minimap = ({ match }: MinimapViewerProps) => {
  const config = MAP_CONFIGS[match.map_name];
  const svgRef = useRef<SVGSVGElement>(null);

  if (!config) {
    return (
      <div className="flex items-center justify-center h-64 rounded-lg bg-muted text-muted-foreground">
        Unknown map: {match.map_name}
      </div>
    );
  }

  return (
    <div className="relative w-full max-w-[1024px] mx-auto">
      <div className="relative aspect-square w-full rounded-lg overflow-hidden border border-border shadow-sm"
           style={{ background: config.image ? `url(${config.image}) center/cover no-repeat` : `hsl(var(--minimap-bg))` }}>
        {/* Placeholder grid for minimap background */}
        <svg
          ref={svgRef}
          viewBox={`0 0 ${MAP_SIZE} ${MAP_SIZE}`}
          className="absolute inset-0 w-full h-full"
        >
          {/* Grid lines for visual reference */}
          {Array.from({ length: 9 }, (_, i) => {
            const pos = ((i + 1) / 10) * MAP_SIZE;
            return (
              <g key={i} opacity={0.15}>
                <line x1={pos} y1={0} x2={pos} y2={MAP_SIZE} stroke="white" strokeWidth={1} />
                <line x1={0} y1={pos} x2={MAP_SIZE} y2={pos} stroke="white" strokeWidth={1} />
              </g>
            );
          })}

          {/* Player positions */}
          {match.players.map((player, idx) => {
            const { px, py } = worldToPixel(player.x, player.z, config, MAP_SIZE);
            const isBot = player.is_bot;
            return (
              <circle
                key={`${player.player_id}-${idx}`}
                cx={px}
                cy={py}
                r={6}
                fill={isBot ? "hsl(var(--player-bot))" : "hsl(var(--player-human))"}
                stroke={isBot ? "hsl(var(--player-bot) / 0.4)" : "hsl(var(--player-human) / 0.4)"}
                strokeWidth={3}
                opacity={0.9}
              >
                <title>{player.player_id} ({isBot ? "Bot" : "Human"}) — x: {player.x.toFixed(1)}, z: {player.z.toFixed(1)}</title>
              </circle>
            );
          })}
        </svg>
      </div>
    </div>
  );
};

export default Minimap;

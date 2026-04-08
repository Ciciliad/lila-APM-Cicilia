import { EventLayer, HeatmapMode } from "@/lib/types";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface EventControlsProps {
  layers: Record<EventLayer, boolean>;
  onToggleLayer: (layer: EventLayer) => void;
  heatmapMode: HeatmapMode;
  onHeatmapChange: (mode: HeatmapMode) => void;
}

const LAYER_CONFIG: { key: EventLayer; label: string; color: string }[] = [
  { key: "movement", label: "Movement", color: "hsl(var(--event-movement-human))" },
  { key: "kills", label: "Kills", color: "hsl(var(--event-kill))" },
  { key: "deaths", label: "Deaths", color: "hsl(var(--event-death))" },
  { key: "loot", label: "Loot", color: "hsl(var(--event-loot))" },
  { key: "storm", label: "Storm Deaths", color: "hsl(var(--event-storm))" },
];

const EventControls = ({
  layers,
  onToggleLayer,
  heatmapMode,
  onHeatmapChange,
  timeRange,
  currentTime,
  onTimeChange,
}: EventControlsProps) => {
  const [minTs, maxTs] = timeRange;
  const duration = maxTs - minTs;
  const pct = duration > 0 ? ((currentTime - minTs) / duration) * 100 : 100;

  return (
    <div className="space-y-4 rounded-lg border border-border bg-card p-4">
      {/* Layer toggles */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3">Event Layers</h3>
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          {LAYER_CONFIG.map(({ key, label, color }) => (
            <div key={key} className="flex items-center gap-2">
              <Switch
                id={`layer-${key}`}
                checked={layers[key]}
                onCheckedChange={() => onToggleLayer(key)}
              />
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ background: color }}
              />
              <Label htmlFor={`layer-${key}`} className="text-sm cursor-pointer">
                {label}
              </Label>
            </div>
          ))}
        </div>
      </div>

      {/* Heatmap mode */}
      <div className="flex items-center gap-3">
        <Label className="text-sm font-semibold text-foreground whitespace-nowrap">
          Heatmap
        </Label>
        <Select value={heatmapMode} onValueChange={(v) => onHeatmapChange(v as HeatmapMode)}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">None</SelectItem>
            <SelectItem value="movement">Movement</SelectItem>
            <SelectItem value="kills">Kills</SelectItem>
            <SelectItem value="deaths">Deaths</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Timeline slider */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-semibold text-foreground">Timeline</Label>
          <span className="text-xs text-muted-foreground">{pct.toFixed(0)}%</span>
        </div>
        <Slider
          min={minTs}
          max={maxTs || 1}
          step={Math.max(1, Math.floor(duration / 500))}
          value={[currentTime]}
          onValueChange={([v]) => onTimeChange(v)}
        />
      </div>
    </div>
  );
};

export default EventControls;

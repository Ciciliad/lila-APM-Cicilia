import { useState, useEffect, useRef, useCallback } from "react";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Play, Pause, RotateCcw, ChevronFirst, ChevronLast } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TimelinePlaybackProps {
  timeRange: [number, number];
  currentTime: number;
  onTimeChange: (ts: number) => void;
}

const SPEED_OPTIONS = [
  { label: "0.5×", value: 0.5 },
  { label: "1×", value: 1 },
  { label: "2×", value: 2 },
  { label: "4×", value: 4 },
  { label: "8×", value: 8 },
];

const TimelinePlayback = ({ timeRange, currentTime, onTimeChange }: TimelinePlaybackProps) => {
  const [minTs, maxTs] = timeRange;
  const duration = maxTs - minTs;
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const rafRef = useRef<number>(0);
  const lastFrameRef = useRef<number>(0);

  const pct = duration > 0 ? ((currentTime - minTs) / duration) * 100 : 100;

  // Playback loop
  useEffect(() => {
    if (!playing) return;

    const tick = (now: number) => {
      if (lastFrameRef.current === 0) {
        lastFrameRef.current = now;
      }
      const dt = now - lastFrameRef.current;
      lastFrameRef.current = now;

      // Map real-time to game-time: full duration plays in ~30s at 1× speed
      const gameStep = (duration / 30000) * dt * speed;

      onTimeChange(Math.min(maxTs, currentTime + gameStep));

      if (currentTime >= maxTs) {
        setPlaying(false);
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    lastFrameRef.current = 0;
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [playing, speed, currentTime, minTs, maxTs, duration, onTimeChange]);

  const togglePlay = useCallback(() => {
    if (currentTime >= maxTs) {
      onTimeChange(minTs);
    }
    setPlaying((p) => !p);
  }, [currentTime, maxTs, minTs, onTimeChange]);

  const reset = useCallback(() => {
    setPlaying(false);
    onTimeChange(minTs);
  }, [minTs, onTimeChange]);

  const jumpStart = useCallback(() => {
    setPlaying(false);
    onTimeChange(minTs);
  }, [minTs, onTimeChange]);

  const jumpEnd = useCallback(() => {
    setPlaying(false);
    onTimeChange(maxTs);
  }, [maxTs, onTimeChange]);

  return (
    <div className="space-y-2 rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-semibold text-foreground">Timeline</Label>
        <span className="text-xs text-muted-foreground">{pct.toFixed(0)}%</span>
      </div>

      <Slider
        min={minTs}
        max={maxTs || 1}
        step={Math.max(1, Math.floor(duration / 500))}
        value={[currentTime]}
        onValueChange={([v]) => {
          setPlaying(false);
          onTimeChange(v);
        }}
      />

      <div className="flex items-center gap-2 pt-1">
        <Button variant="outline" size="icon" className="h-8 w-8" onClick={jumpStart} title="Jump to start">
          <ChevronFirst className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon" className="h-8 w-8" onClick={togglePlay} title={playing ? "Pause" : "Play"}>
          {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </Button>
        <Button variant="outline" size="icon" className="h-8 w-8" onClick={jumpEnd} title="Jump to end">
          <ChevronLast className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon" className="h-8 w-8" onClick={reset} title="Reset">
          <RotateCcw className="h-4 w-4" />
        </Button>

        <div className="ml-auto">
          <Select value={String(speed)} onValueChange={(v) => setSpeed(Number(v))}>
            <SelectTrigger className="w-[80px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SPEED_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={String(o.value)}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
};

export default TimelinePlayback;

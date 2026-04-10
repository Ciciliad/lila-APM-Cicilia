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
  const currentTimeRef = useRef(currentTime);
  const speedRef = useRef(speed);
  const onTimeChangeRef = useRef(onTimeChange);

  // Keep refs in sync
  currentTimeRef.current = currentTime;
  speedRef.current = speed;
  onTimeChangeRef.current = onTimeChange;

  const pct = duration > 0 ? ((currentTime - minTs) / duration) * 100 : 100;

  // Format ms elapsed as MM:SS
  const formatTime = (ms: number) => {
    const elapsed = ms - minTs;
    const totalSec = Math.max(0, Math.floor(elapsed / 1000));
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  // Playback loop
  useEffect(() => {
    if (!playing) return;

    lastFrameRef.current = 0;

    const tick = (now: number) => {
      if (lastFrameRef.current === 0) {
        lastFrameRef.current = now;
        rafRef.current = requestAnimationFrame(tick);
        return;
      }
      const dt = now - lastFrameRef.current;
      lastFrameRef.current = now;

      const gameStep = (duration / 30000) * dt * speedRef.current;
      const next = Math.min(maxTs, currentTimeRef.current + gameStep);
      onTimeChangeRef.current(next);

      if (next >= maxTs) {
        setPlaying(false);
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [playing, minTs, maxTs, duration]);

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

  if (duration === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-semibold text-foreground">Timeline</Label>
          <span className="text-xs text-muted-foreground">All events share the same timestamp — playback not available for this match.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2 rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-semibold text-foreground">Timeline</Label>
        <span className="text-xs text-muted-foreground">{formatTime(currentTime)} / {formatTime(maxTs)}</span>
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

import { useState, useEffect, useMemo } from "react";
import { MatchData, RawEvent, DATE_FILES, EventLayer, HeatmapMode } from "@/lib/types";
import { MOCK_MATCHES } from "@/lib/mockData";
import { transformRawEvents } from "@/lib/transformData";
import { MAP_CONFIGS } from "@/lib/mapConfigs";
import Minimap from "@/components/Minimap";
import EventControls from "@/components/EventControls";
import TimelinePlayback from "@/components/TimelinePlayback";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Crosshair, Users, X } from "lucide-react";

const ALL_MAPS = Object.keys(MAP_CONFIGS);

const DEFAULT_LAYERS: Record<EventLayer, boolean> = {
  movement: true,
  kills: true,
  deaths: true,
  loot: false,
  storm: true,
};

// Map DATE_FILES labels to clean display names
const DATE_LABELS: { file_label: string; display: string }[] = [
  { file_label: "February 10", display: "Feb 10" },
  { file_label: "February 11", display: "Feb 11" },
  { file_label: "February 12", display: "Feb 12" },
  { file_label: "February 13", display: "Feb 13" },
  { file_label: "February 14", display: "Feb 14" },
];

const Index = () => {
  const [allMatches, setAllMatches] = useState<MatchData[]>(MOCK_MATCHES);
  const [selectedMap, setSelectedMap] = useState<string>(ALL_MAPS[0]);
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [selectedMatchId, setSelectedMatchId] = useState<string>("");
  const [layers, setLayers] = useState<Record<EventLayer, boolean>>(DEFAULT_LAYERS);
  const [heatmapMode, setHeatmapMode] = useState<HeatmapMode>("none");
  const [currentTime, setCurrentTime] = useState<number>(Infinity);

  // Load all date files
  useEffect(() => {
    const loadAll = async () => {
      const results: MatchData[] = [];
      for (const df of DATE_FILES) {
        try {
          const res = await fetch(df.path);
          if (!res.ok) continue;
          const data = await res.json();
          let events: RawEvent[] = [];
          if (Array.isArray(data)) {
            events = data;
          } else if (data && typeof data === "object") {
            for (const arr of Object.values(data)) {
              if (Array.isArray(arr)) events.push(...(arr as RawEvent[]));
            }
          }
          if (events.length > 0) {
            const date = events[0]?.date ?? df.label;
            results.push(...transformRawEvents(events, date));
          }
        } catch {
          // skip
        }
      }
      if (results.length > 0) {
        setAllMatches(results);
      }
    };
    loadAll();
  }, []);

  // Available dates for the selected map
  const availableDates = useMemo(() => {
    const filtered = allMatches.filter((m) => m.map_name === selectedMap);
    return [...new Set(filtered.map((m) => m.date))];
  }, [allMatches, selectedMap]);

  // Filtered matches
  const filteredMatches = useMemo(() => {
    let filtered = allMatches.filter((m) => m.map_name === selectedMap);
    if (selectedDates.length > 0) {
      filtered = filtered.filter((m) => selectedDates.includes(m.date));
    }
    return filtered;
  }, [allMatches, selectedMap, selectedDates]);

  // Auto-select first match when filters change
  useEffect(() => {
    if (filteredMatches.length > 0 && !filteredMatches.find((m) => m.match_id === selectedMatchId)) {
      setSelectedMatchId(filteredMatches[0].match_id);
    }
  }, [filteredMatches, selectedMatchId]);

  // Clear invalid selected dates when map changes
  useEffect(() => {
    setSelectedDates((prev) => prev.filter((d) => availableDates.includes(d)));
  }, [availableDates]);

  const selectedMatch = filteredMatches.find((m) => m.match_id === selectedMatchId) ?? filteredMatches[0];

  // Reset timeline when match changes
  useEffect(() => {
    if (selectedMatch) {
      setCurrentTime(selectedMatch.maxTs);
    }
  }, [selectedMatch?.match_id]);

  const humanCount = selectedMatch?.players.filter((p) => !p.is_bot).length ?? 0;
  const botCount = selectedMatch?.players.filter((p) => p.is_bot).length ?? 0;

  const toggleLayer = (layer: EventLayer) => {
    setLayers((prev) => ({ ...prev, [layer]: !prev[layer] }));
  };

  const toggleDate = (date: string) => {
    setSelectedDates((prev) =>
      prev.includes(date) ? prev.filter((d) => d !== date) : [...prev, date]
    );
  };

  const getDateDisplay = (dateStr: string) => {
    const found = DATE_LABELS.find((d) => d.file_label === dateStr);
    return found ? found.display : dateStr.replace(/_/g, " ");
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container max-w-6xl mx-auto px-4 py-4 flex items-center gap-3">
          <Crosshair className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-semibold text-foreground">Game Analytics</h1>
        </div>
      </header>

      <main className="container max-w-6xl mx-auto px-4 py-6 space-y-5">
        {/* Filter bar */}
        <div className="flex flex-wrap items-end gap-4">
          {/* Map selector — no "All" option */}
          <div className="space-y-1.5 min-w-[160px]">
            <label className="text-sm font-medium text-foreground">Map</label>
            <Select value={selectedMap} onValueChange={setSelectedMap}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ALL_MAPS.map((name) => (
                  <SelectItem key={name} value={name}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date multi-select as clickable badges */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Dates</label>
            <div className="flex flex-wrap gap-1.5">
              {availableDates.map((d) => {
                const selected = selectedDates.includes(d);
                return (
                  <Badge
                    key={d}
                    variant={selected ? "default" : "outline"}
                    className="cursor-pointer select-none text-xs px-2.5 py-1"
                    onClick={() => toggleDate(d)}
                  >
                    {getDateDisplay(d)}
                    {selected && <X className="ml-1 h-3 w-3" />}
                  </Badge>
                );
              })}
              {availableDates.length === 0 && (
                <span className="text-xs text-muted-foreground">No dates available</span>
              )}
            </div>
          </div>


        {/* Controls + Match info */}
        {selectedMatch && (
          <div className="space-y-4">
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{selectedMatch.map_name}</span>
              <span className="text-xs">{getDateDisplay(selectedMatch.date)}</span>
              <span className="flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" />
                <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: "hsl(var(--player-human))" }} />
                {humanCount} humans
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: "hsl(var(--player-bot))" }} />
                {botCount} bots
              </span>
              <span className="text-xs">{selectedMatch.events.length} events</span>
            </div>

            <EventControls
              layers={layers}
              onToggleLayer={toggleLayer}
              heatmapMode={heatmapMode}
              onHeatmapChange={setHeatmapMode}
            />

            <TimelinePlayback
              timeRange={[selectedMatch.minTs, selectedMatch.maxTs]}
              currentTime={currentTime}
              onTimeChange={setCurrentTime}
            />

            <Minimap
              match={selectedMatch}
              layers={layers}
              heatmapMode={heatmapMode}
              currentTime={currentTime}
            />
          </div>
        )}
      </main>
    </div>
  );
};

export default Index;

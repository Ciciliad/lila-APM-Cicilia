import { useState, useEffect, useMemo } from "react";
import { MatchData, RawEvent, DATE_FILES, EventLayer, HeatmapMode } from "@/lib/types";
import { MOCK_MATCHES } from "@/lib/mockData";
import { transformRawEvents } from "@/lib/transformData";
import { MAP_CONFIGS } from "@/lib/mapConfigs";
import Minimap from "@/components/Minimap";
import EventControls from "@/components/EventControls";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Crosshair, Users } from "lucide-react";

const ALL_MAPS = Object.keys(MAP_CONFIGS);

const DEFAULT_LAYERS: Record<EventLayer, boolean> = {
  movement: true,
  kills: true,
  deaths: true,
  loot: false,
  storm: true,
};

const Index = () => {
  const [allMatches, setAllMatches] = useState<MatchData[]>(MOCK_MATCHES);
  const [selectedMap, setSelectedMap] = useState<string>("all");
  const [selectedDate, setSelectedDate] = useState<string>("all");
  const [selectedMatchId, setSelectedMatchId] = useState<string>("");
  const [layers, setLayers] = useState<Record<EventLayer, boolean>>(DEFAULT_LAYERS);
  const [heatmapMode, setHeatmapMode] = useState<HeatmapMode>("none");
  const [currentTime, setCurrentTime] = useState<number>(Infinity);

  // Load all available date files
  useEffect(() => {
    const loadAll = async () => {
      const results: MatchData[] = [];
      for (const df of DATE_FILES) {
        try {
          const res = await fetch(df.path);
          if (!res.ok) continue;
          const data: RawEvent[] = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            results.push(...transformRawEvents(data, df.label));
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

  const availableDates = useMemo(() => {
    let filtered = allMatches;
    if (selectedMap !== "all") {
      filtered = filtered.filter((m) => m.map_name === selectedMap);
    }
    return [...new Set(filtered.map((m) => m.date))];
  }, [allMatches, selectedMap]);

  const filteredMatches = useMemo(() => {
    let filtered = allMatches;
    if (selectedMap !== "all") {
      filtered = filtered.filter((m) => m.map_name === selectedMap);
    }
    if (selectedDate !== "all") {
      filtered = filtered.filter((m) => m.date === selectedDate);
    }
    return filtered;
  }, [allMatches, selectedMap, selectedDate]);

  useEffect(() => {
    if (filteredMatches.length > 0 && !filteredMatches.find((m) => m.match_id === selectedMatchId)) {
      setSelectedMatchId(filteredMatches[0].match_id);
    }
  }, [filteredMatches, selectedMatchId]);

  useEffect(() => {
    if (selectedDate !== "all" && !availableDates.includes(selectedDate)) {
      setSelectedDate("all");
    }
  }, [availableDates, selectedDate]);

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
          <div className="space-y-1.5 min-w-[160px]">
            <label className="text-sm font-medium text-foreground">Map</label>
            <Select value={selectedMap} onValueChange={setSelectedMap}>
              <SelectTrigger><SelectValue placeholder="All maps" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Maps</SelectItem>
                {ALL_MAPS.map((name) => (
                  <SelectItem key={name} value={name}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5 min-w-[160px]">
            <label className="text-sm font-medium text-foreground">Date</label>
            <Select value={selectedDate} onValueChange={setSelectedDate}>
              <SelectTrigger><SelectValue placeholder="All dates" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Dates</SelectItem>
                {availableDates.map((d) => (
                  <SelectItem key={d} value={d}>{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5 min-w-[220px]">
            <label className="text-sm font-medium text-foreground">Match</label>
            <Select value={selectedMatchId} onValueChange={setSelectedMatchId}>
              <SelectTrigger><SelectValue placeholder="Select match" /></SelectTrigger>
              <SelectContent>
                {filteredMatches.map((m) => (
                  <SelectItem key={m.match_id} value={m.match_id}>
                    {m.match_id.slice(0, 8)}…
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Controls + Match info */}
        {selectedMatch && (
          <div className="space-y-4">
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{selectedMatch.map_name}</span>
              <span className="text-xs">{selectedMatch.date}</span>
              <span className="flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" />
                <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: "hsl(var(--player-human))" }} />
                {humanCount} humans
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: "hsl(var(--player-bot))" }} />
                {botCount} bots
              </span>
              <span className="text-xs">
                {selectedMatch.events.length} events
              </span>
            </div>

            <EventControls
              layers={layers}
              onToggleLayer={toggleLayer}
              heatmapMode={heatmapMode}
              onHeatmapChange={setHeatmapMode}
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

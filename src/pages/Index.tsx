import { useState, useEffect, useMemo } from "react";
import { MatchData, RawEvent, DATE_FILES } from "@/lib/types";
import { MOCK_MATCHES } from "@/lib/mockData";
import { transformRawEvents } from "@/lib/transformData";
import { MAP_CONFIGS } from "@/lib/mapConfigs";
import Minimap from "@/components/Minimap";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Crosshair, Users } from "lucide-react";

const ALL_MAPS = Object.keys(MAP_CONFIGS);

const Index = () => {
  const [allMatches, setAllMatches] = useState<MatchData[]>(MOCK_MATCHES);
  const [selectedMap, setSelectedMap] = useState<string>("all");
  const [selectedDate, setSelectedDate] = useState<string>("all");
  const [selectedMatchId, setSelectedMatchId] = useState<string>("");

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
          // File not available yet, skip
        }
      }
      if (results.length > 0) {
        setAllMatches(results);
      }
    };
    loadAll();
  }, []);

  // Available dates from loaded data
  const availableDates = useMemo(() => {
    let filtered = allMatches;
    if (selectedMap !== "all") {
      filtered = filtered.filter((m) => m.map_name === selectedMap);
    }
    return [...new Set(filtered.map((m) => m.date))];
  }, [allMatches, selectedMap]);

  // Available matches after map + date filter
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

  // Auto-select first match when filters change
  useEffect(() => {
    if (filteredMatches.length > 0 && !filteredMatches.find((m) => m.match_id === selectedMatchId)) {
      setSelectedMatchId(filteredMatches[0].match_id);
    }
  }, [filteredMatches, selectedMatchId]);

  // Reset date when map changes and current date is no longer available
  useEffect(() => {
    if (selectedDate !== "all" && !availableDates.includes(selectedDate)) {
      setSelectedDate("all");
    }
  }, [availableDates, selectedDate]);

  const selectedMatch = filteredMatches.find((m) => m.match_id === selectedMatchId) ?? filteredMatches[0];
  const humanCount = selectedMatch?.players.filter((p) => !p.is_bot).length ?? 0;
  const botCount = selectedMatch?.players.filter((p) => p.is_bot).length ?? 0;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container max-w-5xl mx-auto px-4 py-4 flex items-center gap-3">
          <Crosshair className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-semibold text-foreground">Game Analytics</h1>
        </div>
      </header>

      <main className="container max-w-5xl mx-auto px-4 py-8 space-y-6">
        {/* Filter bar */}
        <div className="flex flex-wrap items-end gap-4">
          <div className="space-y-1.5 min-w-[180px]">
            <label className="text-sm font-medium text-foreground">Map</label>
            <Select value={selectedMap} onValueChange={setSelectedMap}>
              <SelectTrigger>
                <SelectValue placeholder="All maps" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Maps</SelectItem>
                {ALL_MAPS.map((name) => (
                  <SelectItem key={name} value={name}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5 min-w-[180px]">
            <label className="text-sm font-medium text-foreground">Date</label>
            <Select value={selectedDate} onValueChange={setSelectedDate}>
              <SelectTrigger>
                <SelectValue placeholder="All dates" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Dates</SelectItem>
                {availableDates.map((d) => (
                  <SelectItem key={d} value={d}>{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5 min-w-[260px]">
            <label className="text-sm font-medium text-foreground">Match</label>
            <Select value={selectedMatchId} onValueChange={setSelectedMatchId}>
              <SelectTrigger>
                <SelectValue placeholder="Select match" />
              </SelectTrigger>
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

        {/* Match info + minimap */}
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
            </div>
            <Minimap match={selectedMatch} />
          </div>
        )}
      </main>
    </div>
  );
};

export default Index;

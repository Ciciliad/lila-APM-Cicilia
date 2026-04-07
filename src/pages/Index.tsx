import { useState, useEffect } from "react";
import { MatchData, RawEvent } from "@/lib/types";
import { MOCK_MATCHES } from "@/lib/mockData";
import { transformRawEvents } from "@/lib/transformData";
import Minimap from "@/components/Minimap";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Crosshair, Users } from "lucide-react";

const Index = () => {
  const [matches, setMatches] = useState<MatchData[]>(MOCK_MATCHES);
  const [selectedMatchId, setSelectedMatchId] = useState<string>(MOCK_MATCHES[0].match_id);

  useEffect(() => {
    fetch("/data/allData.json")
      .then((res) => res.json())
      .then((data: RawEvent[]) => {
        if (Array.isArray(data) && data.length > 0) {
          const transformed = transformRawEvents(data);
          if (transformed.length > 0) {
            setMatches(transformed);
            setSelectedMatchId(transformed[0].match_id);
          }
        }
      })
      .catch(() => {
        // Keep mock data on error
      });
  }, []);

  const selectedMatch = matches.find((m) => m.match_id === selectedMatchId) ?? matches[0];
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
        <div className="flex flex-wrap items-end gap-4">
          <div className="space-y-1.5 min-w-[220px]">
            <label className="text-sm font-medium text-foreground">Match</label>
            <Select value={selectedMatchId} onValueChange={setSelectedMatchId}>
              <SelectTrigger>
                <SelectValue placeholder="Select match" />
              </SelectTrigger>
              <SelectContent>
                {matches.map((m) => (
                  <SelectItem key={m.match_id} value={m.match_id}>
                    {m.match_id.slice(0, 8)}… — {m.map_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {selectedMatch && (
          <div className="space-y-4">
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{selectedMatch.map_name}</span>
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

import { useState, useCallback } from "react";
import { MatchData } from "@/lib/types";
import Minimap from "@/components/Minimap";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Upload, Crosshair, Users } from "lucide-react";

const Index = () => {
  const [matches, setMatches] = useState<MatchData[]>([]);
  const [selectedMatchId, setSelectedMatchId] = useState<string>("");
  const [fileName, setFileName] = useState<string>("");

  const handleFileLoad = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = JSON.parse(evt.target?.result as string);
        const arr: MatchData[] = Array.isArray(data) ? data : [data];
        setMatches(arr);
        if (arr.length > 0) setSelectedMatchId(arr[0].match_id);
      } catch {
        alert("Invalid JSON file");
      }
    };
    reader.readAsText(file);
  }, []);

  const selectedMatch = matches.find((m) => m.match_id === selectedMatchId);
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
        {/* Controls */}
        <div className="flex flex-wrap items-end gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Match Data</label>
            <label className="flex items-center gap-2 cursor-pointer rounded-md border border-input bg-card px-4 py-2 text-sm text-foreground hover:bg-accent transition-colors">
              <Upload className="h-4 w-4 text-muted-foreground" />
              {fileName || "Load JSON file"}
              <input
                type="file"
                accept=".json"
                onChange={handleFileLoad}
                className="sr-only"
              />
            </label>
          </div>

          {matches.length > 0 && (
            <div className="space-y-1.5 min-w-[220px]">
              <label className="text-sm font-medium text-foreground">Match</label>
              <Select value={selectedMatchId} onValueChange={setSelectedMatchId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select match" />
                </SelectTrigger>
                <SelectContent>
                  {matches.map((m) => (
                    <SelectItem key={m.match_id} value={m.match_id}>
                      {m.match_id} — {m.map_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Match info + minimap */}
        {selectedMatch ? (
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
        ) : (
          <div className="flex flex-col items-center justify-center py-24 text-muted-foreground gap-3">
            <Crosshair className="h-12 w-12 opacity-30" />
            <p className="text-sm">Load a JSON file to view match data on the minimap.</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default Index;

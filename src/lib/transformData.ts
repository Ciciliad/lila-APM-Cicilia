import { RawEvent, MatchData, GameEvent, EventType } from "./types";

const VALID_EVENTS = new Set<string>([
  "Position", "BotPosition", "Kill", "BotKill",
  "Killed", "BotKilled", "KilledByStorm", "Loot",
]);

function parseTs(raw: unknown): number {
  if (typeof raw === "number") return raw;
  if (typeof raw === "string") return new Date(raw).getTime();
  return 0;
}

export function transformRawEvents(events: RawEvent[], date: string): MatchData[] {
  const matchMap = new Map<string, {
    map_name: string;
    players: Map<string, { x: number; z: number; ts: number; is_bot: boolean }>;
    events: GameEvent[];
    minTs: number;
    maxTs: number;
  }>();

  for (const e of events) {
    if (!VALID_EVENTS.has(e.event)) continue;

    const ts = parseTs(e.ts);

    if (!matchMap.has(e.match_id)) {
      matchMap.set(e.match_id, {
        map_name: e.map_id,
        players: new Map(),
        events: [],
        minTs: ts,
        maxTs: ts,
      });
    }
    const match = matchMap.get(e.match_id)!;

    // Track latest position per player
    const existing = match.players.get(e.user_id);
    if (!existing || ts >= existing.ts) {
      match.players.set(e.user_id, { x: e.x, z: e.z, ts, is_bot: e.is_bot });
    }

    // Store all events
    match.events.push({
      player_id: e.user_id,
      x: e.x,
      z: e.z,
      ts,
      event: e.event as EventType,
      is_bot: e.is_bot,
    });

    if (ts < match.minTs) match.minTs = ts;
    if (ts > match.maxTs) match.maxTs = ts;
  }

  return Array.from(matchMap.entries()).map(([match_id, data]) => ({
    match_id,
    map_name: data.map_name,
    date,
    players: Array.from(data.players.entries()).map(([player_id, p]) => ({
      player_id,
      x: p.x,
      z: p.z,
      is_bot: p.is_bot,
    })),
    events: data.events,
    minTs: data.minTs,
    maxTs: data.maxTs,
  }));
}

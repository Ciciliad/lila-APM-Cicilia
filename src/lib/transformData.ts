import { RawEvent, MatchData } from "./types";

/**
 * Groups raw events by match_id, takes the latest position per user per match.
 */
export function transformRawEvents(events: RawEvent[]): MatchData[] {
  const matchMap = new Map<string, { map_name: string; players: Map<string, { x: number; z: number; ts: number; is_bot: boolean }> }>();

  for (const e of events) {
    if (!matchMap.has(e.match_id)) {
      matchMap.set(e.match_id, { map_name: e.map_id, players: new Map() });
    }
    const match = matchMap.get(e.match_id)!;
    const existing = match.players.get(e.user_id);
    // Keep latest timestamp position
    if (!existing || e.ts >= existing.ts) {
      match.players.set(e.user_id, { x: e.x, z: e.z, ts: e.ts, is_bot: e.is_bot });
    }
  }

  return Array.from(matchMap.entries()).map(([match_id, data]) => ({
    match_id,
    map_name: data.map_name,
    players: Array.from(data.players.entries()).map(([player_id, p]) => ({
      player_id,
      x: p.x,
      z: p.z,
      is_bot: p.is_bot,
    })),
  }));
}

export type EventType =
  | "Position"
  | "BotPosition"
  | "Kill"
  | "BotKill"
  | "Killed"
  | "BotKilled"
  | "KilledByStorm"
  | "Loot";

export interface RawEvent {
  user_id: string;
  match_id: string;
  map_id: string;
  x: number;
  z: number;
  ts: number;
  event: string;
  is_bot: boolean;
}

export interface GameEvent {
  player_id: string;
  x: number;
  z: number;
  ts: number;
  event: EventType;
  is_bot: boolean;
}

export interface PlayerPosition {
  player_id: string;
  x: number;
  z: number;
  is_bot: boolean;
}

export interface MatchData {
  match_id: string;
  map_name: string;
  date: string;
  players: PlayerPosition[];
  events: GameEvent[];
  minTs: number;
  maxTs: number;
}

export interface DateFile {
  label: string;
  path: string;
}

export const DATE_FILES: DateFile[] = [
  { label: "February 10", path: "/data/feb10.json" },
  { label: "February 11", path: "/data/feb11.json" },
  { label: "February 12", path: "/data/feb12.json" },
  { label: "February 13", path: "/data/feb13.json" },
  { label: "February 14", path: "/data/feb14.json" },
];

export type EventLayer = "movement" | "kills" | "deaths" | "loot" | "storm";
export type HeatmapMode = "none" | "movement" | "kills" | "deaths";

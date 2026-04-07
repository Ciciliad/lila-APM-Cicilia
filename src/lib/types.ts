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

export interface PlayerPosition {
  player_id: string;
  x: number;
  z: number;
  is_bot: boolean;
}

export interface MatchData {
  match_id: string;
  map_name: string;
  players: PlayerPosition[];
}

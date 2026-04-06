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

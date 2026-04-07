import { MatchData } from "./types";

export const MOCK_MATCHES: MatchData[] = [
  {
    match_id: "demo-001",
    map_name: "AmbroseValley",
    date: "February 10",
    players: [
      { player_id: "Player1", x: -100, z: -200, is_bot: false },
      { player_id: "Player2", x: 50, z: 100, is_bot: false },
      { player_id: "Player3", x: 200, z: -50, is_bot: false },
      { player_id: "Bot1", x: 300, z: 200, is_bot: true },
      { player_id: "Bot2", x: -200, z: 300, is_bot: true },
      { player_id: "Bot3", x: 150, z: -300, is_bot: true },
    ],
  },
];

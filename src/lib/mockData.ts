import { MatchData } from "./types";

export const MOCK_MATCHES: MatchData[] = [
  {
    match_id: "demo-001",
    map_name: "AmbroseValley",
    date: "February 10",
    players: [
      { player_id: "Player1", x: -100, z: -200, is_bot: false },
      { player_id: "Bot1", x: 300, z: 200, is_bot: true },
    ],
    events: [
      { player_id: "Player1", x: -100, z: -200, ts: 0, event: "Position", is_bot: false },
      { player_id: "Bot1", x: 300, z: 200, ts: 0, event: "BotPosition", is_bot: true },
    ],
    minTs: 0,
    maxTs: 0,
  },
];

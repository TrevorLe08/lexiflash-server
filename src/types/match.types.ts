export interface MatchGameCard {
  id: string;
  cardId: string;
  type: 'term' | 'definition';
  content: string;
}

export interface MatchLeaderboardEntry {
  id: string;
  studySetId: string;
  userId: string;
  user: {
    id: string;
    name: string;
    username: string;
    avatarUrl?: string;
  };
  timeRecordMs: number;
  matchedPairs: number;
  createdAt: string;
}

export interface MatchTilesResponse {
  tiles: MatchGameCard[];
  totalPairs: number;
  sessionToken: string;
}

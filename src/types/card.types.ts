export interface Card {
  id: string;
  studySetId: string;
  term: string;
  definition: string;
  phonetic?: string;
  example?: string;
  hint?: string;
  imageUrl?: string;
  audioUrl?: string;
  orderIndex: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCardInput {
  term: string;
  definition: string;
  phonetic?: string;
  example?: string;
  hint?: string;
  imageUrl?: string;
  audioUrl?: string;
  orderIndex?: number;
}

export interface UpdateCardInput {
  term?: string;
  definition?: string;
  phonetic?: string;
  example?: string;
  hint?: string;
  imageUrl?: string;
  audioUrl?: string;
  orderIndex?: number;
}

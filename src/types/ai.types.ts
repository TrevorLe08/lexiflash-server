export interface AiGeneratedCard {
  term: string;
  definition: string;
  phonetic?: string;
  example?: string;
  hint?: string;
}

export interface AiGenerateSetResponse {
  title: string;
  description: string;
  tags: string[];
  cards: AiGeneratedCard[];
}

export interface AiExplainTermResponse {
  term: string;
  definition: string;
  phonetic: string;
  partOfSpeech: string;
  mnemonicStory: string; // Mẹo ghi nhớ dễ thương / ấn tượng
  examples: string[];
  synonyms: string[];
  antonyms: string[];
  commonCollocations: string[];
}

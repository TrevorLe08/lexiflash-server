import { QuestionType } from '../config/constants.js';

export interface TestQuestion {
  id: string;
  cardId: string;
  type: QuestionType;
  prompt: string; // The prompt question, e.g., "What is the definition of 'Epiphany'?"
  correctAnswer: string;
  options?: string[]; // 4 options for Multiple Choice
  matchingPairs?: Array<{ id: string; term: string; definition: string }>; // For Matching type
  userAnswer?: string;
  isCorrect?: boolean;
}

export interface GenerateTestOptions {
  questionCount?: number;
  questionTypes?: QuestionType[];
  starredOnly?: boolean;
  promptWith?: 'term' | 'definition' | 'both';
  password?: string;
}

export interface GeneratedTest {
  testId: string;
  studySetId: string;
  studySetTitle: string;
  totalQuestions: number;
  questions: Array<Omit<TestQuestion, 'correctAnswer' | 'isCorrect'>>;
}

export interface SubmitTestAnswer {
  questionId: string;
  cardId: string;
  userAnswer: string;
}

export interface TestResultQuestionReview {
  questionId: string;
  cardId: string;
  prompt: string;
  type: QuestionType;
  userAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
}

export interface TestHistory {
  id: string;
  userId: string;
  studySetId: string;
  scorePercentage: number;
  totalQuestions: number;
  correctCount: number;
  incorrectCount: number;
  timeSpentSeconds: number;
  questionTypes: QuestionType[];
  reviews: TestResultQuestionReview[];
  correctTerms: string[];
  incorrectTerms: string[];
  createdAt: string;
}

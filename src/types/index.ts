export type ExamDomain = 'cloud-concepts' | 'architecture-services' | 'management-governance';

export interface DomainMeta {
  id: ExamDomain;
  name: string;
  weight: string;
  shortDesc: string;
  color: string;
}

export interface QuizQuestion {
  id: string;
  domain: ExamDomain;
  topic: string;
  conceptKey: string;
  conceptTitle: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  distractorExplanations?: string[];
  examTip: string;
  difficulty: 'fundamental' | 'intermediate';
}

export interface AnswerRecord {
  questionId: string;
  selectedIndex: number;
  isCorrect: boolean;
  conceptKey: string;
  topic: string;
  domain: ExamDomain;
}

export interface QuizSessionResult {
  id: string;
  timestamp: string;
  mode: 'sprint' | 'full' | 'topic' | 'missed-drill' | 'checkpoint-drill';
  topicFilter?: string;
  totalQuestions: number;
  correctCount: number;
  scorePercent: number;
  passed: boolean; // >= 70%
  answers: AnswerRecord[];
  missedConceptKeys: string[];
}

export interface FlashcardItem {
  id: string;
  conceptKey: string;
  conceptTitle: string;
  domain: ExamDomain;
  topic: string;
  frontPrompt: string;
  frontSubtext?: string;
  backDefinition: string;
  backAnalogy: string;
  azureContext: string;
  keyTakeaway: string;
}

export interface FlashcardState {
  status: 'unreviewed' | 'know' | 'need-practice';
  reviewCount: number;
  lastReviewedAt?: string;
}

export interface ConceptCatalogItem {
  key: string;
  title: string;
  domain: ExamDomain;
  topic: string;
  summary: string;
  quickAnalogy: string;
  azureExample: string;
  commonConfusion: string;
  keyDistinction: string;
  sampleCheckQuestion: string;
}

export interface UserProgressData {
  questionsAttempted: number;
  questionsCorrect: number;
  domainStats: Record<ExamDomain, { attempted: number; correct: number }>;
  topicStats: Record<string, { attempted: number; correct: number }>;
  missedConcepts: Record<string, { conceptKey: string; conceptTitle: string; topic: string; domain: ExamDomain; frequency: number; lastMissedAt: string }>;
  flashcardStates: Record<string, FlashcardState>;
  recentQuizzes: QuizSessionResult[];
  studyStreakDays: number;
  lastActivityDate: string;
}

export interface CoachMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: string;
  isConceptIntro?: boolean;
  conceptMetadata?: {
    conceptTitle: string;
    analogy: string;
    azureContext: string;
    commonlyConfused: string;
    checkQuestion: string;
  };
}

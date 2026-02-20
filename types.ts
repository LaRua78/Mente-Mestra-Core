
export enum AppState {
  IDLE = 'IDLE',
  PARSING_GAMES = 'PARSING_GAMES',
  CONFIRM_GAMES = 'CONFIRM_GAMES',
  ANALYZING = 'ANALYZING',
  FINISHED = 'FINISHED'
}

export type BetStatus = 'pending' | 'green' | 'red' | 'void';

export interface Game {
  id: string;
  time: string;
  homeTeam: string;
  awayTeam: string;
  league: string;
}

export interface AnalysisResult {
  analysisId: string;
  game: Game;
  conclusion: string;
  recommendation: string;
  odds: string;
  value: string;
  risk: string;
  timestamp: string;
  date: string;
  status?: BetStatus;
  profit?: number;
  fullText?: string; // Novo: Texto completo da análise
  sources?: { title: string; uri: string }[]; // Novo: Fontes da análise
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  sources?: { title: string; uri: string }[];
}

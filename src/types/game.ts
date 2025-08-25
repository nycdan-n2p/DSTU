export interface GameIntro {
  title: string;
  subtitle: string;
  text: string; // Keep this for component compatibility
  texts: string[];
}

export interface Sponsor {
  text: string;
  image_url?: string;
}

export interface QuestionFeedback {
  text: string;
}

export interface GroupFeedback {
  correct: string[];
  wrong: string[];
  fastest: string[];
  slowest: string[];
}

export interface MultipleChoiceQuestion {
  type: 'multiple_choice';
  id?: string;
  prompt: string;
  options: string[];
  correct_index: number;
  timer: number;
  image_url?: string; // ✅ NEW: Optional image URL for questions
  feedback: {
    correct: QuestionFeedback;
    wrong: QuestionFeedback;
  };
}

export interface DisOrDatItem {
  label: string;
  answer: 'crypto' | 'cleaning';
  feedback: string;
}

export interface DisOrDatQuestion {
  type: 'dis_or_dat';
  title: string;
  subtitle: string;
  timer: number;
  items: DisOrDatItem[];
}

export interface TrickQuestion {
  type: 'multiple_choice';
  id?: string;
  prompt: string;
  options: string[];
  correct_index: -1;
  timer: number;
  image_url?: string; // ✅ NEW: Optional image URL for questions
  feedback: {
    any: QuestionFeedback;
  };
}

export type Question = MultipleChoiceQuestion | DisOrDatQuestion | TrickQuestion;

export interface Award {
  title: string;
  description: string;
}

export interface GameData {
  intro: GameIntro;
  sponsors: Sponsor[];
  group_feedback: GroupFeedback;
  questions: Question[];
  awards: Award[];
}

export interface Player {
  id: string;
  name: string;
  score: number;
  answers: PlayerAnswer[];
  joined_at: string;
  // ✅ NEW: Individual player session tracking
  current_phase?: string;
  current_question?: number;
  question_start_time?: string;
  has_submitted?: boolean;
  last_updated?: string;
}

export interface PlayerAnswer {
  question_index: number;
  answer: string | number;
  is_correct: boolean;
  response_time: number;
  answered_at: string;
  pointsEarned?: number; // ✅ NEW: Track points earned for this answer
}

export interface GameSession {
  id: string;
  host_id: string;
  current_question: number;
  current_phase: 'waiting' | 'question' | 'results' | 'sponsor1' | 'sponsor2' | 'podium' | 'final';
  question_start_time?: string;
  current_question_options_shuffled?: string[]; // ✅ NEW: Store shuffled options for current question
  created_at: string;
  players: Player[];
  num_sponsor_breaks?: number; // ✅ NEW: Number of sponsor breaks configured for this session
}

export interface QuestionResult {
  question_index: number;
  correct_players: Player[];
  wrong_players: Player[];
  fastest_player?: Player;
  slowest_player?: Player;
  snarky_comments: string[];
}

// ✅ NEW: Interface for uploaded questions from CSV
export interface UploadedQuestion {
  id?: string;
  prompt: string;
  correctAnswer: string;
  wrongAnswers: string[];
  sarcasmLevel: number;
  hasWrongAnswers: boolean;
  isGenerating?: boolean;
  generationError?: string;
  image_url?: string; // ✅ NEW: Optional image URL for questions
  selectedImageFile?: File; // ✅ NEW: File object for image upload
  previewImageUrl?: string; // ✅ NEW: Local preview URL for selected image
  isUploadingImage?: boolean; // ✅ NEW: Loading state for image upload
}
// ✅ NEW: Interface for custom sponsor messages
export interface CustomSponsor {
  id: string;
  session_id: string;
  text: string;
  created_at: string;
}
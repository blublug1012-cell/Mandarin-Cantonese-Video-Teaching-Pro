
export type Language = 'Mandarin' | 'Cantonese';

export interface Vocab {
  char: string;
  pinyin: string;
  explanation: string;
}

export interface LyricLine {
  id: string;
  startTime: number;
  endTime: number;
  chinese: string;
  pinyin: string;
  english: string;
  vocabs: Vocab[];
  isHomework: boolean; // Added to select specific lines for homework
}

export interface Question {
  id: string;
  timestamp: number;
  question: string;
  options: string[];
  correctIndex: number;
}

export interface LessonData {
  id: string;
  title: string;
  videoUrl: string;
  language: Language;
  lyrics: LyricLine[];
  questions: Question[];
}

export interface StudentResult {
  studentId: string;
  lessonId: string;
  score: number;
  completed: boolean;
  timestamp: string;
}

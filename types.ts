
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
  isHomework: boolean;
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
  lastModified: number;
}

export interface Student {
  id: string;
  name: string;
  assignedLessons: string[];
}

export interface Database {
  lessons: Record<string, LessonData>;
  students: Student[];
}

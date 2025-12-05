export enum Language {
  ITALIAN = 'Italian',
  ENGLISH = 'English',
  FRENCH = 'French',
  GERMAN = 'German',
  CHINESE = 'Mandarin Chinese'
}

export interface SessionConfig {
  languageA: Language;
  languageB: Language;
  splitAudio: boolean; // If true, route Lang A translation to Left, Lang B to Right
}

export interface MessageLog {
  id: string;
  source: 'user' | 'ai';
  text: string;
  timestamp: Date;
}

export type ConnectionState = 'disconnected' | 'requesting_permission' | 'connecting' | 'connected' | 'error';
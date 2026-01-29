
export enum AppTheme {
  LIGHT = 'light',
  DARK = 'dark',
}

export type Language = 'es' | 'en' | 'fr' | 'it';

export interface UserProfile {
  username: string;
  email: string;
  onboardingComplete: boolean;
  purposeAnalysis?: string; 
  purposeStatement?: string; 
}

export interface OnboardingAnswers {
  interests: string[]; // What do you love? (Selections)
  otherInterests: string; // What do you love? (Custom text)
  skills: string[];  // Multiple choice: What are you good at?
  otherSkills: string; // What are you good at? (Custom text)
  worldNeeds: string[]; // Multiple choice: What does the world need?
  otherWorldNeeds: string; // What does the world need? (Custom text)
  professionalVision: string; // Open: Professional legacy
  personalValues: string; // Open: Non-negotiable values
}

export interface JournalEntry {
  id: string;
  title: string; 
  date: string; 
  timestamp: number;
  personal: string;
  family: string;
  professional: string;
  images: string[]; 
  voiceRecording?: string; // Base64 del audio grabado
  sentiment?: string; 
  sentimentSummary?: string;
  emotionalProfile?: Record<string, number>; 
}

export interface AppSettings {
  theme: AppTheme;
  fontSize: 'small' | 'medium' | 'large';
  language: Language;
}

export interface Message {
  role: 'user' | 'model';
  content: string;
  type?: 'text' | 'map_result' | 'search_result';
  metadata?: any;
}

export type GoalTerm = 'short-term' | 'long-term';
export type GoalDomain = 'personal' | 'family' | 'professional';
export type GoalStatus = 'suggested' | 'active' | 'completed';

export interface Goal {
  id: string;
  title: string;
  description: string;
  term: GoalTerm;
  domain: GoalDomain;
  status: GoalStatus;
  createdAt: number;
  isAiGenerated: boolean;
}
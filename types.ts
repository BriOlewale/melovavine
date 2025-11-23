export interface Sentence {
  id: number;
  english: string;
  projectId?: string;
  
  // Smart Queue Fields
  priorityScore: number; // Calculated score (higher = show first)
  difficulty: 1 | 2 | 3; // 1=Short/Easy, 3=Long/Complex
  length: number;
  
  // Translation State
  status: 'open' | 'needs_review' | 'approved';
  translationCount: number; // How many people have translated this?
  targetTranslations: number; // Goal (e.g., 2 or 3 before approval)
  
  // Distributed Locking
  lockedBy?: string | null; // User ID
  lockedUntil?: number | null; // Timestamp
}

export interface TranslationHistoryEntry {
  timestamp: number;
  action: 'created' | 'updated' | 'approved' | 'rejected';
  userId: string;
  userName: string;
  details?: {
    oldText?: string;
    newText?: string;
    feedback?: string | null;
  };
}

export interface Comment {
  id: string;
  userId: string;
  userName: string;
  text: string;
  timestamp: number;
}

export interface Translation {
  id: string;
  sentenceId: number;
  text: string;
  languageCode: string;
  translatorId: string;
  timestamp: number;
  votes: number;
  voteHistory?: Record<string, 'up' | 'down'>;
  isAiSuggested?: boolean;
  status: 'pending' | 'approved' | 'rejected';
  reviewedBy?: string;
  reviewedAt?: number;
  feedback?: string | null;
  history?: TranslationHistoryEntry[];
  comments?: Comment[];
  aiQualityScore?: number;
  aiQualityFeedback?: string;
}

export interface Word {
  id: string;
  text: string;
  normalizedText: string;
}

export interface WordTranslation {
  id: string;
  wordId: string;
  languageCode: string;
  translation: string;
  notes?: string;
  exampleSentenceId?: number;
  createdByUserId: string;
  timestamp: number;
}

export type Permission = 
  | '*' 
  | 'user.read' | 'user.create' | 'user.edit' | 'user.delete' | 'user.manage_roles'
  | 'group.read' | 'group.create' | 'group.edit' | 'group.delete'
  | 'project.read' | 'project.create' | 'project.edit'
  | 'translation.create' | 'translation.edit' | 'translation.review' | 'translation.approve' | 'translation.delete'
  | 'dictionary.manage'
  | 'data.import' | 'data.export'
  | 'audit.view'
  | 'community.manage'
  | 'system.manage';

export interface User {
  id: string;
  name: string;
  role: 'admin' | 'translator' | 'reviewer' | 'guest';
  email: string;
  isActive?: boolean;
  isVerified?: boolean; 
  groupIds?: string[];
  effectivePermissions?: Permission[];
  // Cache of translated sentence IDs to avoid re-fetching
  translatedSentenceIds?: number[]; 
}

export interface UserGroup {
    id: string;
    name: string;
    permissions: Permission[]; 
    description?: string;
}

export interface Project {
    id: string;
    name: string;
    targetLanguageCode: string;
    status: 'active' | 'completed' | 'archived' | 'draft';
    description?: string;
    managerId?: string;
    createdAt: number;
}

export interface AuditLog {
    id: string;
    action: string;
    userId: string;
    userName: string;
    details: string;
    timestamp: number;
    category: 'security' | 'data' | 'system' | 'moderation';
}

export interface Language {
  code: string;
  name: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  date: number;
  author: string;
}

export interface ForumReply {
  id: string;
  content: string;
  authorName: string;
  authorId: string;
  date: number;
}

export interface ForumTopic {
  id: string;
  title: string;
  content: string;
  authorName: string;
  authorId: string;
  date: number;
  replies: ForumReply[];
  category: 'general' | 'help' | 'feedback';
}

export interface ResourceItem {
  id: string;
  title: string;
  description: string;
  type: 'video' | 'document' | 'link';
  url: string;
}

export interface SystemSettings {
  geminiApiKey?: string;
  showDemoBanner: boolean;
  maintenanceMode: boolean;
  // EmailJS Configuration
  emailJsServiceId?: string;
  emailJsTemplateId?: string;
  emailJsPublicKey?: string;
}

export interface AppState {
  sentences: Sentence[];
  translations: Translation[];
  currentUser: User | null;
  targetLanguage: Language;
}

export const PNG_LANGUAGES: Language[] = [
  { code: 'hula', name: 'Hula' },
];
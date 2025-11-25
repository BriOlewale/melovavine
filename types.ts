export interface Sentence {
  id: number;
  english: string;
  projectId?: string;
  priorityScore: number; 
  difficulty: 1 | 2 | 3; // 1=Easy, 2=Medium, 3=Hard
  length: number;
  status: 'open' | 'needs_review' | 'approved';
  translationCount: number; 
  targetTranslations: number; 
  lockedBy?: string | null; 
  lockedUntil?: number | null; 
}

export interface TranslationReview {
  id: string;
  translationId: string;
  reviewerId: string;
  reviewerName: string;
  action: 'approved' | 'rejected' | 'edited'; // 'edited' = minor fix
  comment?: string; // Required when action === 'rejected'
  previousText?: string; // For 'edited'
  newText?: string; // For 'edited'
  aiConfidence?: number; // Optional AI score at time of review
  createdAt: number;
}

export type TranslationHistoryAction = 
  | 'created' 
  | 'edited' 
  | 'approved' 
  | 'rejected' 
  | 'needs_attention'
  | 'spell_correction' 
  | 'status_change';

export interface TranslationHistoryEntry {
  timestamp: number;
  action: TranslationHistoryAction;
  userId: string;
  userName: string;
  details?: {
    oldText?: string;
    newText?: string;
    feedback?: string | null;
    reason?: string;
    suggestionId?: string;
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
  
  // Enhanced Status & Review Fields
  status: 'pending' | 'approved' | 'rejected' | 'needs_attention';
  reviewedBy?: string | null;
  reviewedAt?: number | null;
  lastReviewedAt?: number; // Alias for easier querying
  lastReviewerId?: string;
  reviewCount?: number;
  feedback?: string | null;
  
  // New Review History (RX2)
  reviewHistory?: TranslationReview[];

  history?: TranslationHistoryEntry[]; // Legacy/Generic history
  comments?: Comment[];
  aiQualityScore?: number;
  aiQualityFeedback?: string;
}

export interface Report {
   id: string;
   type: 'sentence' | 'translation';
   sentenceId?: number;
   translationId?: string;
   reportedBy: string;
   reportedByName: string;
   reason: string;
   timestamp: number;
   status: 'open' | 'reviewed';
   adminNotes?: string;
}

export interface SpellingSuggestion {
  id: string;
  translationId: string;
  originalText: string;
  suggestedText: string;
  reason?: string;
  status: 'open' | 'accepted' | 'rejected';
  createdAt: number;
  createdByUserId: string;
  createdByUserName: string;
  resolvedAt?: number;
  resolvedByUserId?: string;
  resolvedByUserName?: string;
  rejectionReason?: string;
}

// Categories to organize dictionary words
export type WordCategory =
  | 'family'
  | 'people'
  | 'food'
  | 'ocean'
  | 'nature'
  | 'body'
  | 'animals'
  | 'village'
  | 'culture'
  | 'emotion'
  | 'numbers'
  | 'colors'
  | 'tools'
  | 'places'
  | 'time'
  | 'other';

export interface Word {
  id: string;
  text: string;
  
  // Dictionary Enrichment
  normalizedText?: string; // lower-cased version used for search
  meanings?: string[]; // Hula or target-language meanings / glosses
  categories?: WordCategory[]; // optional topic grouping
  notes?: string; // optional cultural / usage note
  frequency?: number; // how often this word appears in the corpus
  
  // Audit Metadata
  createdAt?: number;
  updatedAt?: number;
  createdBy?: string;
  updatedBy?: string; 
  language?: string; // Optional for future multi-lang support
}

export interface WordCorrection {
  id: string;
  wordId: string;
  suggestedBy: string;     // userId
  suggestedByName: string; // for display
  suggestionType: 'meaning' | 'spelling' | 'category' | 'note';
  oldValue: any;
  newValue: any;
  createdAt: number;
  status: 'pending' | 'approved' | 'rejected';
  reviewedBy?: string;      // userId
  reviewedByName?: string;
  reviewedAt?: number;
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
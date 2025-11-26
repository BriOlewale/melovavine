export type Role = 'admin' | 'reviewer' | 'translator' | 'guest' | 'contributor' | 'viewer';

export type Permission =
  | 'user.read'
  | 'user.create'
  | 'user.edit'
  | 'user.delete'
  | 'user.manage_roles'
  | 'user.disable'
  | 'role.assign'
  | 'group.read'
  | 'group.create'
  | 'group.edit'
  | 'group.delete'
  | 'project.read'
  | 'project.create'
  | 'project.edit'
  | 'translation.create'
  | 'translation.edit'
  | 'translation.delete'
  | 'translation.review'
  | 'translation.approve'
  | 'dictionary.manage'
  | 'data.import'
  | 'data.export'
  | 'audit.view'
  | 'community.manage'
  | 'system.manage'
  | '*';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  isActive: boolean;
  isVerified?: boolean;
  emailVerified: boolean;
  
  // Permissions & Groups
  permissions?: Permission[]; // Direct permissions (legacy or specific)
  groupIds?: string[];
  effectivePermissions?: Permission[]; // Calculated including groups
  
  // App Data
  createdAt?: number;
  lastLoginAt?: number;
  isDisabled?: boolean;
  translatedSentenceIds?: number[];
}

export type ReviewAction = 'approved' | 'rejected' | 'edited' | 'needs_attention';

export interface TranslationReview {
  id: string;
  translationId: string;
  reviewerId: string;
  reviewerName: string;
  action: ReviewAction;
  comment?: string;
  previousText?: string;
  newText?: string;
  aiConfidence?: number;
  createdAt: number;
}

// Re-export other types to maintain file integrity
export interface Sentence { id: number; english: string; projectId?: string; priorityScore: number; difficulty: 1 | 2 | 3; length: number; status: 'open' | 'needs_review' | 'approved'; translationCount: number; targetTranslations: number; lockedBy?: string | null; lockedUntil?: number | null; }
export type TranslationHistoryAction = 'created' | 'edited' | 'approved' | 'rejected' | 'needs_attention' | 'spell_correction' | 'status_change';
export interface TranslationHistoryEntry { timestamp: number; action: TranslationHistoryAction; userId: string; userName: string; details?: { oldText?: string; newText?: string; feedback?: string | null; reason?: string; suggestionId?: string; }; }
export interface Comment { id: string; userId: string; userName: string; text: string; timestamp: number; }
export interface Translation { id: string; sentenceId: number; text: string; languageCode: string; translatorId: string; timestamp: number; votes: number; voteHistory?: Record<string, 'up' | 'down'>; isAiSuggested?: boolean; status: 'pending' | 'approved' | 'rejected' | 'needs_attention'; reviewedBy?: string | null; reviewedAt?: number | null; lastReviewedAt?: number; lastReviewerId?: string; reviewCount?: number; feedback?: string | null; reviewHistory?: TranslationReview[]; history?: TranslationHistoryEntry[]; comments?: Comment[]; aiQualityScore?: number; aiQualityFeedback?: string; }
export interface Report { id: string; type: 'sentence' | 'translation'; sentenceId?: number; translationId?: string; reportedBy: string; reportedByName: string; reason: string; timestamp: number; status: 'open' | 'reviewed'; adminNotes?: string; }
export interface SpellingSuggestion { id: string; translationId: string; originalText: string; suggestedText: string; reason?: string; status: 'open' | 'accepted' | 'rejected'; createdAt: number; createdByUserId: string; createdByUserName: string; resolvedAt?: number; resolvedByUserId?: string; resolvedByUserName?: string; rejectionReason?: string; }
export type WordCategory = 'family' | 'people' | 'food' | 'ocean' | 'nature' | 'body' | 'animals' | 'village' | 'culture' | 'emotion' | 'numbers' | 'colors' | 'tools' | 'places' | 'time' | 'other';
export interface Word { id: string; text: string; normalizedText?: string; meanings?: string[]; categories?: WordCategory[]; notes?: string; frequency?: number; createdAt?: number; updatedAt?: number; createdBy?: string; updatedBy?: string; language?: string; }
export interface WordCorrection { id: string; wordId: string; suggestedBy: string; suggestedByName: string; suggestionType: 'meaning' | 'spelling' | 'category' | 'note'; oldValue: any; newValue: any; createdAt: number; status: 'pending' | 'approved' | 'rejected'; reviewedBy?: string; reviewedByName?: string; reviewedAt?: number; }
export interface WordTranslation { id: string; wordId: string; languageCode: string; translation: string; notes?: string; exampleSentenceId?: number; createdByUserId: string; timestamp: number; }
export interface UserGroup { id: string; name: string; permissions: Permission[]; description?: string; }
export interface Project { id: string; name: string; targetLanguageCode: string; status: 'active' | 'completed' | 'archived' | 'draft'; description?: string; managerId?: string; createdAt: number; }
export interface AuditLog { id: string; action: string; userId: string; userName: string; details: string; timestamp: number; category: 'security' | 'data' | 'system' | 'moderation'; }
export interface Language { code: string; name: string; }
export interface Announcement { id: string; title: string; content: string; date: number; author: string; }
export interface ForumReply { id: string; content: string; authorName: string; authorId: string; date: number; }
export interface ForumTopic { id: string; title: string; content: string; authorName: string; authorId: string; date: number; replies: ForumReply[]; category: 'general' | 'help' | 'feedback'; }
export interface ResourceItem { id: string; title: string; description: string; type: 'video' | 'document' | 'link'; url: string; }
export interface SystemSettings { showDemoBanner: boolean; maintenanceMode: boolean; }
export const ROLE_BASE_PERMISSIONS: Record<string, Permission[]> = {
  admin: ['*'],
  reviewer: ['translation.review', 'translation.approve'],
  translator: ['translation.create', 'translation.edit'],
  guest: []
};
export const PNG_LANGUAGES: Language[] = [{ code: 'hula', name: 'Hula' }];
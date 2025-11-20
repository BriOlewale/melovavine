import { Sentence, Translation, User, Language, Word, WordTranslation, Announcement, ForumTopic, Project, UserGroup, AuditLog, Permission, SystemSettings } from '../types';

const STORAGE_KEYS = {
  SENTENCES: 'bilum_sentences',
  TRANSLATIONS: 'bilum_translations',
  CURRENT_USER: 'bilum_current_user_session',
  TARGET_LANG: 'bilum_target_lang',
  USERS: 'bilum_users_db',
  WORDS: 'bilum_words',
  WORD_TRANSLATIONS: 'bilum_word_translations',
  ANNOUNCEMENTS: 'bilum_announcements',
  FORUM_TOPICS: 'bilum_forum_topics',
  PROJECTS: 'bilum_projects',
  USER_GROUPS: 'bilum_user_groups',
  AUDIT_LOGS: 'bilum_audit_logs',
  SYSTEM_SETTINGS: 'bilum_system_settings'
};

interface StoredUser extends User {
    password?: string;
    isVerified?: boolean;
    verificationToken?: string;
    resetToken?: string;
}

const ROLE_BASE_PERMISSIONS: Record<string, Permission[]> = {
    'admin': ['user.read', 'user.create', 'user.edit', 'group.read', 'project.read', 'project.create', 'data.import', 'data.export', 'audit.view', 'community.manage', 'translation.delete', 'system.manage'],
    'reviewer': ['translation.review', 'translation.approve', 'translation.edit', 'dictionary.manage'],
    'translator': ['translation.create', 'translation.edit'],
    'guest': []
};

export const ALL_PERMISSIONS: Permission[] = [
    'user.read', 'user.create', 'user.edit', 'user.delete', 'user.manage_roles',
    'group.read', 'group.create', 'group.edit', 'group.delete',
    'project.read', 'project.create', 'project.edit',
    'translation.create', 'translation.edit', 'translation.review', 'translation.approve', 'translation.delete',
    'dictionary.manage', 'data.import', 'data.export', 'audit.view', 'community.manage', 'system.manage'
];

export const StorageService = {
  getSentences: (): Sentence[] => JSON.parse(localStorage.getItem(STORAGE_KEYS.SENTENCES) || '[]'),
  saveSentences: (sentences: Sentence[]) => localStorage.setItem(STORAGE_KEYS.SENTENCES, JSON.stringify(sentences)),
  
  getTranslations: (): Translation[] => JSON.parse(localStorage.getItem(STORAGE_KEYS.TRANSLATIONS) || '[]'),
  saveTranslation: (translation: Translation) => {
    const list = StorageService.getTranslations();
    const idx = list.findIndex(t => t.id === translation.id);
    if (idx >= 0) list[idx] = translation; else list.push(translation);
    localStorage.setItem(STORAGE_KEYS.TRANSLATIONS, JSON.stringify(list));
  },
  deleteTranslation: (id: string) => {
      const list = StorageService.getTranslations().filter(t => t.id !== id);
      localStorage.setItem(STORAGE_KEYS.TRANSLATIONS, JSON.stringify(list));
  },

  getTargetLanguage: (): Language => JSON.parse(localStorage.getItem(STORAGE_KEYS.TARGET_LANG) || '{"code":"hula","name":"Hula"}'),
  setTargetLanguage: (lang: Language) => localStorage.setItem(STORAGE_KEYS.TARGET_LANG, JSON.stringify(lang)),

  getProjects: (): Project[] => {
      const data = localStorage.getItem(STORAGE_KEYS.PROJECTS);
      if (!data) return [{ id: 'default-project', name: 'General', targetLanguageCode: 'hula', status: 'active', createdAt: Date.now() }];
      return JSON.parse(data);
  },
  saveProject: (project: Project) => {
      const list = StorageService.getProjects();
      const idx = list.findIndex(p => p.id === project.id);
      if (idx >= 0) list[idx] = project; else list.push(project);
      localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(list));
  },

  getUserGroups: (): UserGroup[] => {
      const data = localStorage.getItem(STORAGE_KEYS.USER_GROUPS);
      if (!data) return [
              { id: 'g-admin', name: 'Administrators', permissions: ['*'], description: 'Full Access' },
              { id: 'g-review', name: 'Reviewers', permissions: ['translation.review', 'translation.approve'], description: 'Moderators' },
              { id: 'g-trans', name: 'Translators', permissions: ['translation.create'], description: 'Contributors' }
          ];
      return JSON.parse(data);
  },
  saveUserGroup: (group: UserGroup) => {
      const list = StorageService.getUserGroups();
      const idx = list.findIndex(g => g.id === group.id);
      if (idx >= 0) list[idx] = group; else list.push(group);
      localStorage.setItem(STORAGE_KEYS.USER_GROUPS, JSON.stringify(list));
  },
  deleteUserGroup: (id: string) => {
      const list = StorageService.getUserGroups().filter(g => g.id !== id);
      localStorage.setItem(STORAGE_KEYS.USER_GROUPS, JSON.stringify(list));
  },

  calculateEffectivePermissions: (user: User): Permission[] => {
      const groups = StorageService.getUserGroups();
      const rolePerms = ROLE_BASE_PERMISSIONS[user.role] || [];
      let groupPerms: Permission[] = [];
      user.groupIds?.forEach(gid => {
          const g = groups.find(x => x.id === gid);
          if (g) groupPerms = [...groupPerms, ...g.permissions];
      });
      return Array.from(new Set([...rolePerms, ...groupPerms]));
  },
  hasPermission: (user: User | null, permission: Permission): boolean => {
      if (!user || !user.effectivePermissions) return false;
      return user.effectivePermissions.includes('*') || user.effectivePermissions.includes(permission);
  },

  getAuditLogs: (): AuditLog[] => JSON.parse(localStorage.getItem(STORAGE_KEYS.AUDIT_LOGS) || '[]'),
  logAuditAction: (user: User, action: string, details: string, category: AuditLog['category'] = 'system') => {
      const logs = StorageService.getAuditLogs();
      logs.unshift({ id: crypto.randomUUID(), action, userId: user.id, userName: user.name, details, timestamp: Date.now(), category });
      localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(logs.slice(0, 1000)));
  },

  getWords: (): Word[] => JSON.parse(localStorage.getItem(STORAGE_KEYS.WORDS) || '[]'),
  saveWord: (word: Word) => {
      const list = StorageService.getWords();
      const idx = list.findIndex(w => w.normalizedText === word.normalizedText);
      if (idx >= 0) list[idx] = word; else list.push(word);
      localStorage.setItem(STORAGE_KEYS.WORDS, JSON.stringify(list));
  },
  getWordTranslations: (): WordTranslation[] => JSON.parse(localStorage.getItem(STORAGE_KEYS.WORD_TRANSLATIONS) || '[]'),
  saveWordTranslation: (wt: WordTranslation) => {
      const list = StorageService.getWordTranslations();
      const idx = list.findIndex(w => w.id === wt.id);
      if (idx >= 0) list[idx] = wt; else list.push(wt);
      localStorage.setItem(STORAGE_KEYS.WORD_TRANSLATIONS, JSON.stringify(list));
  },

  getAnnouncements: (): Announcement[] => JSON.parse(localStorage.getItem(STORAGE_KEYS.ANNOUNCEMENTS) || '[]'),
  saveAnnouncement: (a: Announcement) => {
      const list = StorageService.getAnnouncements();
      list.unshift(a);
      localStorage.setItem(STORAGE_KEYS.ANNOUNCEMENTS, JSON.stringify(list));
  },
  getForumTopics: (): ForumTopic[] => JSON.parse(localStorage.getItem(STORAGE_KEYS.FORUM_TOPICS) || '[]'),
  saveForumTopic: (t: ForumTopic) => {
      const list = StorageService.getForumTopics();
      const idx = list.findIndex(x => x.id === t.id);
      if (idx >= 0) list[idx] = t; else list.unshift(t);
      localStorage.setItem(STORAGE_KEYS.FORUM_TOPICS, JSON.stringify(list));
  },

  getSystemSettings: (): SystemSettings => JSON.parse(localStorage.getItem(STORAGE_KEYS.SYSTEM_SETTINGS) || '{"geminiApiKey":"","showDemoBanner":true,"maintenanceMode":false}'),
  saveSystemSettings: (s: SystemSettings) => localStorage.setItem(STORAGE_KEYS.SYSTEM_SETTINGS, JSON.stringify(s)),
  
  clearAll: () => localStorage.clear(),

  // Auth
  getStoredUsers: (): StoredUser[] => JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]'),
  saveStoredUsers: (u: StoredUser[]) => localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(u)),
  getAllUsers: (): User[] => StorageService.getStoredUsers().map(u => ({ id: u.id, name: u.name, role: u.role, email: u.email, isActive: u.isActive, groupIds: u.groupIds })),
  
  getCurrentUser: (): User | null => JSON.parse(localStorage.getItem(STORAGE_KEYS.CURRENT_USER) || 'null'),
  saveCurrentUser: (u: User) => localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(u)),
  logout: () => localStorage.removeItem(STORAGE_KEYS.CURRENT_USER),

  login: async (email: string, password: string) => {
      const users = StorageService.getStoredUsers();
      if (email.toLowerCase() === 'brime.olewale@gmail.com' && password === 'admin') {
           let su = users.find(u => u.email === email);
           if (!su) {
               su = { id: 'super-admin', name: 'Brime Olewale', email, role: 'admin', isActive: true, groupIds: ['g-admin'], password: 'admin', isVerified: true };
               users.push(su);
               StorageService.saveStoredUsers(users);
           }
           const session = { ...su, effectivePermissions: ['*'] as Permission[] };
           StorageService.saveCurrentUser(session);
           return { success: true, user: session };
      }
      const user = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
      if (!user || !user.isActive) return { success: false, message: 'Invalid login' };
      
      const session = { ...user, effectivePermissions: StorageService.calculateEffectivePermissions(user) };
      StorageService.saveCurrentUser(session);
      return { success: true, user: session };
  },
  register: async (email: string, password: string, name: string) => {
      const users = StorageService.getStoredUsers();
      if (users.find(u => u.email === email)) return { success: false, message: 'Email exists' };
      const newUser = { id: crypto.randomUUID(), name, email, role: 'translator' as const, password, isVerified: false, isActive: true, verificationToken: '123', groupIds: ['g-trans'] };
      users.push(newUser);
      StorageService.saveStoredUsers(users);
      return { success: true, token: '123' };
  },
  verifyEmail: (token: string) => {
      const users = StorageService.getStoredUsers();
      const u = users.find(x => x.verificationToken === token);
      if (!u) return { success: false, message: 'Invalid' };
      u.isVerified = true; u.verificationToken = undefined;
      StorageService.saveStoredUsers(users);
      return { success: true, message: 'Verified' };
  },
  requestPasswordReset: (_email: string) => ({ success: true, token: '123' }),
  updateUser: (u: User) => {
      const users = StorageService.getStoredUsers();
      const idx = users.findIndex(x => x.id === u.id);
      if (idx >= 0) { users[idx] = { ...users[idx], ...u }; StorageService.saveStoredUsers(users); }
  },
  adminSetUserPassword: (userId: string, newPass: string) => {
      const users = StorageService.getStoredUsers();
      const u = users.find(x => x.id === userId);
      if (u) { u.password = newPass; StorageService.saveStoredUsers(users); }
  }
};
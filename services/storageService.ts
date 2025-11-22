import { Sentence, Translation, User, Word, WordTranslation, Announcement, ForumTopic, Project, UserGroup, AuditLog, Permission, SystemSettings } from '../types';
import { db, auth } from './firebaseConfig';
import { 
  collection, getDocs, doc, setDoc, addDoc, updateDoc, deleteDoc, query, orderBy, limit, writeBatch, getDoc 
} from 'firebase/firestore';
import { 
  signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut
} from 'firebase/auth';

// ... (Permissions Arrays are same as before) ...
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

const mapDocs = <T>(snapshot: any): T[] => snapshot.docs.map((d: any) => ({ ...d.data(), id: d.id }));

export const StorageService = {
  // --- SENTENCES ---
  getSentences: async (): Promise<Sentence[]> => {
    const q = query(collection(db, 'sentences'), limit(2000)); 
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as Sentence); 
  },
  
  // UPDATED BATCH UPLOAD WITH PROGRESS
  saveSentences: async (sentences: Sentence[], onProgress?: (count: number) => void) => {
    const CHUNK_SIZE = 450;
    for (let i = 0; i < sentences.length; i += CHUNK_SIZE) {
        const chunk = sentences.slice(i, i + CHUNK_SIZE);
        const batch = writeBatch(db);
        chunk.forEach(s => {
            if (s.id) {
                const ref = doc(db, 'sentences', s.id.toString());
                batch.set(ref, s);
            }
        });
        await batch.commit();
        if (onProgress) onProgress(Math.min(i + CHUNK_SIZE, sentences.length));
        // Small delay to prevent rate limiting
        await new Promise(r => setTimeout(r, 100));
    }
  },

  // ... (Rest of the file remains the same, just pasting the key parts for context) ...
  getTranslations: async (): Promise<Translation[]> => {
    const snap = await getDocs(collection(db, 'translations'));
    return mapDocs<Translation>(snap);
  },
  saveTranslation: async (translation: Translation) => {
    await setDoc(doc(db, 'translations', translation.id), translation);
  },
  deleteTranslation: async (id: string) => {
    await deleteDoc(doc(db, 'translations', id));
  },
  getProjects: async (): Promise<Project[]> => {
      const snap = await getDocs(collection(db, 'projects'));
      const projects = mapDocs<Project>(snap);
      if (projects.length === 0) {
          return [{ id: 'default-project', name: 'General', targetLanguageCode: 'hula', status: 'active', createdAt: Date.now() }];
      }
      return projects;
  },
  saveProject: async (project: Project) => {
      await setDoc(doc(db, 'projects', project.id), project);
  },
  getUserGroups: async (): Promise<UserGroup[]> => {
      const snap = await getDocs(collection(db, 'user_groups'));
      const groups = mapDocs<UserGroup>(snap);
      if (groups.length === 0) {
          return [
              { id: 'g-admin', name: 'Administrators', permissions: ['*'], description: 'Full Access' },
              { id: 'g-review', name: 'Reviewers', permissions: ['translation.review', 'translation.approve'], description: 'Moderators' },
              { id: 'g-trans', name: 'Translators', permissions: ['translation.create'], description: 'Contributors' }
          ];
      }
      return groups;
  },
  saveUserGroup: async (group: UserGroup) => {
      await setDoc(doc(db, 'user_groups', group.id), group);
  },
  calculateEffectivePermissions: async (user: User): Promise<Permission[]> => {
      const groups = await StorageService.getUserGroups();
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
  getAuditLogs: async (): Promise<AuditLog[]> => {
      const q = query(collection(db, 'audit_logs'), orderBy('timestamp', 'desc'), limit(200));
      const snap = await getDocs(q);
      return mapDocs<AuditLog>(snap);
  },
  logAuditAction: async (user: User, action: string, details: string, category: AuditLog['category'] = 'system') => {
      await addDoc(collection(db, 'audit_logs'), {
          action, userId: user.id, userName: user.name, details, timestamp: Date.now(), category
      });
  },
  getWords: async (): Promise<Word[]> => {
      const snap = await getDocs(collection(db, 'words'));
      return mapDocs<Word>(snap);
  },
  saveWord: async (word: Word) => {
      await setDoc(doc(db, 'words', word.id), word);
  },
  getWordTranslations: async (): Promise<WordTranslation[]> => {
      const snap = await getDocs(collection(db, 'word_translations'));
      return mapDocs<WordTranslation>(snap);
  },
  saveWordTranslation: async (wt: WordTranslation) => {
      await setDoc(doc(db, 'word_translations', wt.id), wt);
  },
  getAnnouncements: async (): Promise<Announcement[]> => {
      const q = query(collection(db, 'announcements'), orderBy('date', 'desc'));
      const snap = await getDocs(q);
      return mapDocs<Announcement>(snap);
  },
  saveAnnouncement: async (a: Announcement) => {
      await setDoc(doc(db, 'announcements', a.id), a);
  },
  getForumTopics: async (): Promise<ForumTopic[]> => {
      const q = query(collection(db, 'forum_topics'), orderBy('date', 'desc'));
      const snap = await getDocs(q);
      return mapDocs<ForumTopic>(snap);
  },
  saveForumTopic: async (t: ForumTopic) => {
      await setDoc(doc(db, 'forum_topics', t.id), t);
  },
  getSystemSettings: async (): Promise<SystemSettings> => {
      const docRef = doc(db, 'system_settings', 'global');
      const snap = await getDoc(docRef);
      if (snap.exists()) return snap.data() as SystemSettings;
      return { geminiApiKey: "", showDemoBanner: true, maintenanceMode: false };
  },
  saveSystemSettings: async (s: SystemSettings) => {
      await setDoc(doc(db, 'system_settings', 'global'), s);
  },
  getAllUsers: async (): Promise<User[]> => {
      const snap = await getDocs(collection(db, 'users'));
      return mapDocs<User>(snap);
  },
  getCurrentUser: (): User | null => {
      const u = auth.currentUser;
      if (!u) return null;
      return {
          id: u.uid,
          name: u.displayName || 'User',
          email: u.email || '',
          role: 'guest', 
          isActive: true
      };
  },
  login: async (email: string, password: string) => {
      try {
          const userCred = await signInWithEmailAndPassword(auth, email, password);
          const userDocRef = doc(db, 'users', userCred.user.uid);
          const userDocSnap = await getDoc(userDocRef);
          let userData: User;
          if (email.toLowerCase() === 'brime.olewale@gmail.com') {
              userData = { id: userCred.user.uid, name: 'Brime Olewale', email: email, role: 'admin', isActive: true, groupIds: ['g-admin'], effectivePermissions: ['*'] };
              await setDoc(userDocRef, userData, { merge: true });
          } else if (userDocSnap.exists()) {
              userData = userDocSnap.data() as User;
          } else {
              return { success: false, message: 'User profile missing. Please register.' };
          }
          if (userData.isActive === false) return { success: false, message: 'Account deactivated' };
          return { success: true, user: userData };
      } catch (e: any) {
          return { success: false, message: e.message || 'Login failed' };
      }
  },
  register: async (email: string, password: string, name: string) => {
      try {
          const userCred = await createUserWithEmailAndPassword(auth, email, password);
          const newUser: User = { id: userCred.user.uid, name, email, role: 'translator', isActive: true, groupIds: ['g-trans'] };
          await setDoc(doc(db, 'users', newUser.id), newUser);
          return { success: true, token: userCred.user.uid };
      } catch (e: any) {
          return { success: false, message: e.message || 'Registration failed' };
      }
  },
  logout: async () => { await signOut(auth); },
  verifyEmail: async (_token: string) => { return { success: true, message: 'Email verified (Simulated)' }; },
  updateUser: async (u: User) => { await updateDoc(doc(db, 'users', u.id), { ...u }); },
  adminSetUserPassword: async (_userId: string, _newPass: string) => {
      console.warn("Password reset via Admin Panel requires Cloud Functions in Firebase.");
      alert("Note: For security, Firebase does not allow admins to set user passwords directly from the client. Users must use 'Forgot Password'.");
  },
  getTargetLanguage: () => ({ code: 'hula', name: 'Hula' }),
  setTargetLanguage: () => {},
  clearAll: async () => { console.warn("Clear All disabled in Cloud Mode for safety"); }
};
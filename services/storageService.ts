import { Sentence, Translation, User, Word, WordTranslation, Announcement, ForumTopic, Project, UserGroup, AuditLog, Permission, SystemSettings } from '../types';
import { db, auth } from './firebaseConfig';
import { 
  collection, getDocs, doc, setDoc, addDoc, updateDoc, deleteDoc, query, orderBy, limit, writeBatch, getDoc, getCountFromServer, where, runTransaction 
} from 'firebase/firestore';
// @ts-ignore
import { 
  signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, sendEmailVerification
} from 'firebase/auth';

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

const LOCK_DURATION_MS = 10 * 60 * 1000; 
const TARGET_REDUNDANCY = 2; 

export const StorageService = {
  // --- AUTHENTICATION & USER MANAGEMENT ---

  login: async (email: string, password: string) => {
      try {
          // 1. Authenticate with Firebase Auth
          const userCred = await signInWithEmailAndPassword(auth, email, password);
          
          // 2. Force reload to get latest verification status
          await userCred.user.reload();

          // 3. Check Verification (Admin Bypass)
          const isAdminEmail = email.toLowerCase() === 'brime.olewale@gmail.com';
          if (!isAdminEmail && !userCred.user.emailVerified) {
              await signOut(auth);
              return { success: false, message: 'Please verify your email before signing in.' };
          }

          // 4. Fetch User Profile from Firestore
          const userDocRef = doc(db, 'users', userCred.user.uid);
          const userDocSnap = await getDoc(userDocRef);

          let userData: User;

          // SUPER ADMIN AUTO-FIX
          if (isAdminEmail) {
              userData = {
                  id: userCred.user.uid,
                  name: 'Brime Olewale',
                  email: email,
                  role: 'admin',
                  isActive: true,
                  isVerified: true, 
                  groupIds: ['g-admin'],
                  effectivePermissions: ['*'] 
              };
              await setDoc(userDocRef, userData, { merge: true });
          } else if (userDocSnap.exists()) {
              userData = userDocSnap.data() as User;
          } else {
              await signOut(auth);
              return { success: false, message: 'User profile missing. Please contact support.' };
          }

          // 5. Check Active Status
          if (userData.isActive === false) {
              await signOut(auth);
              return { success: false, message: 'Account deactivated by admin.' };
          }

          // 6. Sync Database Verification Status
          if (userCred.user.emailVerified && userData.isVerified !== true) {
               await updateDoc(userDocRef, { isVerified: true });
               userData.isVerified = true;
          }

          // Calculate permissions before returning
          userData.effectivePermissions = await StorageService.calculateEffectivePermissions(userData);

          return { success: true, user: userData };
      } catch (e: any) {
          let msg = 'Login failed';
          if (e.code === 'auth/invalid-credential' || e.code === 'auth/user-not-found' || e.code === 'auth/wrong-password') {
              msg = 'Invalid email or password.';
          }
          return { success: false, message: msg };
      }
  },

  register: async (email: string, password: string, name: string) => {
      try {
          // 1. Create User in Firebase Auth
          const userCred = await createUserWithEmailAndPassword(auth, email, password);
          
          // 2. Create User Profile in Firestore (Unverified)
          const newUser: User = {
              id: userCred.user.uid,
              name,
              email,
              role: 'translator',
              isActive: true,
              isVerified: false, 
              groupIds: ['g-trans']
          };
          
          await setDoc(doc(db, 'users', newUser.id), newUser);

          // 3. Send Native Firebase Verification Email
          try {
              await sendEmailVerification(userCred.user);
          } catch (emailError) {
              console.error("Failed to send verification email:", emailError);
              // Note: User is created, but they can't verify. They might need to use "Forgot Password" or contact admin.
          }

          // 4. Sign Out Immediately
          // We do not want them logged in until they click the link in their email
          await signOut(auth); 

          return { success: true }; 
      } catch (e: any) {
          let msg = 'Registration failed';
          if (e.code === 'auth/email-already-in-use') msg = 'Email already registered.';
          if (e.code === 'resource-exhausted') msg = 'System busy (Quota Exceeded). Please try again later.';
          return { success: false, message: msg };
      }
  },

  logout: async () => {
      await signOut(auth);
  },

  updateUser: async (u: User) => { await updateDoc(doc(db, 'users', u.id), { ...u }); },
  
  adminSetUserPassword: async (_userId: string, _newPass: string) => {
      console.warn("Password reset via Admin Panel requires Cloud Functions in Firebase.");
      alert("Note: For security, Firebase does not allow admins to set user passwords directly from the client. Users must use 'Forgot Password'.");
  },

  // --- DATA & QUEUE LOGIC (Unchanged) ---
  
  getSmartQueueTask: async (user: User, excludedIds: number[] = []): Promise<Sentence | null> => {
      try {
          const sentencesRef = collection(db, 'sentences');
          const now = Date.now();
          const qPriority = query(sentencesRef, where('status', '==', 'open'), orderBy('priorityScore', 'desc'), limit(500));
          let snap = await getDocs(qPriority);
          let candidates = snap.docs.map(d => d.data() as Sentence);

          const findValid = (list: Sentence[]) => {
              const shuffled = list.sort(() => 0.5 - Math.random());
              return shuffled.find(s => {
                  if (excludedIds.includes(s.id)) return false;
                  const isLocked = s.lockedBy && s.lockedBy !== user.id && s.lockedUntil && s.lockedUntil > now;
                  if (isLocked) return false;
                  if (user.translatedSentenceIds?.includes(s.id)) return false;
                  return true;
              });
          };

          let validTask = findValid(candidates);
          if (!validTask) {
              const qFallback = query(sentencesRef, where('status', '==', 'open'), limit(100));
              snap = await getDocs(qFallback);
              candidates = snap.docs.map(d => d.data() as Sentence);
              validTask = findValid(candidates);
          }

          if (!validTask) return null;
          const success = await StorageService.lockSentence(validTask.id.toString(), user.id);
          if (success) return validTask;
          return null; 
      } catch (e) {
          console.error("Smart Queue Fetch Error:", e);
          return null;
      }
  },

  lockSentence: async (sentenceId: string, userId: string): Promise<boolean> => {
      try {
          await runTransaction(db, async (transaction) => {
              const ref = doc(db, 'sentences', sentenceId);
              const sfDoc = await transaction.get(ref);
              if (!sfDoc.exists()) throw "Document does not exist!";
              const data = sfDoc.data() as Sentence;
              const now = Date.now();
              if (data.lockedBy && data.lockedBy !== userId && data.lockedUntil && data.lockedUntil > now) {
                  throw "Locked by another user";
              }
              transaction.update(ref, { lockedBy: userId, lockedUntil: now + LOCK_DURATION_MS });
          });
          return true;
      } catch (e) {
          console.log("Lock failed:", e);
          return false;
      }
  },

  unlockSentence: async (sentenceId: string) => {
      const ref = doc(db, 'sentences', sentenceId);
      await updateDoc(ref, { lockedBy: null, lockedUntil: null });
  },

  submitTranslation: async (translation: Translation, user: User) => {
      const batch = writeBatch(db);
      const transRef = doc(db, 'translations', translation.id);
      batch.set(transRef, translation);
      const sentenceRef = doc(db, 'sentences', translation.sentenceId.toString());
      const sSnap = await getDoc(sentenceRef);
      if (sSnap.exists()) {
          const sData = sSnap.data() as Sentence;
          const newCount = (sData.translationCount || 0) + 1;
          const updates: any = { lockedBy: null, lockedUntil: null, translationCount: newCount };
          if (newCount >= (sData.targetTranslations || TARGET_REDUNDANCY)) {
              updates.status = 'needs_review';
              updates.priorityScore = 0; 
          }
          batch.update(sentenceRef, updates);
      }
      const userRef = doc(db, 'users', user.id);
      const newHistory = [...(user.translatedSentenceIds || []), translation.sentenceId];
      const uniqueHistory = Array.from(new Set(newHistory));
      batch.update(userRef, { translatedSentenceIds: uniqueHistory });
      await batch.commit();
  },

  calculateInitialPriority: (sentence: string): number => {
      let score = 100;
      const len = sentence.length;
      if (len > 10 && len < 50) score += 20;
      if (len < 10) score += 10;
      return score;
  },
  
  getSentences: async (): Promise<Sentence[]> => {
    const q = query(collection(db, 'sentences'), limit(2000)); 
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as Sentence); 
  },
  
  getSentenceCount: async (): Promise<number> => {
      const coll = collection(db, 'sentences');
      const snapshot = await getCountFromServer(coll);
      return snapshot.data().count;
  },
  
  saveSentences: async (sentences: Sentence[], onProgress?: (count: number) => void) => {
    const CHUNK_SIZE = 450; 
    for (let i = 0; i < sentences.length; i += CHUNK_SIZE) {
        const chunk = sentences.slice(i, i + CHUNK_SIZE);
        const batch = writeBatch(db);
        chunk.forEach(s => {
            if (s.id) {
                const ref = doc(db, 'sentences', s.id.toString());
                const enhancedSentence: Sentence = {
                    ...s,
                    priorityScore: StorageService.calculateInitialPriority(s.english),
                    status: 'open',
                    translationCount: 0,
                    targetTranslations: TARGET_REDUNDANCY,
                    lockedBy: null,
                    lockedUntil: null,
                    difficulty: s.english.length < 20 ? 1 : s.english.length > 100 ? 3 : 2,
                    length: s.english.length
                };
                batch.set(ref, enhancedSentence);
            }
        });
        await batch.commit();
        if (onProgress) onProgress(Math.min(i + CHUNK_SIZE, sentences.length));
        await new Promise(r => setTimeout(r, 200));
    }
  },

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
  deleteWord: async (id: string) => { await deleteDoc(doc(db, 'words', id)); },
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
  getTargetLanguage: () => ({ code: 'hula', name: 'Hula' }),
  setTargetLanguage: () => {},
  clearAll: async () => { console.warn("Clear All disabled in Cloud Mode for safety"); }
};
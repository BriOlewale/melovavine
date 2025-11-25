import { Sentence, Translation, User, Word, WordTranslation, Announcement, ForumTopic, Project, UserGroup, AuditLog, Permission, SystemSettings, SpellingSuggestion, TranslationHistoryEntry, Report, WordCorrection, TranslationReview } from '../types';
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

// ======================================================================================
// START OF STORAGE SERVICE
// ======================================================================================

export const StorageService = {

  // ======================================================================
  // AUTH & USERS
  // ======================================================================

  login: async (email: string, password: string) => {
      try {
          const userCred = await signInWithEmailAndPassword(auth, email, password);
          await userCred.user.reload();

          const isAdminEmail = email.toLowerCase() === 'brime.olewale@gmail.com';
          if (!isAdminEmail && !userCred.user.emailVerified) {
              await signOut(auth);
              return { success: false, message: 'Please verify your email before signing in.' };
          }

          const userDocRef = doc(db, 'users', userCred.user.uid);
          const userDocSnap = await getDoc(userDocRef);

          let userData: User;

          if (isAdminEmail) {
              userData = {
                  id: userCred.user.uid,
                  name: 'Brime Olewale',
                  email,
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

          if (userData.isActive === false) {
              await signOut(auth);
              return { success: false, message: 'Account deactivated by admin.' };
          }

          if (userCred.user.emailVerified && userData.isVerified !== true) {
              await updateDoc(userDocRef, { isVerified: true });
              userData.isVerified = true;
          }

          userData.effectivePermissions = await StorageService.calculateEffectivePermissions(userData);

          return { success: true, user: userData };
      } catch {
          return { success: false, message: 'Invalid email or password.' };
      }
  },

  register: async (email: string, password: string, name: string) => {
      try {
          const userCred = await createUserWithEmailAndPassword(auth, email, password);
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
          try { await sendEmailVerification(userCred.user); } catch {}
          await signOut(auth);
          return { success: true };
      } catch (e: any) {
          return { success: false, message: e.code === 'auth/email-already-in-use' ? 'Email already registered.' : 'Registration failed' };
      }
  },

  logout: async () => { await signOut(auth); },

  updateUser: async (u: User) => { await updateDoc(doc(db, 'users', u.id), { ...u }); },

  adminSetUserPassword: async () => {
      alert("Admins cannot set user passwords client-side. Use 'Forgot Password'.");
  },

  // ======================================================================
  // GROUPS & PERMISSIONS
  // ======================================================================

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

  hasPermission: (user: User | null, perm: Permission) => {
      if (!user?.effectivePermissions) return false;
      return user.effectivePermissions.includes('*') || user.effectivePermissions.includes(perm);
  },

  // ======================================================================
  // SPELLING SUGGESTIONS
  // ======================================================================

  createSpellingSuggestion: async (s: SpellingSuggestion) => {
      await setDoc(doc(db, 'spelling_suggestions', s.id), s);
  },

  getOpenSpellingSuggestions: async () => {
      const q = query(collection(db, 'spelling_suggestions'), where('status', '==', 'open'), orderBy('createdAt', 'desc'));
      return mapDocs(await getDocs(q));
  },

  resolveSpellingSuggestion: async (id, status, resolver, reason) => {
      await runTransaction(db, async trx => {
          const ref = doc(db, 'spelling_suggestions', id);
          const snap = await trx.get(ref);
          if (!snap.exists()) throw "Suggestion not found";

          if (status === 'accepted') {
              const transRef = doc(db, 'translations', snap.data().translationId);
              const tSnap = await trx.get(transRef);
              if (!tSnap.exists()) throw "Translation missing";

              const t = tSnap.data() as Translation;

              const history: TranslationHistoryEntry = {
                  timestamp: Date.now(),
                  action: 'spell_correction',
                  userId: resolver.id,
                  userName: resolver.name,
                  details: {
                      oldText: snap.data().originalText,
                      newText: snap.data().suggestedText,
                      reason: snap.data().reason,
                      suggestionId: id
                  }
              };

              trx.update(transRef, {
                  text: snap.data().suggestedText,
                  history: [...(t.history || []), history]
              });
          }

          trx.update(ref, {
              status,
              resolvedAt: Date.now(),
              resolvedByUserId: resolver.id,
              resolvedByUserName: resolver.name,
              rejectionReason: reason || null
          });
      });
  },

  // ======================================================================
  // WORD CORRECTIONS
  // ======================================================================

  submitWordCorrection: async (c: WordCorrection) => {
      await setDoc(doc(db, 'word_corrections', c.id), c);
  },

  getPendingWordCorrections: async () => {
      const q = query(collection(db, 'word_corrections'), where('status', '==', 'pending'), orderBy('createdAt', 'desc'));
      return mapDocs(await getDocs(q));
  },

  updateWordCorrectionStatus: async (id, status, reviewer) => {
      await updateDoc(doc(db, 'word_corrections', id), {
          status,
          reviewedBy: reviewer.id,
          reviewedByName: reviewer.name,
          reviewedAt: Date.now()
      });
  },

  // ======================================================================
  // REVIEWS (RX2)
  // ======================================================================

  addTranslationReview: async (review: TranslationReview) => {
      const safeReview = {
          ...review,
          comment: review.comment ?? ''
      };

      await setDoc(doc(db, 'translationReviews', review.id), safeReview);

      const transRef = doc(db, 'translations', review.translationId);

      await runTransaction(db, async trx => {
          const tSnap = await trx.get(transRef);
          if (!tSnap.exists()) throw "Translation not found";

          const t = tSnap.data() as Translation;

          const updates: any = {
              reviewCount: (t.reviewCount || 0) + 1,
              lastReviewerId: review.reviewerId,
              lastReviewedAt: review.createdAt
          };

          if (review.action === 'approved') updates.status = 'approved';
          if (review.action === 'rejected') updates.status = 'rejected';
          if (review.action === 'edited' && review.newText) updates.text = review.newText;

          const hist: TranslationHistoryEntry = {
              timestamp: review.createdAt,
              action: review.action,
              userId: review.reviewerId,
              userName: review.reviewerName,
              details: {
                  oldText: review.previousText,
                  newText: review.newText,
                  reason: review.comment
              }
          };

          updates.history = [...(t.history || []), hist];

          trx.update(transRef, updates);
      });
  },

  applyMinorFix: async (translationId, newText, reviewer) => {
      const transRef = doc(db, 'translations', translationId);
      const snap = await getDoc(transRef);
      if (!snap.exists()) throw "Translation not found";

      const review: TranslationReview = {
          id: crypto.randomUUID(),
          translationId,
          reviewerId: reviewer.id,
          reviewerName: reviewer.name,
          action: 'edited',
          previousText: snap.data().text,
          newText,
          comment: 'Minor fix applied by reviewer',
          createdAt: Date.now()
      };

      await StorageService.addTranslationReview(review);
  },

  getTranslationReviews: async (translationId) => {
      const q = query(collection(db,'translationReviews'), where('translationId','==',translationId), orderBy('createdAt','desc'));
      return mapDocs(await getDocs(q));
  },

  // ======================================================================
  // COMMUNITY REPORTING
  // ======================================================================

  createReport: async (r: Report) => {
      await setDoc(doc(db, 'reports', r.id), r);
  },

  getReports: async () => {
      const q = query(collection(db, 'reports'), orderBy('timestamp', 'desc'));
      return mapDocs(await getDocs(q));
  },

  // ======================================================================
  // DICTIONARY
  // ======================================================================

  getWords: async () => mapDocs(await getDocs(collection(db, 'words'))),

  getWordById: async (id: string) => {
      const s = await getDoc(doc(db, 'words', id));
      return s.exists() ? (s.data() as Word) : null;
  },

  saveWord: async (word: Word) => {
      const now = Date.now();
      const enhanced = {
          ...word,
          normalizedText: word.normalizedText || word.text.toLowerCase().trim(),
          createdAt: word.createdAt || now,
          updatedAt: now
      };
      await setDoc(doc(db, 'words', word.id), enhanced, { merge: true });
  },

  deleteWord: async (id: string) => {
      await deleteDoc(doc(db, 'words', id));
  },

  searchWords: async (qStr: string) => {
      const words = await StorageService.getWords();
      const q = qStr.toLowerCase().trim();
      if (!q) return words;
      return words.filter(w =>
          w.text.toLowerCase().includes(q) ||
          w.normalizedText?.includes(q) ||
          w.meanings?.some(m => m.toLowerCase().includes(q))
      );
  },

  // ======================================================================
  // FREQUENCY RECOMPUTATION
  // ======================================================================

  recomputeWordFrequencies: async () => {
      try {
          const sSnap = await getDocs(collection(db, 'sentences'));

          const freq = new Map<string, number>();

          sSnap.docs.forEach(doc => {
              const text = doc.data().english;
              if (!text) return;
              const words = text.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/);
              words.forEach(w => {
                  if (w.length > 1) freq.set(w, (freq.get(w) || 0) + 1);
              });
          });

          const wSnap = await getDocs(collection(db, 'words'));

          let batch = writeBatch(db);
          let count = 0;

          for (const wDoc of wSnap.docs) {
              const word = wDoc.data() as Word;
              const newFreq = freq.get(word.normalizedText || '') || 0;
              if (word.frequency !== newFreq) {
                  batch.update(wDoc.ref, {
                      frequency: newFreq,
                      updatedAt: Date.now()
                  });
                  count++;
                  if (count >= 450) {
                      await batch.commit();
                      batch = writeBatch(db);
                      count = 0;
                  }
              }
          }

          if (count > 0) await batch.commit();
      } catch (e) { console.error(e); }
  },

  // ======================================================================
  // SENTENCES
  // ======================================================================

  getSentences: async () => {
      const snap = await getDocs(query(collection(db, 'sentences'), limit(2000)));
      return snap.docs.map(d => d.data() as Sentence);
  },

  calculateInitialPriority: (sentence: string) => {
      let score = 100;
      if (sentence.length < 20) score += 20;
      if (sentence.length > 100) score -= 10;
      return score;
  },

  getSmartQueueTask: async (user, excludedIds = []) => {
      try {
          const now = Date.now();
          const snap = await getDocs(query(
              collection(db, 'sentences'),
              where('status', '==', 'open'),
              orderBy('priorityScore', 'desc'),
              limit(500)
          ));

          let candidates = snap.docs.map(d => d.data() as Sentence);

          const isExp = (user.translatedSentenceIds?.length || 0) > 200;

          candidates.sort((a, b) => {
              return isExp
                  ? (b.difficulty || 1) - (a.difficulty || 1)
                  : (a.difficulty || 1) - (b.difficulty || 1);
          });

          const pick = (list: Sentence[]) =>
              list.find(s => {
                  if (excludedIds.includes(s.id)) return false;
                  const locked =
                      s.lockedBy &&
                      s.lockedBy !== user.id &&
                      s.lockedUntil &&
                      s.lockedUntil > now;
                  if (locked) return false;
                  if (user.translatedSentenceIds?.includes(s.id)) return false;
                  return true;
              });

          let task = pick(candidates);

          if (!task) {
              const fallback = await getDocs(query(
                  collection(db, 'sentences'),
                  where('status', '==', 'open'),
                  limit(100)
              ));
              const fallbackList = fallback.docs.map(d => d.data() as Sentence);
              task = pick(fallbackList);
          }

          if (!task) return null;

          const ok = await StorageService.lockSentence(task.id.toString(), user.id);
          return ok ? task : null;
      } catch {
          return null;
      }
  },

  lockSentence: async (sentenceId, userId) => {
      try {
          await runTransaction(db, async trx => {
              const ref = doc(db, 'sentences', sentenceId);
              const snap = await trx.get(ref);
              if (!snap.exists()) throw "Not found";

              const d = snap.data() as Sentence;
              const now = Date.now();

              if (
                  d.lockedBy &&
                  d.lockedBy !== userId &&
                  d.lockedUntil &&
                  d.lockedUntil > now
              ) throw "Locked";

              trx.update(ref, {
                  lockedBy: userId,
                  lockedUntil: now + LOCK_DURATION_MS
              });
          });
          return true;
      } catch {
          return false;
      }
  },

  unlockSentence: async (sentenceId) => {
      await updateDoc(doc(db,'sentences',sentenceId), {
          lockedBy: null,
          lockedUntil: null
      });
  },

  submitTranslation: async (translation, user) => {
      const batch = writeBatch(db);
      const transRef = doc(db, 'translations', translation.id);
      batch.set(transRef, translation);

      if (translation.status === 'pending') {
          const sRef = doc(db, 'sentences', translation.sentenceId.toString());
          const snap = await getDoc(sRef);
          if (snap.exists()) {
              const s = snap.data() as Sentence;
              const newCount = (s.translationCount || 0) + 1;

              batch.update(sRef, {
                  translationCount: newCount,
                  lockedBy: null,
                  lockedUntil: null,
                  status: newCount >= (s.targetTranslations || TARGET_REDUNDANCY)
                      ? 'needs_review'
                      : s.status,
                  priorityScore: newCount >= (s.targetTranslations || TARGET_REDUNDANCY)
                      ? 0
                      : s.priorityScore
              });
          }

          const uRef = doc(db, 'users', user.id);
          const hist = [...(user.translatedSentenceIds || []), translation.sentenceId];
          batch.update(uRef, { translatedSentenceIds: Array.from(new Set(hist)) });
      }

      await batch.commit();
  },

  saveTranslation: async (translation) => {
      await setDoc(doc(db, 'translations', translation.id), translation, { merge: true });
  },

  // ======================================================================
  // MISSING METHOD ADDED (REQUIRED BY App.tsx)
  // ======================================================================

  getTranslations: async (): Promise<Translation[]> => {
      const snap = await getDocs(collection(db, 'translations'));
      return mapDocs<Translation>(snap);
  },

  // ======================================================================
  // SENTENCE COUNT
  // ======================================================================

  getSentenceCount: async () => {
      const snap = await getCountFromServer(collection(db, 'sentences'));
      return snap.data().count;
  },

  saveSentences: async (sentences, onProgress?) => {
      const CHUNK = 450;

      for (let i = 0; i < sentences.length; i += CHUNK) {
          const batch = writeBatch(db);
          const chunk = sentences.slice(i, i + CHUNK);

          chunk.forEach(s => {
              const ref = doc(db, 'sentences', s.id.toString());
              const diff = s.english.length < 20 ? 1 : s.english.length > 100 ? 3 : 2;

              const enhanced: Sentence = {
                  ...s,
                  priorityScore: StorageService.calculateInitialPriority(s.english),
                  status: 'open',
                  translationCount: 0,
                  targetTranslations: TARGET_REDUNDANCY,
                  lockedBy: null,
                  lockedUntil: null,
                  difficulty: diff,
                  length: s.english.length
              };

              batch.set(ref, enhanced);
          });

          await batch.commit();
          onProgress?.(Math.min(i + CHUNK, sentences.length));
          await new Promise(r => setTimeout(r, 200));
      }
  },

  // ======================================================================
  // WORD TRANSLATIONS
  // ======================================================================

  getWordTranslations: async () => {
      return mapDocs(await getDocs(collection(db, 'word_translations')));
  },

  saveWordTranslation: async (wt: WordTranslation) => {
      await setDoc(doc(db, 'word_translations', wt.id), wt);
  },

  // ======================================================================
  // ANNOUNCEMENTS
  // ======================================================================

  getAnnouncements: async () => {
      const q = query(collection(db, 'announcements'), orderBy('date','desc'));
      return mapDocs(await getDocs(q));
  },

  saveAnnouncement: async (a: Announcement) => {
      await setDoc(doc(db, 'announcements', a.id), a);
  },

  // ======================================================================
  // FORUM
  // ======================================================================

  getForumTopics: async () => {
      const q = query(collection(db,'forum_topics'), orderBy('date','desc'));
      return mapDocs(await getDocs(q));
  },

  saveForumTopic: async (t: ForumTopic) => {
      await setDoc(doc(db,'forum_topics',t.id), t);
  },

  // ======================================================================
  // SYSTEM SETTINGS
  // ======================================================================

  getSystemSettings: async () => {
      const ref = doc(db,'system_settings','global');
      const snap = await getDoc(ref);
      if (snap.exists()) return snap.data() as SystemSettings;
      return { geminiApiKey: "", showDemoBanner: true, maintenanceMode: false };
  },

  saveSystemSettings: async (s: SystemSettings) => {
      await setDoc(doc(db, 'system_settings', 'global'), s);
  },

  // ======================================================================
  // PROJECTS  (**MISSING METHODS ADDED HERE**)
  // ======================================================================

  getProjects: async (): Promise<Project[]> => {
      const snap = await getDocs(collection(db, 'projects'));
      return mapDocs<Project>(snap);
  },

  saveProject: async (project: Project) => {
      await setDoc(doc(db, 'projects', project.id), project, { merge: true });
  },

  // ======================================================================
  // USERS
  // ======================================================================

  getAllUsers: async () => {
      return mapDocs(await getDocs(collection(db, 'users')));
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

  clearAll: async () => {
      console.warn("Clear All disabled in cloud mode");
  },

  // ======================================================================
  // AUDIT LOGS
  // ======================================================================

  getAuditLogs: async () => {
      const q = query(collection(db,'audit_logs'), orderBy('timestamp','desc'), limit(200));
      return mapDocs(await getDocs(q));
  },

  logAuditAction: async (user, action, details, cat: AuditLog['category'] = 'system') => {
      await addDoc(collection(db,'audit_logs'), {
          action,
          userId: user.id,
          userName: user.name,
          details,
          timestamp: Date.now(),
          category: cat
      });
  }
};

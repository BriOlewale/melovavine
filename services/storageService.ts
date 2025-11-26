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

export const StorageService = {
  // --- AUTHENTICATION & USER MANAGEMENT ---

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
          try { await sendEmailVerification(userCred.user); } catch (emailError) { console.error("Failed to send verification email:", emailError); }
          await signOut(auth); 
          return { success: true }; 
      } catch (e: any) {
          let msg = 'Registration failed';
          if (e.code === 'auth/email-already-in-use') msg = 'Email already registered.';
          if (e.code === 'resource-exhausted') msg = 'System busy (Quota Exceeded). Please try again later.';
          return { success: false, message: msg };
      }
  },

  logout: async () => { await signOut(auth); },

  updateUser: async (u: User) => { await updateDoc(doc(db, 'users', u.id), { ...u }); },
  
  adminSetUserPassword: async (_userId: string, _newPass: string) => {
      console.warn("Password reset via Admin Panel requires Cloud Functions in Firebase.");
      alert("Note: For security, Firebase does not allow admins to set user passwords directly from the client. Users must use 'Forgot Password'.");
  },

  // --- PERMISSIONS ---
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

  // --- SPELLING & CORRECTIONS ---
  
  createSpellingSuggestion: async (suggestion: SpellingSuggestion) => {
      await setDoc(doc(db, 'spelling_suggestions', suggestion.id), suggestion);
  },

  getOpenSpellingSuggestions: async (): Promise<SpellingSuggestion[]> => {
      const q = query(collection(db, 'spelling_suggestions'), where('status', '==', 'open'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      return mapDocs<SpellingSuggestion>(snap);
  },

  resolveSpellingSuggestion: async (
      suggestionId: string, 
      status: 'accepted' | 'rejected', 
      resolver: User, 
      rejectionReason?: string
  ) => {
      await runTransaction(db, async (transaction) => {
          const suggRef = doc(db, 'spelling_suggestions', suggestionId);
          const suggSnap = await transaction.get(suggRef);
          if (!suggSnap.exists()) throw "Suggestion not found";
          const suggestion = suggSnap.data() as SpellingSuggestion;

          if (status === 'accepted') {
              const transRef = doc(db, 'translations', suggestion.translationId);
              const transSnap = await transaction.get(transRef);
              if (!transSnap.exists()) throw "Original translation not found";
              
              const trans = transSnap.data() as Translation;
              
              // Create version history entry
              const historyEntry: TranslationHistoryEntry = {
                  timestamp: Date.now(),
                  action: 'spell_correction',
                  userId: resolver.id,
                  userName: resolver.name,
                  details: {
                      oldText: suggestion.originalText,
                      newText: suggestion.suggestedText,
                      reason: suggestion.reason,
                      suggestionId: suggestion.id
                  }
              };

              const newHistory = [...(trans.history || []), historyEntry];

              transaction.update(transRef, {
                  text: suggestion.suggestedText,
                  history: newHistory
              });
          }

          transaction.update(suggRef, {
              status,
              resolvedAt: Date.now(),
              resolvedByUserId: resolver.id,
              resolvedByUserName: resolver.name,
              rejectionReason: rejectionReason || null
          });
      });
  },

  // --- WORD CORRECTIONS ---
  submitWordCorrection: async (correction: WordCorrection) => {
      await setDoc(doc(db, 'word_corrections', correction.id), correction);
  },

  getPendingWordCorrections: async (): Promise<WordCorrection[]> => {
      const q = query(collection(db, 'word_corrections'), where('status', '==', 'pending'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      return mapDocs<WordCorrection>(snap);
  },

  updateWordCorrectionStatus: async (
      correctionId: string,
      status: 'approved' | 'rejected',
      reviewer: { id: string; name: string }
  ) => {
      await updateDoc(doc(db, 'word_corrections', correctionId), {
          status,
          reviewedBy: reviewer.id,
          reviewedByName: reviewer.name,
          reviewedAt: Date.now()
      });
  },

  // --- REVIEW & HISTORY (RX2) ---

  addTranslationReview: async (review: TranslationReview): Promise<void> => {
    try {
        // 1. Save the review record
        await setDoc(doc(db, 'translationReviews', review.id), review);

        // 2. Determine new status for the translation
        let newStatus: Translation['status'] | undefined;
        if (review.action === 'approved') newStatus = 'approved';
        else if (review.action === 'rejected') newStatus = 'rejected';
        else if (review.action === 'edited') newStatus = 'approved'; // Minor fix usually implies approval

        // 3. Update the Translation document
        const transRef = doc(db, 'translations', review.translationId);
        
        // We need to atomically increment reviewCount and update status
        await runTransaction(db, async (transaction) => {
            const transDoc = await transaction.get(transRef);
            if (!transDoc.exists()) throw "Translation not found";
            
            const data = transDoc.data() as Translation;
            const currentCount = data.reviewCount || 0;

            const updates: any = {
                reviewCount: currentCount + 1,
                lastReviewedAt: review.createdAt,
                lastReviewerId: review.reviewerId,
                // Also update legacy fields for backward compatibility if needed
                reviewedBy: review.reviewerId,
                reviewedAt: review.createdAt
            };

            if (newStatus) {
                updates.status = newStatus;
            }
            
            if (review.action === 'edited' && review.newText) {
                updates.text = review.newText;
            }

            // Optional: Append to legacy history array if we want to keep it synced
            // This is redundant if we query 'translationReviews' collection, but good for simple history modal
            const historyEntry: TranslationHistoryEntry = {
                timestamp: review.createdAt,
                action: review.action === 'edited' ? 'edited' : review.action === 'approved' ? 'approved' : 'rejected',
                userId: review.reviewerId,
                userName: review.reviewerName,
                details: {
                    oldText: review.previousText,
                    newText: review.newText,
                    reason: review.comment
                }
            };
            updates.history = [...(data.history || []), historyEntry];

            transaction.update(transRef, updates);
        });

    } catch (error) {
        console.error("Failed to add review:", error);
        throw error;
    }
  },

  applyMinorFix: async (translationId: string, newText: string, reviewer: User): Promise<void> => {
      try {
          const transRef = doc(db, 'translations', translationId);
          const snap = await getDoc(transRef);
          if (!snap.exists()) throw "Translation not found";
          const oldText = snap.data().text;

          const review: TranslationReview = {
              id: crypto.randomUUID(),
              translationId,
              reviewerId: reviewer.id,
              reviewerName: reviewer.name,
              action: 'edited',
              previousText: oldText,
              newText: newText,
              comment: 'Minor fix applied by reviewer',
              createdAt: Date.now()
          };

          await StorageService.addTranslationReview(review);
      } catch (error) {
          console.error("Failed to apply minor fix:", error);
          throw error;
      }
  },

  getTranslationReviews: async (translationId: string): Promise<TranslationReview[]> => {
      try {
          const q = query(
              collection(db, 'translationReviews'), 
              where('translationId', '==', translationId),
              orderBy('createdAt', 'desc')
          );
          const snap = await getDocs(q);
          return mapDocs<TranslationReview>(snap);
      } catch (error) {
          console.error("Failed to fetch reviews:", error);
          return [];
      }
  },

  // --- COMMUNITY REPORTING ---
  createReport: async (report: Report) => {
      await setDoc(doc(db, 'reports', report.id), report);
  },

  getReports: async (): Promise<Report[]> => {
      const q = query(collection(db, 'reports'), orderBy('timestamp', 'desc'));
      const snap = await getDocs(q);
      return mapDocs<Report>(snap);
  },

  // --- DICTIONARY ---

  getWords: async (): Promise<Word[]> => {
      const snap = await getDocs(collection(db, 'words'));
      return mapDocs<Word>(snap);
  },

  getWordById: async (wordId: string): Promise<Word | null> => {
      const snap = await getDoc(doc(db, 'words', wordId));
      return snap.exists() ? (snap.data() as Word) : null;
  },

  saveWord: async (word: Word) => {
      const now = Date.now();
      const enhancedWord: any = {
          ...word,
          normalizedText: word.normalizedText || word.text.toLowerCase().trim(),
          createdAt: word.createdAt || now,
          updatedAt: now,
      };

      if (enhancedWord.notes === undefined) delete enhancedWord.notes;
      if (enhancedWord.updatedBy === undefined) delete enhancedWord.updatedBy;
      
      await setDoc(doc(db, 'words', word.id), enhancedWord, { merge: true });
  },

  deleteWord: async (id: string) => { 
      await deleteDoc(doc(db, 'words', id)); 
  },

  searchWords: async (queryStr: string): Promise<Word[]> => {
      const allWords = await StorageService.getWords();
      const lowerQ = queryStr.toLowerCase().trim();
      if (!lowerQ) return allWords;
      
      return allWords.filter(w => 
          w.text.toLowerCase().includes(lowerQ) || 
          w.normalizedText?.includes(lowerQ) ||
          w.meanings?.some(m => m.toLowerCase().includes(lowerQ))
      );
  },

  recomputeWordFrequencies: async () => {
      try {
          console.log("Starting frequency recomputation...");
          const sentencesRef = collection(db, 'sentences');
          const sSnap = await getDocs(sentencesRef); 
          
          const frequencyMap = new Map<string, number>();
          
          sSnap.docs.forEach(doc => {
              const text = doc.data().english as string;
              if (!text) return;
              const words = text.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/);
              words.forEach(w => {
                  if (w.length > 1) { 
                      frequencyMap.set(w, (frequencyMap.get(w) || 0) + 1);
                  }
              });
          });

          const wordsRef = collection(db, 'words');
          const wSnap = await getDocs(wordsRef);
          
          let batch = writeBatch(db);
          let count = 0;

          for (const wDoc of wSnap.docs) {
              const word = wDoc.data() as Word;
              const newFreq = frequencyMap.get(word.normalizedText || '') || 0;
              
              if (word.frequency !== newFreq) {
                  batch.update(wDoc.ref, { frequency: newFreq, updatedAt: Date.now() });
                  count++;
                  
                  if (count >= 450) {
                      await batch.commit();
                      batch = writeBatch(db);
                      count = 0;
                  }
              }
          }
          
          if (count > 0) await batch.commit();
          console.log("Frequency recomputation complete.");
      } catch (e) {
          console.error("Frequency recomputation failed:", e);
      }
  },

  // --- DATA & QUEUE LOGIC ---
  
  getSentences: async (): Promise<Sentence[]> => {
    const q = query(collection(db, 'sentences'), limit(2000)); 
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as Sentence); 
  },

  calculateInitialPriority: (sentence: string): number => {
      let score = 100;
      const len = sentence.length;
      if (len < 20) score += 20; 
      if (len > 100) score -= 10; 
      return score;
  },

  getSmartQueueTask: async (user: User, excludedIds: number[] = []): Promise<Sentence | null> => {
      try {
          const sentencesRef = collection(db, 'sentences');
          const now = Date.now();
          
          const isExperienced = (user.translatedSentenceIds?.length || 0) > 200;
          
          let qPriority = query(
              sentencesRef, 
              where('status', '==', 'open'),
              orderBy('priorityScore', 'desc'),
              limit(500)
          );
          
          let snap = await getDocs(qPriority);
          let candidates = snap.docs.map(d => d.data() as Sentence);

          if (isExperienced) {
             candidates.sort((a, b) => (b.difficulty || 1) - (a.difficulty || 1));
          } else {
             candidates.sort((a, b) => (a.difficulty || 1) - (b.difficulty || 1));
          }

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
      
      if (translation.status === 'pending') {
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
      }
      
      await batch.commit();
  },
  
  saveTranslation: async (translation: Translation) => {
      await setDoc(doc(db, 'translations', translation.id), translation, { merge: true });
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
                let diff: 1 | 2 | 3 = 2;
                if (s.english.length < 20) diff = 1;
                if (s.english.length > 100) diff = 3;

                const enhancedSentence: Sentence = {
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
      return { showDemoBanner: true, maintenanceMode: false };
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
  clearAll: async () => { console.warn("Clear All disabled in Cloud Mode for safety"); },
  getAuditLogs: async (): Promise<AuditLog[]> => {
      const q = query(collection(db, 'audit_logs'), orderBy('timestamp', 'desc'), limit(200));
      const snap = await getDocs(q);
      return mapDocs<AuditLog>(snap);
  },
  logAuditAction: async (user: User, action: string, details: string, category: AuditLog['category'] = 'system') => {
      await addDoc(collection(db, 'audit_logs'), {
          action, userId: user.id, userName: user.name, details, timestamp: Date.now(), category
      });
  }
};
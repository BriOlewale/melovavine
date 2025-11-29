import {
  Sentence,
  Translation,
  User,
  Word,
  WordTranslation,
  Announcement,
  ForumTopic,
  Project,
  UserGroup,
  AuditLog,
  Permission,
  SystemSettings,
  SpellingSuggestion,
  TranslationHistoryEntry,
  Report,
  WordCorrection,
  TranslationReview
} from '../types';
import { db, auth } from './firebaseConfig';
import {
  collection,
  getDocs,
  doc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  limit,
  writeBatch,
  getDoc,
  getCountFromServer,
  where,
  runTransaction
} from 'firebase/firestore';
// @ts-ignore
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendEmailVerification,
  applyActionCode
} from 'firebase/auth';

const ROLE_BASE_PERMISSIONS: Record<string, Permission[]> = {
  admin: [
    'user.read',
    'user.create',
    'user.edit',
    'group.read',
    'project.read',
    'project.create',
    'data.import',
    'data.export',
    'audit.view',
    'community.manage',
    'translation.delete',
    'system.manage'
  ],
  reviewer: ['translation.review', 'translation.approve', 'translation.edit', 'dictionary.manage'],
  translator: ['translation.create', 'translation.edit'],
  guest: []
};

export const ALL_PERMISSIONS: Permission[] = [
  'user.read',
  'user.create',
  'user.edit',
  'user.delete',
  'user.manage_roles',
  'group.read',
  'group.create',
  'group.edit',
  'group.delete',
  'project.read',
  'project.create',
  'project.edit',
  'translation.create',
  'translation.edit',
  'translation.review',
  'translation.approve',
  'translation.delete',
  'dictionary.manage',
  'data.import',
  'data.export',
  'audit.view',
  'community.manage',
  'system.manage'
];

const mapDocs = <T>(snapshot: any): T[] =>
  snapshot.docs.map((d: any) => ({ ...(d.data() as T), id: d.id }));

const LOCK_DURATION_MS = 10 * 60 * 1000;
const TARGET_REDUNDANCY = 2;

export const StorageService = {
  // --- AUTHENTICATION & USER MANAGEMENT ---

  login: async (
    email: string,
    password: string
  ): Promise<{ success: boolean; message?: string; user?: User; requiresVerification?: boolean }> => {
    try {
      const userCred = await signInWithEmailAndPassword(auth, email, password);
      await userCred.user.reload();

      const isAdminEmail = email.toLowerCase() === 'brime.olewale@gmail.com';
      if (!isAdminEmail && !userCred.user.emailVerified) {
        await signOut(auth);
        return {
          success: false,
          message: 'Please verify your email before signing in.',
          requiresVerification: true
        };
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
          effectivePermissions: ['*'],
          createdAt: Date.now()
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

      // Sync isVerified with Firebase Auth state (runs for all, including admin if emailVerified is true)
      if (userCred.user.emailVerified && userData.isVerified !== true) {
        await updateDoc(userDocRef, { isVerified: true });
        userData.isVerified = true;
      }

      userData.effectivePermissions = await StorageService.calculateEffectivePermissions(userData);

      // Debug log (remove in production)
      console.log('Post-login user:', userData, 'Firebase verified:', userCred.user.emailVerified);

      return { success: true, user: userData };
    } catch (e: any) {
      let msg = 'Login failed';
      if (
        e.code === 'auth/invalid-credential' ||
        e.code === 'auth/user-not-found' ||
        e.code === 'auth/wrong-password'
      ) {
        msg = 'Invalid email or password.';
      }
      return { success: false, message: msg };
    }
  },

  register: async (
    email: string,
    password: string,
    name: string
  ): Promise<{ success: boolean; message?: string }> => {
    try {
      const userCred = await createUserWithEmailAndPassword(auth, email, password);
      const newUser: User = {
        id: userCred.user.uid,
        name,
        email,
        role: 'translator',
        isActive: true,
        isVerified: false,
        groupIds: ['g-trans'],
        createdAt: Date.now()
      };

      await setDoc(doc(db, 'users', newUser.id), newUser);
      try {
        await sendEmailVerification(userCred.user);
      } catch (emailError) {
        console.error('Failed to send verification email:', emailError);
      }
      await signOut(auth);
      return { success: true };
    } catch (e: any) {
      let msg = 'Registration failed';
      if (e.code === 'auth/email-already-in-use') {
        msg = 'Email already registered.';
      }
      if (e.code === 'resource-exhausted') {
        msg = 'System busy (Quota Exceeded). Please try again later.';
      }
      return { success: false, message: msg };
    }
  },

  logout: async (): Promise<void> => {
    await signOut(auth);
  },

  resendVerificationEmail: async (): Promise<{ success: boolean; message?: string }> => {
    const user = auth.currentUser;

    // If no one is logged in, we can't send a verification email
    if (!user) {
      return { success: false, message: 'You must be logged in to resend verification email.' };
    }

    const isAdminEmail = user.email?.toLowerCase() === 'brime.olewale@gmail.com';
    if (isAdminEmail) {
      return { success: true, message: 'Admin account auto-verified—no email needed.' };
    }

    try {
      await sendEmailVerification(user);
      return { success: true };
    } catch (e: any) {
      console.error('Failed to resend verification email', e);
      let msg = 'Failed to resend verification email.';
      if (e.code === 'auth/too-many-requests') {
        msg = 'Too many attempts. Please try again later.';
      }
      return { success: false, message: msg };
    }
  },

  verifyEmailWithCode: async (
    actionCode: string
  ): Promise<{ success: boolean; message?: string }> => {
    try {
      await applyActionCode(auth, actionCode);
      return { success: true };
    } catch (e: any) {
      console.error('Failed to verify email with code', e);
      return { success: false, message: 'Invalid or expired verification link.' };
    }
  },

  updateUser: async (u: User): Promise<void> => {
    await updateDoc(doc(db, 'users', u.id), { ...u });
  },

  adminSetUserPassword: async (_userId: string, _newPass: string): Promise<void> => {
    console.warn('Password reset via Admin Panel requires Cloud Functions in Firebase.');
    alert(
      "Note: For security, Firebase does not allow admins to set user passwords directly from the client. Users must use 'Forgot Password'."
    );
  },

  // --- PERMISSIONS ---

  getUserGroups: async (): Promise<UserGroup[]> => {
    const snap = await getDocs(collection(db, 'user_groups'));
    const groups = mapDocs<UserGroup>(snap);
    if (groups.length === 0) {
      return [
        { id: 'g-admin', name: 'Administrators', permissions: ['*'], description: 'Full Access' },
        {
          id: 'g-review',
          name: 'Reviewers',
          permissions: ['translation.review', 'translation.approve'],
          description: 'Moderators'
        },
        {
          id: 'g-trans',
          name: 'Translators',
          permissions: ['translation.create'],
          description: 'Contributors'
        }
      ];
    }
    return groups;
  },

  saveUserGroup: async (group: UserGroup): Promise<void> => {
    await setDoc(doc(db, 'user_groups', group.id), group);
  },

  calculateEffectivePermissions: async (user: User): Promise<Permission[]> => {
    const groups = await StorageService.getUserGroups();
    const rolePerms = ROLE_BASE_PERMISSIONS[user.role] || [];
    let groupPerms: Permission[] = [];
    user.groupIds?.forEach((gid) => {
      const g = groups.find((x) => x.id === gid);
      if (g) groupPerms = [...groupPerms, ...g.permissions];
    });
    return Array.from(new Set([...rolePerms, ...groupPerms]));
  },

  hasPermission: (user: User | null, permission: Permission): boolean => {
    if (!user || !user.effectivePermissions) return false;
    return (
      user.effectivePermissions.includes('*') || user.effectivePermissions.includes(permission)
    );
  },

  // --- SPELLING & CORRECTIONS ---

  createSpellingSuggestion: async (suggestion: SpellingSuggestion): Promise<void> => {
    await setDoc(doc(db, 'spelling_suggestions', suggestion.id), suggestion);
  },

  getOpenSpellingSuggestions: async (): Promise<SpellingSuggestion[]> => {
    const qSp = query(
      collection(db, 'spelling_suggestions'),
      where('status', '==', 'open'),
      orderBy('createdAt', 'desc')
    );
    const snap = await getDocs(qSp);
    return mapDocs<SpellingSuggestion>(snap);
  },

  resolveSpellingSuggestion: async (
    suggestionId: string,
    status: 'accepted' | 'rejected',
    resolver: User,
    rejectionReason?: string
  ): Promise<void> => {
    await runTransaction(db, async (transaction) => {
      const suggRef = doc(db, 'spelling_suggestions', suggestionId);
      const suggSnap = await transaction.get(suggRef);
      if (!suggSnap.exists()) throw 'Suggestion not found';
      const suggestion = suggSnap.data() as SpellingSuggestion;

      if (status === 'accepted') {
        const transRef = doc(db, 'translations', suggestion.translationId);
        const transSnap = await transaction.get(transRef);
        if (!transSnap.exists()) throw 'Original translation not found';

        const trans = transSnap.data() as Translation;

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

  submitWordCorrection: async (correction: WordCorrection): Promise<void> => {
    await setDoc(doc(db, 'word_corrections', correction.id), correction);
  },

  getPendingWordCorrections: async (): Promise<WordCorrection[]> => {
    const qCor = query(
      collection(db, 'word_corrections'),
      where('status', '==', 'pending'),
      orderBy('createdAt', 'desc')
    );
    const snap = await getDocs(qCor);
    return mapDocs<WordCorrection>(snap);
  },

  updateWordCorrectionStatus: async (
    correctionId: string,
    status: 'approved' | 'rejected',
    reviewer: { id: string; name: string }
  ): Promise<void> => {
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
      const safeReview: TranslationReview = {
        ...review,
        comment: review.comment ?? ''
      };

      await setDoc(doc(db, 'translationReviews', safeReview.id), safeReview);

      let newStatus: Translation['status'] | undefined;
      if (safeReview.action === 'approved') newStatus = 'approved';
      else if (safeReview.action === 'rejected') newStatus = 'rejected';
      else if (safeReview.action === 'edited') newStatus = 'approved';

      const transRef = doc(db, 'translations', safeReview.translationId);

      await runTransaction(db, async (transaction) => {
        const transDoc = await transaction.get(transRef);
        if (!transDoc.exists()) throw 'Translation not found';

        const data = transDoc.data() as Translation;
        const currentCount = data.reviewCount || 0;

        const updates: any = {
          reviewCount: currentCount + 1,
          lastReviewedAt: review.createdAt,
          lastReviewerId: review.reviewerId,
          reviewedBy: review.reviewerId,
          reviewedAt: review.createdAt
        };

        if (newStatus) {
          updates.status = newStatus;
        }

        if (safeReview.action === 'edited' && safeReview.newText) {
          updates.text = safeReview.newText;
        }

        const historyEntry: TranslationHistoryEntry = {
  timestamp: safeReview.createdAt,
  action:
    safeReview.action === 'edited'
      ? 'edited'
      : safeReview.action === 'approved'
      ? 'approved'
      : 'rejected',
  userId: safeReview.reviewerId,
  userName: safeReview.reviewerName,
  details: {
    reason: safeReview.comment || '',  // Already safe, but explicit
    // Fallback logic: Use current text for approve/reject; only override for edits
    ...(safeReview.action === 'edited' ? {
      oldText: safeReview.previousText || data.text,
      newText: safeReview.newText || data.text
    } : {
      oldText: data.text,
      newText: data.text
    })
  }
};
updates.history = [...(data.history || []), historyEntry];

        transaction.update(transRef, updates);
      });
    } catch (error) {
      console.error('Failed to add review:', error);
      throw error;
    }
  },

  applyMinorFix: async (
    translationId: string,
    newText: string,
    reviewer: User
  ): Promise<void> => {
    try {
      const transRef = doc(db, 'translations', translationId);
      const snap = await getDoc(transRef);
      if (!snap.exists()) throw 'Translation not found';
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
      console.error('Failed to apply minor fix:', error);
      throw error;
    }
  },

  getTranslationReviews: async (translationId: string): Promise<TranslationReview[]> => {
    try {
      const qRev = query(
        collection(db, 'translationReviews'),
        where('translationId', '==', translationId),
        orderBy('createdAt', 'desc')
      );
      const snap = await getDocs(qRev);
      return mapDocs<TranslationReview>(snap);
    } catch (error) {
      console.error('Failed to fetch reviews:', error);
      return [];
    }
  },

  // --- COMMUNITY REPORTING ---

  createReport: async (report: Report): Promise<void> => {
    await setDoc(doc(db, 'reports', report.id), report);
  },

  getReports: async (): Promise<Report[]> => {
    const qRep = query(collection(db, 'reports'), orderBy('timestamp', 'desc'));
    const snap = await getDocs(qRep);
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

  // 🔒 BLOCK DUPLICATE ENGLISH WORDS
  saveWord: async (word: Word): Promise<void> => {
    const now = Date.now();

    const normalizedText = (word.normalizedText || word.text || '').toLowerCase().trim();
    if (!normalizedText) {
      throw new Error('Word text is required.');
    }

    const wordsRef = collection(db, 'words');
    const qCheck = query(wordsRef, where('normalizedText', '==', normalizedText));
    const snap = await getDocs(qCheck);

    const duplicate = snap.docs.find((docSnap) => docSnap.id !== word.id);
    if (duplicate) {
      throw new Error('This English word already exists in the dictionary.');
    }

    const enhancedWord: any = {
      ...word,
      normalizedText,
      createdAt: word.createdAt || now,
      updatedAt: now
    };

    if (enhancedWord.notes === undefined) delete enhancedWord.notes;
    if (enhancedWord.updatedBy === undefined) delete enhancedWord.updatedBy;

    await setDoc(doc(db, 'words', word.id), enhancedWord, { merge: true });
  },

  deleteWord: async (id: string): Promise<void> => {
    await deleteDoc(doc(db, 'words', id));
  },

  searchWords: async (queryStr: string): Promise<Word[]> => {
    const allWords = await StorageService.getWords();
    const lowerQ = queryStr.toLowerCase().trim();
    if (!lowerQ) return allWords;

    return allWords.filter(
      (w) =>
        w.text.toLowerCase().includes(lowerQ) ||
        w.normalizedText?.includes(lowerQ) ||
        w.meanings?.some((m) => m.toLowerCase().includes(lowerQ))
    );
  },

  recomputeWordFrequencies: async (): Promise<void> => {
    try {
      console.log('Starting frequency recomputation...');
      const sentencesRef = collection(db, 'sentences');
      const sSnap = await getDocs(sentencesRef);

      const frequencyMap = new Map<string, number>();

      sSnap.docs.forEach((docSnap) => {
        const text = docSnap.data().english as string;
        if (!text) return;
        const words = text.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/);
        words.forEach((w) => {
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
      console.log('Frequency recomputation complete.');
    } catch (e) {
      console.error('Frequency recomputation failed:', e);
    }
  },

  // --- DATA & QUEUE LOGIC ---

  getSentences: async (): Promise<Sentence[]> => {
    const qSent = query(collection(db, 'sentences'), limit(2000));
    const snap = await getDocs(qSent);
    return snap.docs.map((d) => d.data() as Sentence);
  },

  calculateInitialPriority: (sentence: string): number => {
    let score = 100;
    const len = sentence.length;
    if (len < 20) score += 20;
    if (len > 100) score -= 10;
    return score;
  },

  getSmartQueueTask: async (
    user: User,
    excludedIds: number[] = []
  ): Promise<Sentence | null> => {
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
      let candidates = snap.docs.map((d) => d.data() as Sentence);

      if (isExperienced) {
        candidates.sort((a, b) => (b.difficulty || 1) - (a.difficulty || 1));
      } else {
        candidates.sort((a, b) => (a.difficulty || 1) - (b.difficulty || 1));
      }

      const findValid = (list: Sentence[]) => {
        const shuffled = [...list].sort(() => 0.5 - Math.random());
        return shuffled.find((s) => {
          if (excludedIds.includes(s.id)) return false;
          const isLocked =
            s.lockedBy && s.lockedBy !== user.id && s.lockedUntil && s.lockedUntil > now;
          if (isLocked) return false;
          if (user.translatedSentenceIds?.includes(s.id)) return false;
          return true;
        });
      };

      let validTask = findValid(candidates);

      if (!validTask) {
        const qFallback = query(sentencesRef, where('status', '==', 'open'), limit(100));
        snap = await getDocs(qFallback);
        candidates = snap.docs.map((d) => d.data() as Sentence);
        validTask = findValid(candidates);
      }

      if (!validTask) return null;
      const success = await StorageService.lockSentence(validTask.id.toString(), user.id);
      if (success) return validTask;
      return null;
    } catch (e) {
      console.error('Smart Queue Fetch Error:', e);
      return null;
    }
  },

  lockSentence: async (sentenceId: string, userId: string): Promise<boolean> => {
    try {
      await runTransaction(db, async (transaction) => {
        const ref = doc(db, 'sentences', sentenceId);
        const sfDoc = await transaction.get(ref);
        if (!sfDoc.exists()) throw 'Document does not exist!';
        const data = sfDoc.data() as Sentence;
        const now = Date.now();
        if (
          data.lockedBy &&
          data.lockedBy !== userId &&
          data.lockedUntil &&
          data.lockedUntil > now
        ) {
          throw 'Locked by another user';
        }
        transaction.update(ref, { lockedBy: userId, lockedUntil: now + LOCK_DURATION_MS });
      });
      return true;
    } catch (e) {
      console.log('Lock failed:', e);
      return false;
    }
  },

  unlockSentence: async (sentenceId: string): Promise<void> => {
    const ref = doc(db, 'sentences', sentenceId);
    await updateDoc(ref, { lockedBy: null, lockedUntil: null });
  },

  submitTranslation: async (translation: Translation, user: User): Promise<void> => {
    const batch = writeBatch(db);
    const transRef = doc(db, 'translations', translation.id);

    batch.set(transRef, translation);

    if (translation.status === 'pending') {
      const sentenceRef = doc(db, 'sentences', translation.sentenceId.toString());
      const sSnap = await getDoc(sentenceRef);
      if (sSnap.exists()) {
        const sData = sSnap.data() as Sentence;
        const newCount = (sData.translationCount || 0) + 1;
        const updates: any = {
          lockedBy: null,
          lockedUntil: null,
          translationCount: newCount
        };
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

  saveTranslation: async (translation: Translation): Promise<void> => {
    await setDoc(doc(db, 'translations', translation.id), translation, { merge: true });
  },

  // ✅ NEW: used by App.tsx
  getTranslations: async (): Promise<Translation[]> => {
    const snap = await getDocs(collection(db, 'translations'));
    return mapDocs<Translation>(snap);
  },

  getSentenceCount: async (): Promise<number> => {
    const coll = collection(db, 'sentences');
    const snapshot = await getCountFromServer(coll);
    return snapshot.data().count;
  },

  saveSentences: async (
    sentences: any[],
    onProgress?: (count: number) => void
  ): Promise<void> => {
    const CHUNK_SIZE = 450;
    for (let i = 0; i < sentences.length; i += CHUNK_SIZE) {
      const chunk = sentences.slice(i, i + CHUNK_SIZE);
      const batch = writeBatch(db);
      chunk.forEach((s) => {
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
      await new Promise((r) => setTimeout(r, 200));
    }
  },

  // --- WORD TRANSLATIONS ---

  getWordTranslations: async (): Promise<WordTranslation[]> => {
    const snap = await getDocs(collection(db, 'word_translations'));
    return mapDocs<WordTranslation>(snap);
  },

  saveWordTranslation: async (wt: WordTranslation): Promise<void> => {
    await setDoc(doc(db, 'word_translations', wt.id), wt);
  },

  // --- ANNOUNCEMENTS ---

  getAnnouncements: async (): Promise<Announcement[]> => {
    const qAnn = query(collection(db, 'announcements'), orderBy('date', 'desc'));
    const snap = await getDocs(qAnn);
    return mapDocs<Announcement>(snap);
  },

  saveAnnouncement: async (a: Announcement): Promise<void> => {
    await setDoc(doc(db, 'announcements', a.id), a);
  },

  // --- FORUM ---

  getForumTopics: async (): Promise<ForumTopic[]> => {
    const qTop = query(collection(db, 'forum_topics'), orderBy('date', 'desc'));
    const snap = await getDocs(qTop);
    return mapDocs<ForumTopic>(snap);
  },

  saveForumTopic: async (t: ForumTopic): Promise<void> => {
    await setDoc(doc(db, 'forum_topics', t.id), t);
  },

  // --- SYSTEM SETTINGS ---

  getSystemSettings: async (): Promise<SystemSettings> => {
    const docRef = doc(db, 'system_settings', 'global');
    const snap = await getDoc(docRef);
    if (snap.exists()) return snap.data() as SystemSettings;
    return { showDemoBanner: true, maintenanceMode: false };
  },

  saveSystemSettings: async (s: SystemSettings): Promise<void> => {
    await setDoc(doc(db, 'system_settings', 'global'), s);
  },

  // --- PROJECTS (NEW) ---

  getProjects: async (): Promise<Project[]> => {
    const snap = await getDocs(collection(db, 'projects'));
    return mapDocs<Project>(snap);
  },

  saveProject: async (project: Project): Promise<void> => {
    await setDoc(doc(db, 'projects', project.id), project, { merge: true });
  },

  // --- USERS ---

  getAllUsers: async (): Promise<User[]> => {
    const snap = await getDocs(collection(db, 'users'));
    return mapDocs<User>(snap);
  },

  getCurrentUser: async (): Promise<User | null> => {
    const u = auth.currentUser;
    if (!u) return null;

    const userDocRef = doc(db, 'users', u.uid);
    const userDocSnap = await getDoc(userDocRef);

    if (!userDocSnap.exists()) {
      // Fallback for new/missing users (e.g., just registered)
      await signOut(auth);
      return null;
    }

    let userData = userDocSnap.data() as User;
    userData.id = u.uid;  // Ensure ID sync
    userData.email = u.email || userData.email;  // Sync from Auth

    // Admin override (mirrors login logic)
    const isAdminEmail = userData.email?.toLowerCase() === 'brime.olewale@gmail.com';
    if (isAdminEmail) {
      userData = {
        ...userData,
        isVerified: true,
        role: 'admin',
        groupIds: ['g-admin'],
        effectivePermissions: ['*']
      };
      await setDoc(userDocRef, userData, { merge: true });  // Persist
    }

    // Sync isVerified with Firebase if possible
    if (u.emailVerified && userData.isVerified !== true) {
      await updateDoc(userDocRef, { isVerified: true });
      userData.isVerified = true;
    }

    userData.effectivePermissions = await StorageService.calculateEffectivePermissions(userData);
    return userData;
  },

  getTargetLanguage: () => ({ code: 'hula', name: 'Hula' }),

  setTargetLanguage: () => {},

  clearAll: async (): Promise<void> => {
    console.warn('Clear All disabled in Cloud Mode for safety');
  },

  // --- AUDIT LOGS ---

  getAuditLogs: async (): Promise<AuditLog[]> => {
    const qLog = query(collection(db, 'audit_logs'), orderBy('timestamp', 'desc'), limit(200));
    const snap = await getDocs(qLog);
    return mapDocs<AuditLog>(snap);
  },

  logAuditAction: async (
    user: User,
    action: string,
    details: string,
    category: AuditLog['category'] = 'system'
  ): Promise<void> => {
    await addDoc(collection(db, 'audit_logs'), {
      action,
      userId: user.id,
      userName: user.name,
      details,
      timestamp: Date.now(),
      category
    });
  }
};
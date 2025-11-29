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
  TranslationReview,
} from '@/types';

import { db, auth } from '@/services/firebaseConfig';

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
  runTransaction,
} from 'firebase/firestore';

import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendEmailVerification,
  applyActionCode,
  GoogleAuthProvider,
  signInWithPopup,
  fetchSignInMethodsForEmail,
} from 'firebase/auth';

import { hasPermission } from '@/services/permissionService';

const ROLE_BASE_PERMISSIONS: Record<string, Permission[]> = {
  admin: ['*'],
  reviewer: [
    'translation.review',
    'translation.approve',
    'translation.edit',
    'dictionary.manage',
  ],
  translator: ['translation.create', 'translation.edit'],
  guest: [],
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
  'system.manage',
];

const mapDocs = <T>(snapshot: any): T[] =>
  snapshot.docs.map((d: any) => ({ ...d.data(), id: d.id }));

const LOCK_DURATION_MS = 10 * 60 * 1000;
const TARGET_REDUNDANCY = 2;

// Helper to map Firebase errors
const mapAuthError = (code: string): string => {
  switch (code) {
    case 'auth/email-already-in-use':
      return 'That email is already registered.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/user-not-found':
      return 'No account found with this email.';
    case 'auth/wrong-password':
      return 'Incorrect password.';
    case 'auth/weak-password':
      return 'Password should be at least 6 characters.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please try again later.';
    case 'auth/network-request-failed':
      return 'Network error. Check your connection.';
    case 'auth/expired-action-code':
      return 'This verification link has expired.';
    case 'auth/invalid-action-code':
      return 'Invalid verification link.';
    case 'resource-exhausted':
      return 'System busy (Quota Exceeded). Try again later.';
    default:
      return 'An unexpected error occurred. Please try again.';
  }
};

export const StorageService = {
  // AUTH ----------------------------------------------------------------------
  login: async (email: string, password: string) => {
    try {
      const userCred = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCred.user;
      await firebaseUser.reload();

      const isAdminEmail = email.toLowerCase() === 'brime.olewale@gmail.com';

      // Email/password users must be verified (except admin override)
      const isVerified = firebaseUser.emailVerified || isAdminEmail;

      if (!isVerified) {
        return {
          success: false,
          requiresVerification: true,
          message: 'Your email is not verified. Please check your inbox.',
        };
      }

      const userDocRef = doc(db, 'users', firebaseUser.uid);
      const userDocSnap = await getDoc(userDocRef);

      let userData: User;

      if (isAdminEmail) {
        // Ensure admin profile exists/updated
        userData = {
          id: firebaseUser.uid,
          name: 'Brime Olewale',
          email: email,
          role: 'admin',
          isActive: true,
          isVerified: true,
          emailVerified: true,
          groupIds: ['g-admin'],
          effectivePermissions: ['*'],
          createdAt: Date.now(),
        };
        await setDoc(userDocRef, userData, { merge: true });
      } else if (userDocSnap.exists()) {
        userData = userDocSnap.data() as User;

        // Sync verification flags into Firestore if not already set
        if (userData.emailVerified !== true || userData.isVerified !== true) {
          await updateDoc(userDocRef, { emailVerified: true, isVerified: true });
          userData.emailVerified = true;
          userData.isVerified = true;
        }
      } else {
        await signOut(auth);
        return {
          success: false,
          message: 'User profile not found. Please contact support.',
        };
      }

      if (userData.isActive === false) {
        await signOut(auth);
        return {
          success: false,
          message: 'This account has been deactivated by an administrator.',
        };
      }

      userData.effectivePermissions =
        await StorageService.calculateEffectivePermissions(userData);

      // Track last login time (best-effort)
      await updateDoc(userDocRef, { lastLoginAt: Date.now() }).catch(() => {});

      return { success: true, user: userData };
    } catch (e: any) {
      console.error('Login Error:', e);
      return { success: false, message: mapAuthError(e.code) };
    }
  },

  // Google sign-in – always treated as verified, no verification email required
  loginWithGoogle: async () => {
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });

      const result = await signInWithPopup(auth, provider);
      const firebaseUser = result.user;
      const email = firebaseUser.email || '';

      if (!email) {
        return {
          success: false,
          message:
            'Google account has no email associated. Please try another account.',
        };
      }

      const userDocRef = doc(db, 'users', firebaseUser.uid);
      const userDocSnap = await getDoc(userDocRef);

      const now = Date.now();
      let userData: User;

      if (userDocSnap.exists()) {
        // Existing user – update metadata
        userData = userDocSnap.data() as User;
        userData.email = email;
        userData.name =
          firebaseUser.displayName || userData.name || 'Google User';
      } else {
        // New Google user – default translator role
        userData = {
          id: firebaseUser.uid,
          name: firebaseUser.displayName || 'Google User',
          email,
          role: 'translator',
          isActive: true,
          isVerified: true,
          emailVerified: true,
          groupIds: ['g-trans'],
          permissions: [],
          createdAt: now,
        };
      }

      // Force verified flags for Google users
      userData.emailVerified = true;
      (userData as any).isVerified = true;

      // Recalculate permissions
      userData.effectivePermissions =
        await StorageService.calculateEffectivePermissions(userData);

      await setDoc(
        userDocRef,
        {
          ...userData,
          lastLoginAt: now,
          emailVerified: true,
          isVerified: true,
        },
        { merge: true }
      );

      return { success: true, user: userData };
    } catch (e: any) {
      console.error('Google Login Error:', e);

      if (e.code === 'auth/account-exists-with-different-credential') {
        const email = e.customData?.email;
        if (email) {
          const methods = await fetchSignInMethodsForEmail(auth, email);
          const first = methods[0];

          const methodText =
            first === 'google.com'
              ? 'Google'
              : first === 'password'
              ? 'email and password'
              : methods.join(', ');

          return {
            success: false,
            message: `This email is already registered using ${methodText}. Please sign in with that method first.`,
          };
        }

        return {
          success: false,
          message:
            'This email is already registered with another login method. Please use your existing login.',
        };
      }

      return { success: false, message: mapAuthError(e.code) };
    }
  },

  register: async (email: string, password: string, name: string) => {
    try {
      const userCred = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCred.user;
      await sendEmailVerification(user);

      const newUser: User = {
        id: user.uid,
        name,
        email,
        role: 'translator',
        isActive: true,
        isVerified: false,
        emailVerified: false,
        groupIds: ['g-trans'],
        permissions: [],
        createdAt: Date.now(),
      };

      await setDoc(doc(db, 'users', newUser.id), newUser);
      await signOut(auth);

      return { success: true };
    } catch (e: any) {
      console.error('Registration Error:', e);
      return { success: false, message: mapAuthError(e.code) };
    }
  },

  resendVerificationEmail: async () => {
    try {
      if (auth.currentUser) {
        await sendEmailVerification(auth.currentUser);
        return { success: true };
      }
      return { success: false, message: 'No user session found.' };
    } catch (e: any) {
      return { success: false, message: mapAuthError(e.code) };
    }
  },

  verifyEmailWithCode: async (oobCode: string) => {
    try {
      await applyActionCode(auth, oobCode);
      return { success: true };
    } catch (e: any) {
      console.error('Verification Code Error:', e);
      return { success: false, message: mapAuthError(e.code) };
    }
  },

  logout: async () => {
    await signOut(auth);
  },

  // USERS / GROUPS / PERMISSIONS ---------------------------------------------
  updateUser: async (u: User) => {
    const { effectivePermissions, ...dataToSave } = u;
    await updateDoc(doc(db, 'users', u.id), dataToSave);
  },

  adminSetUserPassword: async (_userId: string, _newPass: string) => {
    console.warn('Password reset via Admin Panel requires Cloud Functions.');
    alert(
      "Note: For security, Firebase does not allow admins to set user passwords directly. Users must use 'Forgot Password'."
    );
  },

  getUserGroups: async (): Promise<UserGroup[]> => {
    const snap = await getDocs(collection(db, 'user_groups'));
    const groups = mapDocs<UserGroup>(snap);
    if (groups.length === 0) {
      return [
        {
          id: 'g-admin',
          name: 'Administrators',
          permissions: ['*'],
          description: 'Full Access',
        },
        {
          id: 'g-review',
          name: 'Reviewers',
          permissions: ['translation.review', 'translation.approve'],
          description: 'Moderators',
        },
        {
          id: 'g-trans',
          name: 'Translators',
          permissions: ['translation.create'],
          description: 'Contributors',
        },
      ];
    }
    return groups;
  },

  saveUserGroup: async (group: UserGroup) => {
    await setDoc(doc(db, 'user_groups', group.id), group);
  },

  calculateEffectivePermissions: async (
    user: User
  ): Promise<Permission[]> => {
    const groups = await StorageService.getUserGroups();
    const rolePerms = ROLE_BASE_PERMISSIONS[user.role] || [];
    let groupPerms: Permission[] = [];
    user.groupIds?.forEach((gid) => {
      const g = groups.find((x) => x.id === gid);
      if (g) groupPerms = [...groupPerms, ...g.permissions];
    });
    return Array.from(
      new Set([...rolePerms, ...groupPerms, ...(user.permissions || [])])
    );
  },

  hasPermission: (user: User | null, permission: Permission): boolean => {
    return hasPermission(user, permission);
  },

  // SPELLING SUGGESTIONS ------------------------------------------------------
  createSpellingSuggestion: async (suggestion: SpellingSuggestion) => {
    await setDoc(doc(db, 'spelling_suggestions', suggestion.id), suggestion);
  },

  getOpenSpellingSuggestions: async (): Promise<SpellingSuggestion[]> => {
    const qRef = query(
      collection(db, 'spelling_suggestions'),
      where('status', '==', 'open'),
      orderBy('createdAt', 'desc')
    );
    const snap = await getDocs(qRef);
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
      if (!suggSnap.exists()) throw 'Suggestion not found';
      const suggestion = suggSnap.data() as SpellingSuggestion;

      if (status === 'accepted') {
        const transRef = doc(db, 'translations', suggestion.translationId);
        const transSnap = await transaction.get(transRef);
        if (!transSnap.exists()) throw 'Original translation not found';

        const trans = transSnap.data() as Translation;

        const details: any = {
          oldText: suggestion.originalText,
          newText: suggestion.suggestedText,
          suggestionId: suggestion.id,
        };
        if (suggestion.reason != null) {
          details.reason = suggestion.reason;
        }

        const historyEntry: TranslationHistoryEntry = {
          timestamp: Date.now(),
          action: 'spell_correction',
          userId: resolver.id,
          userName: resolver.name,
          details,
        };

        transaction.update(transRef, {
          text: suggestion.suggestedText,
          history: [...(trans.history || []), historyEntry],
        });
      }

      transaction.update(suggRef, {
        status,
        resolvedAt: Date.now(),
        resolvedByUserId: resolver.id,
        resolvedByUserName: resolver.name,
        rejectionReason: rejectionReason ?? null,
      });
    });
  },

  // WORD CORRECTIONS ----------------------------------------------------------
  submitWordCorrection: async (correction: WordCorrection) => {
    await setDoc(doc(db, 'word_corrections', correction.id), correction);
  },

  getPendingWordCorrections: async (): Promise<WordCorrection[]> => {
    const qRef = query(
      collection(db, 'word_corrections'),
      where('status', '==', 'pending'),
      orderBy('createdAt', 'desc')
    );
    const snap = await getDocs(qRef);
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
      reviewedAt: Date.now(),
    });
  },

  // TRANSLATION REVIEWS -------------------------------------------------------
  addTranslationReview: async (review: TranslationReview): Promise<void> => {
    try {
      // 1) Clean top-level review object (no undefineds)
      const cleanReview: any = { ...review };
      if (cleanReview.comment === undefined) delete cleanReview.comment;
      if (cleanReview.previousText === undefined)
        delete cleanReview.previousText;
      if (cleanReview.newText === undefined) delete cleanReview.newText;

      await setDoc(doc(db, 'translationReviews', cleanReview.id), cleanReview);

      // 2) Decide new translation status based on review action
      let newStatus: Translation['status'] | undefined;
      if (review.action === 'approved') newStatus = 'approved';
      else if (review.action === 'rejected') newStatus = 'rejected';
      else if (review.action === 'edited') newStatus = 'approved';
      else if (review.action === 'needs_attention') newStatus = 'needs_attention';

      const transRef = doc(db, 'translations', review.translationId);

      await runTransaction(db, async (transaction) => {
        const transDoc = await transaction.get(transRef);
        if (!transDoc.exists()) throw 'Translation not found';
        const data = transDoc.data() as Translation;

        const updates: any = {
          reviewCount: (data.reviewCount || 0) + 1,
          lastReviewedAt: review.createdAt,
          lastReviewerId: review.reviewerId,
          reviewedBy: review.reviewerId,
          reviewedAt: review.createdAt,
        };

        if (newStatus) updates.status = newStatus;
        if (review.action === 'edited' && review.newText) {
          updates.text = review.newText;
        }

        // 3) Build 'details' object without undefineds
        const details: any = {};
        if (review.previousText !== undefined)
          details.oldText = review.previousText;
        if (review.newText !== undefined) details.newText = review.newText;
        if (review.comment !== undefined) details.reason = review.comment;

        const historyEntry: TranslationHistoryEntry = {
          timestamp: review.createdAt,
          action: review.action === 'edited' ? 'edited' : review.action,
          userId: review.reviewerId,
          userName: review.reviewerName,
          ...(Object.keys(details).length ? { details } : {}),
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
        createdAt: Date.now(),
      };

      await StorageService.addTranslationReview(review);
    } catch (error) {
      console.error('Failed to apply minor fix:', error);
      throw error;
    }
  },

  getTranslationReviews: async (
    translationId: string
  ): Promise<TranslationReview[]> => {
    try {
      const qRef = query(
        collection(db, 'translationReviews'),
        where('translationId', '==', translationId),
        orderBy('createdAt', 'desc')
      );
      const snap = await getDocs(qRef);
      return mapDocs<TranslationReview>(snap);
    } catch (error) {
      console.error('Failed to fetch reviews:', error);
      return [];
    }
  },

  // REPORTS -------------------------------------------------------------------
  createReport: async (report: Report) => {
    await setDoc(doc(db, 'reports', report.id), report);
  },

  getReports: async (): Promise<Report[]> => {
    const qRef = query(
      collection(db, 'reports'),
      orderBy('timestamp', 'desc')
    );
    const snap = await getDocs(qRef);
    return mapDocs<Report>(snap);
  },

  // WORDS ---------------------------------------------------------------------
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
    if (enhancedWord.createdBy === undefined) delete enhancedWord.createdBy;

    await setDoc(doc(db, 'words', word.id), enhancedWord, { merge: true });
  },

  deleteWord: async (id: string) => {
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

  recomputeWordFrequencies: async () => {
    try {
      const sentencesRef = collection(db, 'sentences');
      const sSnap = await getDocs(sentencesRef);
      const frequencyMap = new Map<string, number>();

      sSnap.docs.forEach((docSnap) => {
        const text = docSnap.data().english as string;
        if (!text) return;
        const words = text
          .toLowerCase()
          .replace(/[^\w\s]/g, '')
          .split(/\s+/);
        words.forEach((w) => {
          if (w.length > 1)
            frequencyMap.set(w, (frequencyMap.get(w) || 0) + 1);
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
          batch.update(wDoc.ref, {
            frequency: newFreq,
            updatedAt: Date.now(),
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
    } catch (e) {
      console.error(e);
    }
  },

  // SENTENCES -----------------------------------------------------------------
  getSentences: async (): Promise<Sentence[]> => {
    const qRef = query(collection(db, 'sentences'), limit(2000));
    const snap = await getDocs(qRef);
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
      const isExperienced =
        (user.translatedSentenceIds?.length || 0) > 200;

      let qPriority = query(
        sentencesRef,
        where('status', '==', 'open'),
        orderBy('priorityScore', 'desc'),
        limit(500)
      );
      let snap = await getDocs(qPriority);
      let candidates = snap.docs.map((d) => d.data() as Sentence);

      if (isExperienced) {
        candidates.sort(
          (a, b) => (b.difficulty || 1) - (a.difficulty || 1)
        );
      } else {
        candidates.sort(
          (a, b) => (a.difficulty || 1) - (b.difficulty || 1)
        );
      }

      const findValid = (list: Sentence[]) => {
        const shuffled = list.sort(() => 0.5 - Math.random());
        return shuffled.find((s) => {
          if (excludedIds.includes(s.id)) return false;
          const isLocked =
            s.lockedBy &&
            s.lockedBy !== user.id &&
            s.lockedUntil &&
            s.lockedUntil > now;
          if (isLocked) return false;
          if (user.translatedSentenceIds?.includes(s.id)) return false;
          return true;
        });
      };

      let validTask = findValid(candidates);
      if (!validTask) {
        const qFallback = query(
          sentencesRef,
          where('status', '==', 'open'),
          limit(100)
        );
        snap = await getDocs(qFallback);
        candidates = snap.docs.map((d) => d.data() as Sentence);
        validTask = findValid(candidates);
      }

      if (!validTask) return null;
      const success = await StorageService.lockSentence(
        validTask.id.toString(),
        user.id
      );
      if (success) return validTask;
      return null;
    } catch (e) {
      console.error('Smart Queue Fetch Error:', e);
      return null;
    }
  },

  lockSentence: async (
    sentenceId: string,
    userId: string
  ): Promise<boolean> => {
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
        transaction.update(ref, {
          lockedBy: userId,
          lockedUntil: now + LOCK_DURATION_MS,
        });
      });
      return true;
    } catch (e) {
      console.log(e);
      return false;
    }
  },

  unlockSentence: async (sentenceId: string) => {
    const ref = doc(db, 'sentences', sentenceId);
    await updateDoc(ref, { lockedBy: null, lockedUntil: null });
  },

  saveSentences: async (
    sentences: any[],
    onProgress?: (count: number) => void
  ) => {
    const CHUNK_SIZE = 450;
    for (let i = 0; i < sentences.length; i += CHUNK_SIZE) {
      const chunk = sentences.slice(i, i + CHUNK_SIZE);
      const batch = writeBatch(db);
      chunk.forEach((s) => {
        if (s.id && s.english) {
          const ref = doc(db, 'sentences', s.id.toString());
          let diff: 1 | 2 | 3 = 2;
          if (s.english.length < 20) diff = 1;
          if (s.english.length > 100) diff = 3;
          const enhancedSentence: Sentence = {
            priorityScore: StorageService.calculateInitialPriority(
              s.english
            ),
            status: 'open',
            translationCount: 0,
            targetTranslations: TARGET_REDUNDANCY,
            lockedBy: null,
            lockedUntil: null,
            difficulty: diff,
            length: s.english.length,
            projectId: s.projectId,
            id: s.id,
            english: s.english,
            ...s,
          };
          batch.set(ref, enhancedSentence);
        }
      });
      await batch.commit();
      if (onProgress) onProgress(Math.min(i + CHUNK_SIZE, sentences.length));
      await new Promise((r) => setTimeout(r, 200));
    }
  },

  getSentenceCount: async (): Promise<number> => {
    const coll = collection(db, 'sentences');
    const snapshot = await getCountFromServer(coll);
    return snapshot.data().count;
  },

  // TRANSLATIONS --------------------------------------------------------------
  submitTranslation: async (translation: Translation, user: User) => {
    const batch = writeBatch(db);
    const transRef = doc(db, 'translations', translation.id);
    batch.set(transRef, translation);

    if (translation.status === 'pending') {
      const sentenceRef = doc(
        db,
        'sentences',
        translation.sentenceId.toString()
      );
      const sSnap = await getDoc(sentenceRef);
      if (sSnap.exists()) {
        const sData = sSnap.data() as Sentence;
        const newCount = (sData.translationCount || 0) + 1;
        const updates: any = {
          lockedBy: null,
          lockedUntil: null,
          translationCount: newCount,
        };
        if (
          newCount >=
          (sData.targetTranslations || TARGET_REDUNDANCY)
        ) {
          updates.status = 'needs_review';
          updates.priorityScore = 0;
        }
        batch.update(sentenceRef, updates);
      }

      const userRef = doc(db, 'users', user.id);
      const newHistory = [
        ...(user.translatedSentenceIds || []),
        translation.sentenceId,
      ];
      const uniqueHistory = Array.from(new Set(newHistory));
      batch.update(userRef, { translatedSentenceIds: uniqueHistory });
    }

    await batch.commit();
  },

  saveTranslation: async (translation: Translation) => {
    await setDoc(doc(db, 'translations', translation.id), translation, {
      merge: true,
    });
  },

  getTranslations: async (): Promise<Translation[]> => {
    const snap = await getDocs(collection(db, 'translations'));
    return mapDocs<Translation>(snap);
  },

  deleteTranslation: async (id: string) => {
    await deleteDoc(doc(db, 'translations', id));
  },

  // PROJECTS ------------------------------------------------------------------
  getProjects: async (): Promise<Project[]> => {
    const snap = await getDocs(collection(db, 'projects'));
    const projects = mapDocs<Project>(snap);
    if (projects.length === 0) {
      return [
        {
          id: 'default-project',
          name: 'General',
          targetLanguageCode: 'hula',
          status: 'active',
          createdAt: Date.now(),
        },
      ];
    }
    return projects;
  },

  saveProject: async (project: Project) => {
    await setDoc(doc(db, 'projects', project.id), project);
  },

  // WORD TRANSLATIONS ---------------------------------------------------------
  getWordTranslations: async (): Promise<WordTranslation[]> => {
    const snap = await getDocs(collection(db, 'word_translations'));
    return mapDocs<WordTranslation>(snap);
  },

  saveWordTranslation: async (wt: WordTranslation) => {
    await setDoc(doc(db, 'word_translations', wt.id), wt);
  },

  // ANNOUNCEMENTS / FORUM -----------------------------------------------------
  getAnnouncements: async (): Promise<Announcement[]> => {
    const qRef = query(
      collection(db, 'announcements'),
      orderBy('date', 'desc')
    );
    const snap = await getDocs(qRef);
    return mapDocs<Announcement>(snap);
  },

  saveAnnouncement: async (a: Announcement) => {
    await setDoc(doc(db, 'announcements', a.id), a);
  },

  getForumTopics: async (): Promise<ForumTopic[]> => {
    const qRef = query(
      collection(db, 'forum_topics'),
      orderBy('date', 'desc')
    );
    const snap = await getDocs(qRef);
    return mapDocs<ForumTopic>(snap);
  },

  saveForumTopic: async (t: ForumTopic) => {
    await setDoc(doc(db, 'forum_topics', t.id), t);
  },

  // SYSTEM SETTINGS -----------------------------------------------------------
  getSystemSettings: async (): Promise<SystemSettings> => {
    const docRef = doc(db, 'system_settings', 'global');
    const snap = await getDoc(docRef);
    if (snap.exists()) return snap.data() as SystemSettings;
    return { showDemoBanner: true, maintenanceMode: false };
  },

  saveSystemSettings: async (s: SystemSettings) => {
    await setDoc(doc(db, 'system_settings', 'global'), s);
  },

  // USERS ---------------------------------------------------------------------
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
      isActive: true,
      emailVerified: u.emailVerified,
      permissions: [],
      createdAt: Date.now(),
    };
  },

  // LANGUAGE TARGET -----------------------------------------------------------
  getTargetLanguage: () => ({ code: 'hula', name: 'Hula' }),
  setTargetLanguage: () => {},

  // ADMIN / UTILITIES ---------------------------------------------------------
  clearAll: async () => {
    console.warn('Clear All disabled in Cloud Mode for safety');
  },

  getAuditLogs: async (): Promise<AuditLog[]> => {
    const qRef = query(
      collection(db, 'audit_logs'),
      orderBy('timestamp', 'desc'),
      limit(200)
    );
    const snap = await getDocs(qRef);
    return mapDocs<AuditLog>(snap);
  },

  logAuditAction: async (
    user: User,
    action: string,
    details: string,
    category: AuditLog['category'] = 'system'
  ) => {
    await addDoc(collection(db, 'audit_logs'), {
      action,
      userId: user.id,
      userName: user.name,
      details,
      timestamp: Date.now(),
      category,
    });
  },
};

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
  sendEmailVerification
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
  ): Promise<{ success: boolean; message?: string; user?: User }> => {
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
        groupIds: ['g-trans']
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
      if (e.code === 'auth/email-

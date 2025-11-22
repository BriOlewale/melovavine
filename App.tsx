import React, { useState, useEffect, useMemo } from 'react';
import { Header } from './components/Header';
import { Dashboard } from './components/Dashboard';
import { Translator } from './components/Translator';
import { Reviewer } from './components/Reviewer';
import { AdminPanel } from './components/AdminPanel';
import { Dictionary } from './components/Dictionary';
import { Leaderboard } from './components/Leaderboard';
import { CommunityHub } from './components/CommunityHub';
import { Auth } from './components/Auth';
import { StorageService } from './services/storageService';
import { Sentence, Translation, User, PNG_LANGUAGES, Word, WordTranslation, Comment, Announcement, ForumTopic } from './types';
import { auth } from './services/firebaseConfig';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './services/firebaseConfig';

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<string>('dashboard');
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Data State
  const [sentences, setSentences] = useState<Sentence[]>([]);
  const [translations, setTranslations] = useState<Translation[]>([]);
  const [words, setWords] = useState<Word[]>([]);
  const [wordTranslations, setWordTranslations] = useState<WordTranslation[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [forumTopics, setForumTopics] = useState<ForumTopic[]>([]);
  const [showDemoBanner, setShowDemoBanner] = useState(false); 

  const targetLanguage = PNG_LANGUAGES[0];

  // Initial Data Load
  useEffect(() => {
      const init = async () => {
          try {
            const [s, t, w, wt, u, a, f, set] = await Promise.all([
                StorageService.getSentences(),
                StorageService.getTranslations(),
                StorageService.getWords(),
                StorageService.getWordTranslations(),
                StorageService.getAllUsers(),
                StorageService.getAnnouncements(),
                StorageService.getForumTopics(),
                StorageService.getSystemSettings()
            ]);
            setSentences(s); setTranslations(t); setWords(w); setWordTranslations(wt);
            setAllUsers(u); setAnnouncements(a); setForumTopics(f);
            setShowDemoBanner(set.showDemoBanner);
          } catch (e) {
              console.error("Failed to load data", e);
          } finally {
              setIsLoading(false);
          }
      };

      // Check for verification token in URL
      const params = new URLSearchParams(window.location.search);
      const verifyToken = params.get('verify');
      if (verifyToken) {
          StorageService.verifyEmail(verifyToken).then(res => {
              if (res.success) {
                  alert("Email verified successfully! You can now log in.");
                  window.history.replaceState({}, document.title, window.location.pathname);
              } else {
                  alert("Verification failed.");
              }
          });
      }

      // Auth Listener
      const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
          if (firebaseUser) {
              // Fetch detailed profile
              const docRef = doc(db, 'users', firebaseUser.uid);
              const snap = await getDoc(docRef);
              
              if (snap.exists()) {
                  let userData = snap.data() as User;
                  
                  // SELF-HEALING: Force Super Admin logic if missing
                  if (firebaseUser.email === 'brime.olewale@gmail.com' && userData.role !== 'admin') {
                      console.log("Self-healing: Promoting Brime to Admin...");
                      userData = {
                          ...userData,
                          role: 'admin',
                          groupIds: ['g-admin']
                      };
                      await setDoc(docRef, userData, { merge: true });
                      alert("System recognized Super Admin. Access updated.");
                  }

                  userData.effectivePermissions = await StorageService.calculateEffectivePermissions(userData);
                  setUser(userData);
                  init(); 
              } else {
                  // Handle case where auth exists but profile doesn't (rare)
                  setUser(null);
                  setIsLoading(false);
              }
          } else {
              setUser(null);
              setIsLoading(false);
          }
      });

      return () => unsubscribe();
  }, []);

  const pendingReviewCount = useMemo(() => {
    return translations.filter(t => t.languageCode === targetLanguage.code && t.status === 'pending').length;
  }, [translations, targetLanguage]);

  const handleNavigate = (page: string) => setCurrentPage(page);

  const handleImportSentences = async (newSentences: Sentence[]) => { 
      // Updated to support batching via StorageService directly or wrapped
      setSentences(prev => [...prev, ...newSentences]); 
      window.location.reload(); 
  };
  
  const handleSaveTranslation = async (translation: Translation) => {
    await StorageService.saveTranslation(translation);
    setTranslations(prev => {
       const idx = prev.findIndex(t => t.id === translation.id);
       if (idx >= 0) { const copy = [...prev]; copy[idx] = translation; return copy; }
       return [...prev, translation];
    });
  };
  
  const handleSaveWordTranslation = async (wordText: string, normalizedText: string, translation: string, notes: string, exampleSentenceId: number) => {
      if (!user) return;
      let wordId = words.find(w => w.normalizedText === normalizedText)?.id;
      if (!wordId) {
          const newWord: Word = { id: crypto.randomUUID(), text: wordText, normalizedText };
          await StorageService.saveWord(newWord);
          setWords(prev => [...prev, newWord]);
          wordId = newWord.id;
      }
      const newWT: WordTranslation = { id: crypto.randomUUID(), wordId, languageCode: targetLanguage.code, translation, notes, exampleSentenceId, createdByUserId: user.id, timestamp: Date.now() };
      await StorageService.saveWordTranslation(newWT);
      setWordTranslations(prev => [...prev, newWT]);
  };

  const handleReviewAction = async (translationId: string, status: 'approved' | 'rejected', feedback?: string) => {
      const translation = translations.find(t => t.id === translationId);
      if (translation && user) {
          const historyEntry = { timestamp: Date.now(), action: status, userId: user.id, userName: user.name, details: { feedback } };
          const updated: Translation = { ...translation, status: status, reviewedBy: user.id, reviewedAt: Date.now(), feedback: feedback, history: [...(translation.history || []), historyEntry as any] };
          handleSaveTranslation(updated);
      }
  };

  const handleVote = async (translationId: string, voteType: 'up' | 'down') => {
    if (!user) return;
    const translation = translations.find(t => t.id === translationId);
    if (!translation) return;
    const history = { ...(translation.voteHistory || {}) };
    const currentVote = history[user.id];
    let newVotes = translation.votes;
    if (currentVote === voteType) { delete history[user.id]; newVotes -= (voteType === 'up' ? 1 : -1); }
    else {
        if (currentVote) newVotes -= (currentVote === 'up' ? 1 : -1);
        history[user.id] = voteType;
        newVotes += (voteType === 'up' ? 1 : -1);
    }
    handleSaveTranslation({ ...translation, votes: newVotes, voteHistory: history });
  };

  const handleAddComment = async (translationId: string, text: string) => {
      if (!user) return;
      const translation = translations.find(t => t.id === translationId);
      if (translation) {
        const newComment: Comment = { id: crypto.randomUUID(), userId: user.id, userName: user.name, text, timestamp: Date.now() };
        handleSaveTranslation({ ...translation, comments: [...(translation.comments || []), newComment] });
      }
  };
  
  const handleAddAnnouncement = async (t: string, c: string) => { if(!user) return; const a: Announcement = { id: crypto.randomUUID(), title: t, content: c, date: Date.now(), author: user.name }; await StorageService.saveAnnouncement(a); setAnnouncements(p => [a, ...p]); };
  const handleAddTopic = async (t: string, c: string, cat: ForumTopic['category']) => { if(!user) return; const top: ForumTopic = { id: crypto.randomUUID(), title: t, content: c, authorId: user.id, authorName: user.name, date: Date.now(), replies: [], category: cat }; await StorageService.saveForumTopic(top); setForumTopics(p => [top, ...p]); };
  const handleReplyToTopic = async (tid: string, c: string) => { if(!user) return; const topic = forumTopics.find(t => t.id === tid); if(!topic) return; const rep = { id: crypto.randomUUID(), content: c, authorId: user.id, authorName: user.name, date: Date.now() }; const up = { ...topic, replies: [...topic.replies, rep] }; await StorageService.saveForumTopic(up); setForumTopics(p => p.map(x => x.id === tid ? up : x)); };

  const handleLogin = (loggedInUser: User) => { setUser(loggedInUser); };
  const handleLogout = () => { StorageService.logout(); setUser(null); setCurrentPage('dashboard'); };

  if (isLoading) return <div className="min-h-screen flex items-center justify-center">Loading Va Vanagi Cloud...</div>;
  if (!user) return <Auth onLogin={handleLogin} />;

  const canAccessAdmin = StorageService.hasPermission(user, 'user.read') || user.role === 'admin';
  const canAccessReview = StorageService.hasPermission(user, 'translation.review') || user.role === 'reviewer';

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900">
      {showDemoBanner && (
          <div className="bg-indigo-600 text-white px-4 py-2 text-center text-sm font-medium flex justify-between items-center">
              <span>⚠ <strong>Cloud Demo:</strong> Connected to Firebase Firestore.</span>
              <button onClick={() => setShowDemoBanner(false)} className="text-indigo-200 hover:text-white">&times;</button>
          </div>
      )}
      <Header user={user} onNavigate={handleNavigate} onSwitchRole={handleLogout} pendingReviewCount={pendingReviewCount} />
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="space-y-6">
            {currentPage === 'dashboard' && <Dashboard sentences={sentences} translations={translations} language={targetLanguage} />}
            {currentPage === 'community' && <CommunityHub user={user} announcements={announcements} forumTopics={forumTopics} onAddAnnouncement={handleAddAnnouncement} onAddTopic={handleAddTopic} onReplyToTopic={handleReplyToTopic} />}
            {currentPage === 'translate' && <Translator sentences={sentences} translations={translations} user={user} users={allUsers} targetLanguage={targetLanguage} onSaveTranslation={handleSaveTranslation} onVote={handleVote} words={words} wordTranslations={wordTranslations} onSaveWordTranslation={handleSaveWordTranslation} onAddComment={handleAddComment} />}
            {currentPage === 'dictionary' && <Dictionary words={words} wordTranslations={wordTranslations} />}
            {currentPage === 'leaderboard' && <Leaderboard translations={translations} users={allUsers} targetLanguage={targetLanguage} />}
            {currentPage === 'review' && (canAccessReview ? <Reviewer sentences={sentences} translations={translations} user={user} targetLanguage={targetLanguage} onReviewAction={handleReviewAction} onUpdateTranslation={handleSaveTranslation} /> : <div className="p-4 bg-red-50 text-red-700">Access Denied</div>)}
            {currentPage === 'admin' && (canAccessAdmin ? <AdminPanel onImportSentences={handleImportSentences} /> : <div className="p-4 bg-red-50 text-red-700">Access Denied</div>)}
        </div>
      </main>
    </div>
  );
};

export default App;
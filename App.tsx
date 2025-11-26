import React, { useState, useEffect, useMemo } from 'react';
import { Header } from './components/Header';
import { Dashboard } from './components/Dashboard';
import { Translator } from './components/Translator';
import { Reviewer } from './components/Reviewer';
import { AdminPanel } from './components/AdminPanel';
import { Dictionary } from './components/Dictionary';
import { Leaderboard } from './components/Leaderboard';
import { CommunityHub } from './components/CommunityHub';
import { Corpus } from './components/Corpus';
import { Auth } from './components/Auth';
import { StorageService } from './services/storageService';
import { hasPermission } from './services/permissionService';
import { Sentence, Translation, User, PNG_LANGUAGES, Word, WordTranslation, Comment, Announcement, ForumTopic, TranslationHistoryEntry, Report, WordCorrection, WordCategory } from './types';
import { auth } from './services/firebaseConfig';
// @ts-ignore
import { onAuthStateChanged } from 'firebase/auth';
import { ToastContainer, toast, Button, Card } from './components/UI';
import { ReportModal } from './components/ReportModal';
import { VerificationSuccess } from './src/pages/VerificationSuccess';

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<string>('dashboard');
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showDemoBanner, setShowDemoBanner] = useState(false); 
  
  // Verification State
  const [verificationCode, setVerificationCode] = useState<string | null>(null);

  // Data State
  const [sentences, setSentences] = useState<Sentence[]>([]);
  const [totalSentenceCount, setTotalSentenceCount] = useState(0);
  const [translations, setTranslations] = useState<Translation[]>([]);
  const [words, setWords] = useState<Word[]>([]);
  const [wordTranslations, setWordTranslations] = useState<WordTranslation[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [forumTopics, setForumTopics] = useState<ForumTopic[]>([]);
  
  // Report Modal State
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportTarget, setReportTarget] = useState<{ type: 'sentence' | 'translation', id: string | number } | null>(null);

  const targetLanguage = PNG_LANGUAGES[0];

  // Initial Data Load & Routing Check
  useEffect(() => {
      const params = new URLSearchParams(window.location.search);
      const mode = params.get('mode');
      const oobCode = params.get('oobCode');

      if (mode === 'verifyEmail' && oobCode) {
          setVerificationCode(oobCode);
          setIsLoading(false);
          return;
      }

      const init = async () => {
          try {
            const [s, t, w, wt, u, a, f, set, count] = await Promise.all([
                StorageService.getSentences(),
                StorageService.getTranslations(),
                StorageService.getWords(),
                StorageService.getWordTranslations(),
                StorageService.getAllUsers(),
                StorageService.getAnnouncements(),
                StorageService.getForumTopics(),
                StorageService.getSystemSettings(),
                StorageService.getSentenceCount()
            ]);
            setSentences(s); setTranslations(t); setWords(w); setWordTranslations(wt);
            setAllUsers(u); setAnnouncements(a); setForumTopics(f);
            setShowDemoBanner(set.showDemoBanner);
            setTotalSentenceCount(count);
          } catch (e) {
              console.error("Failed to load data", e);
          } finally {
              setIsLoading(false);
          }
      };

      const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: any) => {
          if (firebaseUser) {
              // Reload to get fresh emailVerified status
              try { await firebaseUser.reload(); } catch (e) { /* ignore */ }
              
              // CRITICAL: We use StorageService.getCurrentUser() because it maps the
              // Firebase Auth user to our internal User type with correct Permissions/Roles.
              // This ensures consistent RBAC behavior across the entire app.
              const appUser = await StorageService.getCurrentUser();
              
              if (appUser && appUser.isActive) {
                  setUser(appUser);
                  init(); 
              } else {
                  // User disabled or not found
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
  const handleImportSentences = async () => { window.location.reload(); };
  
  const handleSaveTranslation = async (translation: Translation) => {
    setTranslations(prev => {
       const idx = prev.findIndex(t => t.id === translation.id);
       if (idx >= 0) { const copy = [...prev]; copy[idx] = translation; return copy; }
       return [...prev, translation];
    });
    await StorageService.saveTranslation(translation);
  };
  
  const handleSaveWordTranslation = async (wt: WordTranslation) => {
      await StorageService.saveWordTranslation(wt);
      setWordTranslations(prev => {
          const existingIndex = prev.findIndex(x => x.id === wt.id);
          if (existingIndex >= 0) {
              const copy = [...prev];
              copy[existingIndex] = wt;
              return copy;
          }
          return [...prev, wt];
      });
  };

  const handleAddWord = async (input: Partial<Word>) => {
      if (!user || !input.text) return;
      
      const newWord: Word = {
        id: input.id || crypto.randomUUID(),
        language: targetLanguage.code,
        text: input.text,
        normalizedText: input.normalizedText || input.text.toLowerCase().trim(),
        meanings: input.meanings || [],
        categories: (input.categories || []) as WordCategory[],
        notes: input.notes || undefined, 
        frequency: input.frequency || 0,
        createdAt: input.createdAt || Date.now(),
        updatedAt: Date.now(),
        createdBy: user.id,
        updatedBy: user.id,
      };

      try {
          await StorageService.saveWord(newWord);
          setWords(prev => [...prev, newWord]);
          toast.success("Word added successfully");
      } catch (error: any) {
          console.error('Failed to add word:', error);
          toast.error(`Failed to add word: ${error?.code || error?.message || 'Unknown error'}`);
      }
  };

  const handleSuggestWordCorrection = async (
      wordId: string,
      suggestion: { type: 'meaning' | 'spelling' | 'category' | 'note'; newValue: any; comment?: string }
    ) => {
      if (!user) return;
      const word = words.find(w => w.id === wordId);
      if (!word) return;

      const correction: WordCorrection = {
        id: crypto.randomUUID(),
        wordId: wordId,
        suggestedBy: user.id,
        suggestedByName: user.name,
        suggestionType: suggestion.type,
        oldValue: (() => {
          switch (suggestion.type) {
            case 'meaning': return word.meanings;
            case 'spelling': return word.text;
            case 'category': return word.categories;
            case 'note': return word.notes || '';
            default: return null;
          }
        })(),
        newValue: suggestion.newValue,
        createdAt: Date.now(),
        status: 'pending',
      };

      try {
          await StorageService.submitWordCorrection(correction);
          toast.success("Correction suggestion submitted!");
      } catch (error) {
          console.error(error);
          toast.error("Failed to submit suggestion.");
      }
  };

  const handleDeleteWord = async (wordId: string) => {
      if (!user) return;
      try {
          await StorageService.deleteWord(wordId);
          setWords(prev => prev.filter(w => w.id !== wordId));
          toast.success("Word deleted.");
      } catch (e: any) {
          console.error("Delete word failed", e);
          toast.error("Failed to delete word.");
      }
  };

  const handleReviewAction = async (
      translationId: string, 
      status: 'approved' | 'rejected' | 'needs_attention', 
      feedback?: string
  ) => {
      const translation = translations.find(t => t.id === translationId);
      if (!translation || !user) {
          return;
      }

      try {
          const safeFeedback = feedback || null;

          const historyEntry: TranslationHistoryEntry = { 
              timestamp: Date.now(), 
              action: status, 
              userId: user.id, 
              userName: user.name, 
              details: { 
                  feedback: safeFeedback,
                  oldText: translation.text,
                  newText: translation.text
              } 
          };

          const updated: Translation = { 
              ...translation, 
              status: status, 
              reviewedBy: user.id, 
              reviewedAt: Date.now(), 
              feedback: safeFeedback, 
              history: [...(translation.history || []), historyEntry] 
          };

          await handleSaveTranslation(updated);
          
      } catch (error) {
          console.error("Review Action Failed:", error);
          throw error; 
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

  const handleFlag = (type: 'sentence' | 'translation', id: string | number) => {
      setReportTarget({ type, id });
      setIsReportModalOpen(true);
  };

  const submitReport = async (reason: string) => {
      if (!user || !reportTarget) return;
      
      const report: Report = {
          id: crypto.randomUUID(),
          type: reportTarget.type,
          sentenceId: reportTarget.type === 'sentence' ? (reportTarget.id as number) : undefined,
          translationId: reportTarget.type === 'translation' ? (reportTarget.id as string) : undefined,
          reportedBy: user.id,
          reportedByName: user.name,
          reason,
          timestamp: Date.now(),
          status: 'open'
      };

      try {
          await StorageService.createReport(report);
          toast.success("Report submitted. Thank you!");
          setIsReportModalOpen(false);
      } catch (error) {
          console.error(error);
          toast.error("Failed to submit report.");
      }
  };
  
  const handleAddAnnouncement = async (t: string, c: string) => { if(!user) return; const a: Announcement = { id: crypto.randomUUID(), title: t, content: c, date: Date.now(), author: user.name }; await StorageService.saveAnnouncement(a); setAnnouncements(p => [a, ...p]); };
  const handleAddTopic = async (t: string, c: string, cat: ForumTopic['category']) => { if(!user) return; const top: ForumTopic = { id: crypto.randomUUID(), title: t, content: c, authorId: user.id, authorName: user.name, date: Date.now(), replies: [], category: cat }; await StorageService.saveForumTopic(top); setForumTopics(p => [top, ...p]); };
  const handleReplyToTopic = async (tid: string, c: string) => { if(!user) return; const topic = forumTopics.find(t => t.id === tid); if(!topic) return; const rep = { id: crypto.randomUUID(), content: c, authorId: user.id, authorName: user.name, date: Date.now() }; const up = { ...topic, replies: [...topic.replies, rep] }; await StorageService.saveForumTopic(up); setForumTopics(p => p.map(x => x.id === tid ? up : x)); };

  const handleLogin = (loggedInUser: User) => { setUser(loggedInUser); };
  const handleLogout = () => { StorageService.logout(); setUser(null); setCurrentPage('dashboard'); };

  const handleSaveWordTranslationLegacy = async (_wt: string, wordText: string, translation: string, notes: string, sentenceId: number) => {
      if (!user) return;
      const normalizedText = wordText.toLowerCase().trim();
      let word = words.find(w => w.normalizedText === normalizedText);
      let wordId = word?.id;

      if (!word) {
          wordId = crypto.randomUUID();
          const newWord: Word = {
              id: wordId,
              text: wordText,
              normalizedText: normalizedText,
              meanings: [translation], 
              categories: [],
              createdAt: Date.now(),
              updatedAt: Date.now(),
              createdBy: user.id,
              updatedBy: user.id,
              frequency: 1
          };
          await StorageService.saveWord(newWord);
          setWords(prev => [...prev, newWord]);
      }

      const newWT: WordTranslation = { 
          id: crypto.randomUUID(), 
          wordId: wordId!, 
          languageCode: targetLanguage.code, 
          translation: translation, 
          notes: notes, 
          exampleSentenceId: sentenceId, 
          createdByUserId: user.id, 
          timestamp: Date.now() 
      };
      
      handleSaveWordTranslation(newWT);
      toast.success("Word saved to dictionary!");
  };

  if (verificationCode) {
      return <VerificationSuccess actionCode={verificationCode} />;
  }

  if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-500"></div></div>;
  if (!user) return <Auth onLogin={handleLogin} />;

  // VERIFICATION GATE
  if (!user.emailVerified) {
      return (
          <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
              <Card className="max-w-md w-full text-center">
                  <div className="mx-auto h-16 w-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center text-3xl mb-4">📧</div>
                  <h2 className="text-2xl font-bold text-slate-800 mb-2">Please Verify Your Email</h2>
                  <p className="text-slate-600 mb-6">
                      Access to the translation platform is restricted to verified accounts. 
                      Please check your inbox for the verification link.
                  </p>
                  <div className="space-y-3">
                      <Button 
                          onClick={async () => {
                              const res = await StorageService.resendVerificationEmail();
                              if(res.success) toast.success("Email sent!");
                              else toast.error(res.message || "Error sending email");
                          }} 
                          fullWidth 
                      >
                          Resend Verification Email
                      </Button>
                      <Button onClick={handleLogout} variant="ghost" fullWidth>Sign Out</Button>
                  </div>
              </Card>
          </div>
      );
  }

  const canAccessAdmin = hasPermission(user, 'user.read') || user.role === 'admin';
  const canAccessReview = hasPermission(user, 'translation.review');

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-brand-200 selection:text-brand-900">
      <ToastContainer /> 
      {showDemoBanner && (
          <div className="bg-brand-600 text-white px-4 py-2 text-center text-sm font-medium flex justify-between items-center shadow-sm">
              <span>⚠ <strong>Cloud Demo:</strong> Connected to Firebase Firestore.</span>
              <button onClick={() => setShowDemoBanner(false)} className="text-brand-200 hover:text-white">&times;</button>
          </div>
      )}
      <Header user={user} onNavigate={handleNavigate} onSwitchRole={handleLogout} pendingReviewCount={pendingReviewCount} />
      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 animate-fade-in">
        <div className="space-y-8">
            {currentPage === 'dashboard' && <Dashboard sentences={sentences} totalCount={totalSentenceCount} translations={translations} language={targetLanguage} users={allUsers} onNavigate={handleNavigate} />}
            {currentPage === 'community' && <CommunityHub user={user} announcements={announcements} forumTopics={forumTopics} onAddAnnouncement={handleAddAnnouncement} onAddTopic={handleAddTopic} onReplyToTopic={handleReplyToTopic} />}
            {currentPage === 'translate' && <Translator sentences={sentences} translations={translations} user={user} users={allUsers} targetLanguage={targetLanguage} onSaveTranslation={handleSaveTranslation} onVote={handleVote} words={words} wordTranslations={wordTranslations} onSaveWordTranslation={handleSaveWordTranslationLegacy} onAddComment={handleAddComment} onFlag={handleFlag} />}
            {currentPage === 'dictionary' && <Dictionary words={words} wordTranslations={wordTranslations} translations={translations} user={user} onDeleteWord={handleDeleteWord} onAddWord={handleAddWord} onSuggestCorrection={handleSuggestWordCorrection} />}
            {currentPage === 'corpus' && <Corpus sentences={sentences} translations={translations} users={allUsers} targetLanguage={targetLanguage} user={user} onVote={handleVote} onAddComment={handleAddComment} onFlag={handleFlag} />}
            {currentPage === 'leaderboard' && <Leaderboard translations={translations} users={allUsers} targetLanguage={targetLanguage} />}
            {currentPage === 'review' && (canAccessReview ? <Reviewer sentences={sentences} translations={translations} user={user} targetLanguage={targetLanguage} onReviewAction={handleReviewAction} onUpdateTranslation={handleSaveTranslation} /> : <div className="p-8 text-center"><h3 className="text-xl font-bold text-slate-800">Access Denied</h3><p className="text-slate-500">You do not have permission to access this area.</p></div>)}
            {currentPage === 'admin' && (canAccessAdmin ? <AdminPanel onImportSentences={handleImportSentences} /> : <div className="p-8 text-center"><h3 className="text-xl font-bold text-slate-800">Access Denied</h3><p className="text-slate-500">Restricted to Administrators.</p></div>)}
        </div>
      </main>

      {isReportModalOpen && (
          <ReportModal 
              isOpen={isReportModalOpen} 
              onClose={() => setIsReportModalOpen(false)} 
              onSubmit={submitReport} 
          />
      )}
    </div>
  );
};

export default App;
import React, { useState, useMemo } from 'react';
import { Sentence, Translation, User, Language } from '../types';
import { Card, Input, Badge, Button } from './UI';
import { SpellingCorrectionModal } from './SpellingCorrectionModal';

interface CorpusProps {
  sentences: Sentence[];
  translations: Translation[];
  users: User[];
  targetLanguage: Language;
  user: User;
  onVote: (id: string, type: 'up' | 'down') => void;
  onAddComment: (id: string, text: string) => void;
  onFlag: (type: 'sentence' | 'translation', id: string | number) => void;
}

export const Corpus: React.FC<CorpusProps> = ({ sentences, translations, users, targetLanguage, user, onVote, onAddComment, onFlag }) => {
  const [view, setView] = useState<'translations' | 'sentences'>('translations'); 
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const itemsPerPage = 20;
  
  // Spelling Modal State
  const [isSpellingModalOpen, setIsSpellingModalOpen] = useState(false);
  const [selectedTranslationForEdit, setSelectedTranslationForEdit] = useState<Translation | null>(null);

  const sentenceMap = useMemo(() => {
    const map = new Map<number, string>();
    sentences.forEach(s => map.set(s.id, s.english));
    return map;
  }, [sentences]);

  // Filter Logic
  const displayedData = useMemo(() => {
    const lowerSearch = search.toLowerCase();

    if (view === 'translations') {
        const langTrans = translations.filter(t => t.languageCode === targetLanguage.code);
        if (!search) return langTrans.sort((a, b) => b.timestamp - a.timestamp);
        
        return langTrans.filter(t => {
            const eng = sentenceMap.get(t.sentenceId)?.toLowerCase() || '';
            const trans = t.text.toLowerCase();
            const author = users.find(u => u.id === t.translatorId)?.name.toLowerCase() || '';
            return eng.includes(lowerSearch) || trans.includes(lowerSearch) || author.includes(lowerSearch);
        });
    } else {
        // View Sentences
        if (!search) return sentences;
        return sentences.filter(s => s.english.toLowerCase().includes(lowerSearch));
    }
  }, [view, sentences, translations, targetLanguage, search, sentenceMap, users]);

  const totalPages = Math.ceil(displayedData.length / itemsPerPage);
  const pageItems = displayedData.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  const getUserName = (id: string) => users.find(u => u.id === id)?.name || 'Unknown';

  const handleCommentSubmit = (id: string) => {
      if (commentText.trim()) {
          onAddComment(id, commentText);
          setCommentText('');
      }
  };

  const openSpellingModal = (t: Translation) => {
      setSelectedTranslationForEdit(t);
      setIsSpellingModalOpen(true);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
            <h1 className="text-2xl font-bold text-gray-900">Browse Data</h1>
            <div className="text-sm text-gray-500">
            Showing {displayedData.length} {view}
            </div>
        </div>
        {/* VIEW TOGGLE */}
        <div className="flex bg-slate-100 p-1 rounded-xl">
            <button 
                onClick={() => { setView('translations'); setPage(1); }}
                className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${view === 'translations' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
                Translations
            </button>
            <button 
                onClick={() => { setView('sentences'); setPage(1); }}
                className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${view === 'sentences' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
                Source Sentences
            </button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 sticky top-16 z-40">
        <Input 
          label={`Search ${view}...`} 
          placeholder={view === 'translations' ? "Search translations, authors..." : "Search english text..."} 
          value={search} 
          onChange={e => { setSearch(e.target.value); setPage(1); }} 
        />
      </div>

      {pageItems.length > 0 ? (
        <div className="space-y-4">
            {view === 'sentences' ? (
                // SENTENCE LIST VIEW
                <div className="grid gap-3">
                    {pageItems.map((item: any) => (
                        <Card key={item.id} className="flex justify-between items-center hover:bg-slate-50 transition-colors">
                            <div>
                                <span className="text-xs font-mono text-slate-400 mr-3">#{item.id}</span>
                                <span className="text-slate-800 font-medium">{item.english}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button size="sm" variant="ghost" className="text-slate-400 hover:text-red-500" onClick={() => onFlag('sentence', item.id)}>🚩</Button>
                                <Badge color="gray">Source</Badge>
                            </div>
                        </Card>
                    ))}
                </div>
            ) : (
                // TRANSLATION LIST VIEW
                <div className="space-y-4">
                    {pageItems.map((t: any) => {
                        const voteStatus = t.voteHistory?.[user.id];
                        return (
                        <Card key={t.id} className="flex flex-col gap-3">
                            <div className="flex justify-between items-start">
                                <div>
                                    <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">English Source</div>
                                    <p className="text-gray-900 font-medium">{sentenceMap.get(t.sentenceId) || <span className="italic text-slate-400">Loading sentence #{t.sentenceId}...</span>}</p>
                                </div>
                                <button onClick={() => onFlag('translation', t.id)} className="text-slate-300 hover:text-red-500 transition-colors" title="Flag Issue">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-8a2 2 0 012-2h14a2 2 0 012 2v8l-6-6-6 6-6-6" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21V4a2 2 0 012-2h14a2 2 0 012 2v11l-6-6-6 6-6 6" /></svg>
                                </button>
                            </div>
                            <div className="border-l-2 border-brand-500 pl-3 bg-brand-50/30 p-2 rounded-r-lg">
                                <div className="text-xs font-bold text-brand-600 uppercase tracking-wider mb-1">{targetLanguage.name}</div>
                                <p className="text-lg text-brand-900 font-bold">{t.text}</p>
                            </div>
                            <div className="flex justify-between items-center text-sm text-gray-500 border-t border-gray-100 pt-3 mt-1">
                                <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">
                                        {getUserName(t.translatorId).substring(0,1)}
                                    </div>
                                    <span>{getUserName(t.translatorId)}</span>
                                </div>
                                <Badge color={t.status === 'approved' ? 'green' : t.status === 'rejected' ? 'red' : 'yellow'}>{t.status}</Badge>
                            </div>
                            
                            <div className="flex justify-between items-center pt-2">
                                <div className="flex items-center space-x-3 bg-gray-50 rounded-full px-3 py-1 border border-slate-200">
                                        <button onClick={() => onVote(t.id, 'up')} className={`text-lg ${voteStatus === 'up' ? 'text-green-600' : 'text-gray-400 hover:text-green-500'}`}>▲</button>
                                        <span className="font-bold text-slate-700 min-w-[20px] text-center">{t.votes}</span>
                                        <button onClick={() => onVote(t.id, 'down')} className={`text-lg ${voteStatus === 'down' ? 'text-red-600' : 'text-gray-400 hover:text-red-500'}`}>▼</button>
                                </div>
                                <div className="flex gap-2">
                                    {/* Suggest Correction Button */}
                                    <Button variant="ghost" size="sm" className="text-purple-600 hover:bg-purple-50" onClick={() => openSpellingModal(t)}>
                                        ✏️ Suggest Fix
                                    </Button>
                                    <Button variant="ghost" size="sm" onClick={() => setExpandedRow(expandedRow === t.id ? null : t.id)}>
                                        {expandedRow === t.id ? 'Close' : `Discussion (${t.comments?.length || 0})`}
                                    </Button>
                                </div>
                            </div>

                            {expandedRow === t.id && (
                                <div className="bg-slate-50 p-4 rounded-xl mt-2 border border-slate-200">
                                    <h4 className="text-xs font-bold text-slate-400 uppercase mb-3">Comments</h4>
                                    <div className="space-y-3 mb-4 max-h-60 overflow-y-auto custom-scrollbar">
                                            {t.comments && t.comments.length > 0 ? t.comments.map((c: any) => (
                                                <div key={c.id} className="bg-white p-3 rounded-lg text-sm border border-slate-200 shadow-sm">
                                                    <div className="flex justify-between mb-1">
                                                        <span className="font-bold text-slate-800">{c.userName}</span>
                                                        <span className="text-xs text-slate-400">{new Date(c.timestamp).toLocaleDateString()}</span>
                                                    </div>
                                                    <div className="text-slate-600">{c.text}</div>
                                                </div>
                                            )) : <div className="text-center text-slate-400 text-sm italic py-2">No comments yet. Start the discussion!</div>}
                                    </div>
                                    <div className="flex gap-2">
                                            <Input label="" placeholder="Type a comment..." className="flex-1" value={commentText} onChange={e => setCommentText(e.target.value)} />
                                            <Button onClick={() => handleCommentSubmit(t.id)} disabled={!commentText.trim()}>Post</Button>
                                    </div>
                                </div>
                            )}
                        </Card>
                        );
                    })}
                </div>
            )}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400 bg-white rounded-3xl border border-dashed border-slate-200">
            <div className="text-4xl mb-4">🔍</div>
            <p className="text-lg font-medium text-slate-600">No results found</p>
            <p className="text-sm">Try adjusting your search or filters.</p>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center pt-6 border-t border-slate-200">
          <Button variant="secondary" disabled={page === 1} onClick={() => setPage(p => Math.max(1, p - 1))}>Previous</Button>
          <span className="text-sm font-medium text-slate-600 bg-white px-4 py-2 rounded-lg border border-slate-200">Page {page} of {totalPages}</span>
          <Button variant="secondary" disabled={page === totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>Next</Button>
        </div>
      )}

      {isSpellingModalOpen && selectedTranslationForEdit && (
          <SpellingCorrectionModal 
            isOpen={isSpellingModalOpen} 
            onClose={() => setIsSpellingModalOpen(false)} 
            translation={selectedTranslationForEdit}
            user={user}
          />
      )}
    </div>
  );
};
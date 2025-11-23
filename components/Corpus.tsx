import React, { useState, useMemo } from 'react';
import { Sentence, Translation, User, Language } from '../types';
import { Card, Input, Badge, Button } from './UI';

interface CorpusProps {
  sentences: Sentence[];
  translations: Translation[];
  users: User[];
  targetLanguage: Language;
  user: User;
  onVote: (id: string, type: 'up' | 'down') => void;
  onAddComment: (id: string, text: string) => void;
}

export const Corpus: React.FC<CorpusProps> = ({ sentences, translations, users, targetLanguage, user, onVote, onAddComment }) => {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const itemsPerPage = 20;

  const sentenceMap = useMemo(() => {
    const map = new Map<number, string>();
    sentences.forEach(s => map.set(s.id, s.english));
    return map;
  }, [sentences]);

  const filtered = useMemo(() => {
    const langTrans = translations.filter(t => t.languageCode === targetLanguage.code);
    
    if (!search) return langTrans.sort((a, b) => b.timestamp - a.timestamp);

    const lowerSearch = search.toLowerCase();
    return langTrans.filter(t => {
      const eng = sentenceMap.get(t.sentenceId)?.toLowerCase() || '';
      const trans = t.text.toLowerCase();
      const author = users.find(u => u.id === t.translatorId)?.name.toLowerCase() || '';
      return eng.includes(lowerSearch) || trans.includes(lowerSearch) || author.includes(lowerSearch);
    }).sort((a, b) => b.timestamp - a.timestamp);
  }, [translations, targetLanguage, search, sentenceMap, users]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const displayed = filtered.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  const getUserName = (id: string) => users.find(u => u.id === id)?.name || 'Unknown';

  const handleCommentSubmit = (id: string) => {
      if (commentText.trim()) {
          onAddComment(id, commentText);
          setCommentText('');
      }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <h1 className="text-2xl font-bold text-gray-900">Translation Corpus</h1>
        <div className="text-sm text-gray-500">
          Showing {filtered.length} translations
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 sticky top-16 z-40">
        <Input 
          label="Search Translations" 
          placeholder="Search English, Translated text, or Author..." 
          value={search} 
          onChange={e => { setSearch(e.target.value); setPage(1); }} 
        />
      </div>

      {displayed.length > 0 ? (
        <>
          {/* DESKTOP VIEW (Table) */}
          <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">English Source</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{targetLanguage.name} Translation</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Author</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Vote</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {displayed.map(t => {
                  const voteStatus = t.voteHistory?.[user.id];
                  return (
                    <React.Fragment key={t.id}>
                        <tr className="hover:bg-gray-50">
                            <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate" title={sentenceMap.get(t.sentenceId)}>
                            {sentenceMap.get(t.sentenceId) || <span className="text-red-400 italic">Sentence deleted</span>}
                            </td>
                            <td className="px-6 py-4 text-sm text-brand-700 font-medium">
                            {t.text}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                            <Badge color={t.status === 'approved' ? 'green' : t.status === 'rejected' ? 'red' : 'yellow'}>
                                {t.status}
                            </Badge>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500">
                            {getUserName(t.translatorId)}
                            <div className="text-gray-400">{new Date(t.timestamp).toLocaleDateString()}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                                <div className="flex items-center justify-center space-x-2 bg-gray-50 rounded-full px-2 py-1 border border-gray-200">
                                    <button 
                                        onClick={() => onVote(t.id, 'up')}
                                        className={`hover:text-green-600 transition-colors ${voteStatus === 'up' ? 'text-green-600 font-bold' : 'text-gray-400'}`}
                                    >▲</button>
                                    <span className={`text-sm font-bold w-4 text-center ${t.votes > 0 ? 'text-green-600' : t.votes < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                                        {t.votes}
                                    </span>
                                    <button 
                                        onClick={() => onVote(t.id, 'down')}
                                        className={`hover:text-red-600 transition-colors ${voteStatus === 'down' ? 'text-red-600 font-bold' : 'text-gray-400'}`}
                                    >▼</button>
                                </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                                <button 
                                    className="text-brand-600 hover:text-brand-800 font-medium"
                                    onClick={() => setExpandedRow(expandedRow === t.id ? null : t.id)}
                                >
                                    {expandedRow === t.id ? 'Hide Notes' : `Notes (${t.comments?.length || 0})`}
                                </button>
                            </td>
                        </tr>
                        {expandedRow === t.id && (
                            <tr className="bg-gray-50">
                                <td colSpan={6} className="px-6 py-4">
                                    <div className="text-sm text-gray-700 mb-2 font-bold">Community Notes & Discussion:</div>
                                    <div className="space-y-2 mb-3 max-h-40 overflow-y-auto">
                                        {t.comments && t.comments.length > 0 ? (
                                            t.comments.map(c => (
                                                <div key={c.id} className="bg-white p-2 rounded border text-sm">
                                                    <span className="font-bold text-gray-800 mr-2">{c.userName}</span>
                                                    <span className="text-gray-600">{c.text}</span>
                                                    <span className="text-xs text-gray-400 float-right">{new Date(c.timestamp).toLocaleDateString()}</span>
                                                </div>
                                            ))
                                        ) : (
                                            <p className="text-gray-500 italic text-xs">No notes yet.</p>
                                        )}
                                    </div>
                                    <div className="flex gap-2">
                                        <Input 
                                            label="" 
                                            placeholder="Add a note or question..." 
                                            className="flex-1" 
                                            value={commentText}
                                            onChange={e => setCommentText(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleCommentSubmit(t.id)}
                                        />
                                        <Button onClick={() => handleCommentSubmit(t.id)} disabled={!commentText.trim()}>Post</Button>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* MOBILE VIEW (Cards) */}
          <div className="md:hidden space-y-4">
            {displayed.map(t => {
                const voteStatus = t.voteHistory?.[user.id];
                return (
                  <Card key={t.id} className="flex flex-col gap-3">
                      <div>
                          <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">English</div>
                          <p className="text-gray-900 font-medium">{sentenceMap.get(t.sentenceId) || "Deleted Sentence"}</p>
                      </div>
                      <div className="border-l-2 border-brand-500 pl-3">
                          <div className="text-xs font-bold text-brand-600 uppercase tracking-wider mb-1">{targetLanguage.name}</div>
                          <p className="text-lg text-brand-900">{t.text}</p>
                      </div>
                      <div className="flex justify-between items-center text-sm text-gray-500 border-t border-gray-100 pt-3 mt-1">
                          <span>{getUserName(t.translatorId)}</span>
                          <Badge color={t.status === 'approved' ? 'green' : t.status === 'rejected' ? 'red' : 'yellow'}>{t.status}</Badge>
                      </div>
                      
                      <div className="flex justify-between items-center pt-2">
                           <div className="flex items-center space-x-3 bg-gray-50 rounded-full px-3 py-1">
                                <button onClick={() => onVote(t.id, 'up')} className={`text-xl ${voteStatus === 'up' ? 'text-green-600' : 'text-gray-400'}`}>▲</button>
                                <span className="font-bold text-gray-700">{t.votes}</span>
                                <button onClick={() => onVote(t.id, 'down')} className={`text-xl ${voteStatus === 'down' ? 'text-red-600' : 'text-gray-400'}`}>▼</button>
                           </div>
                           <Button variant="ghost" size="sm" onClick={() => setExpandedRow(expandedRow === t.id ? null : t.id)}>
                               {expandedRow === t.id ? 'Close Notes' : `Notes (${t.comments?.length || 0})`}
                           </Button>
                      </div>

                      {expandedRow === t.id && (
                          <div className="bg-gray-50 p-3 rounded-lg mt-2">
                               <div className="space-y-2 mb-3 max-h-40 overflow-y-auto">
                                    {t.comments?.map(c => (
                                        <div key={c.id} className="bg-white p-2 rounded text-sm border border-gray-200">
                                            <span className="font-bold">{c.userName}: </span>{c.text}
                                        </div>
                                    ))}
                               </div>
                               <div className="flex gap-2">
                                    <Input label="" placeholder="Type note..." className="flex-1" value={commentText} onChange={e => setCommentText(e.target.value)} />
                                    <Button onClick={() => handleCommentSubmit(t.id)} disabled={!commentText.trim()}>Post</Button>
                               </div>
                          </div>
                      )}
                  </Card>
                );
            })}
          </div>
        </>
      ) : (
        <div className="text-center py-10 text-gray-500 italic">
          No translations found matching your search.
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center pt-4 border-t border-gray-200">
          <Button variant="ghost" disabled={page === 1} onClick={() => setPage(p => Math.max(1, p - 1))}>Previous</Button>
          <span className="text-sm text-gray-600">Page {page} of {totalPages}</span>
          <Button variant="ghost" disabled={page === totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>Next</Button>
        </div>
      )}
    </div>
  );
};
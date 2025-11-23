import React, { useState, useEffect } from 'react';
import { Sentence, Translation, User, Language, Word, WordTranslation } from '../types';
import { Button, Card, Badge } from './UI';
import { getTranslationSuggestion } from '../services/geminiService';
import { WordDefinitionModal } from './WordDefinitionModal';
import { SentenceNavigator } from './SentenceNavigator';
import { TranslationHistoryModal } from './TranslationHistoryModal';

interface TranslatorProps {
  sentences: Sentence[];
  translations: Translation[];
  user: User;
  users?: User[];
  targetLanguage: Language;
  onSaveTranslation: (t: Translation) => void;
  words: Word[];
  wordTranslations: WordTranslation[];
  onSaveWordTranslation: (wt: string, nt: string, t: string, n: string, id: number) => void;
  onAddComment: (id: string, txt: string) => void;
  onVote: (id: string, type: 'up' | 'down') => void;
}

export const Translator: React.FC<TranslatorProps> = ({ sentences, translations, user, users = [], targetLanguage, onSaveTranslation, words, wordTranslations, onSaveWordTranslation, onAddComment, onVote }) => {
  const [index, setIndex] = useState(0);
  const [text, setText] = useState('');
  const [selectedWord, setSelectedWord] = useState<{t: string, n: string} | null>(null);
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [historyModalTranslation, setHistoryModalTranslation] = useState<Translation | null>(null);

  const sentence = sentences[index];
  const sentenceTranslations = translations.filter(t => t.sentenceId === sentence?.id && t.languageCode === targetLanguage.code);
  const myTranslation = sentenceTranslations.find(t => t.translatorId === user.id);
  const communityTranslations = sentenceTranslations.filter(t => t.translatorId !== user.id).sort((a, b) => b.votes - a.votes);

  useEffect(() => { setText(myTranslation?.text || ''); }, [myTranslation, sentence]);

  const handleSave = () => {
      if (!sentence) return;
      onSaveTranslation({
          id: myTranslation?.id || crypto.randomUUID(),
          sentenceId: sentence.id,
          text,
          languageCode: targetLanguage.code,
          translatorId: user.id,
          timestamp: Date.now(),
          votes: myTranslation?.votes || 0,
          voteHistory: myTranslation?.voteHistory || {},
          status: myTranslation?.status || 'pending',
          history: myTranslation?.history || []
      });
      if (index < sentences.length - 1) setIndex(index + 1);
  };
  
  const handleAi = async () => {
      if (sentence) setText(await getTranslationSuggestion(sentence.english, targetLanguage));
  };

  const handleNext = () => { if (index < sentences.length - 1) setIndex(index + 1); };
  const handlePrev = () => { if (index > 0) setIndex(index - 1); };
  const getUserName = (id: string) => users.find(u => u.id === id)?.name || 'Unknown';
  const getExistingTranslations = (normalized: string) => {
      const word = words.find(w => w.normalizedText === normalized);
      if (!word) return [];
      return wordTranslations.filter(wt => wt.wordId === word.id && wt.languageCode === targetLanguage.code);
  };

  if (!sentence) return <div>No sentences loaded.</div>;

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-24 sm:pb-10">
       {/* Navigation Header */}
       <div className="flex justify-between items-center sticky top-16 z-20 bg-gray-50 py-2 -mx-4 px-4 sm:static sm:bg-transparent sm:p-0 sm:mx-0">
          <div className="flex gap-2 items-center">
              <Button variant="secondary" size="sm" onClick={handlePrev} disabled={index === 0}>←</Button>
              <span className="text-gray-500 font-medium text-sm">{index + 1} / {sentences.length}</span>
              <Button variant="secondary" size="sm" onClick={handleNext} disabled={index === sentences.length - 1}>→</Button>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setIsNavOpen(true)}>Browse All</Button>
       </div>

       {/* Sentence Display */}
       <Card className="border-t-4 border-t-brand-500">
          <div className="text-gray-400 text-xs uppercase font-bold tracking-wider mb-2">Translate to {targetLanguage.name}</div>
          <div className="text-xl sm:text-2xl font-medium leading-relaxed text-gray-900">
             {sentence.english.split(' ').map((w, i) => (
                <span key={i} onClick={() => setSelectedWord({t: w, n: w.toLowerCase().replace(/[^a-z]/g, '')})} className="cursor-pointer hover:text-brand-600 hover:bg-brand-50 rounded px-0.5 transition-colors active:bg-brand-100">
                   {w}{' '}
                </span>
             ))}
          </div>
       </Card>

       {/* My Translation Input */}
       <div className="space-y-3 pt-2">
         <h3 className="font-bold text-gray-700 text-sm uppercase tracking-wide">Your Translation</h3>
         <Card className={`border-2 transition-shadow ${text ? 'border-brand-200 shadow-md' : 'border-gray-200'}`}>
            <textarea 
              className="w-full border-0 focus:ring-0 p-0 resize-none text-lg sm:text-xl mb-4 placeholder-gray-300 min-h-[100px]" 
              rows={3} 
              placeholder="Type Hula translation here..." 
              value={text} 
              onChange={e => setText(e.target.value)} 
            />
            <div className="flex flex-col sm:flex-row justify-between items-center gap-3 border-t border-gray-100 pt-4">
               <Button variant="ghost" onClick={handleAi} className="text-brand-600 text-xs w-full sm:w-auto">✨ AI Suggestion</Button>
               <div className="flex gap-2 items-center w-full sm:w-auto">
                 {myTranslation && <span className="text-xs text-gray-400 hidden sm:inline uppercase font-bold tracking-wider">{myTranslation.status}</span>}
                 <Button onClick={handleSave} fullWidth>
                    {myTranslation ? 'Update' : 'Submit'}
                 </Button>
               </div>
            </div>
         </Card>
       </div>

       {/* Community Translations */}
       <div className="space-y-4">
         {communityTranslations.length > 0 && <h3 className="font-bold text-gray-700 text-sm uppercase tracking-wide mt-6">Community Contributions</h3>}
         {communityTranslations.map(t => {
            const voteStatus = t.voteHistory?.[user.id];
            return (
              <Card key={t.id} className="bg-gray-50 border-gray-200">
                 <div className="flex justify-between items-start gap-4">
                    <div className="flex-1">
                       <div className="text-lg text-gray-900 mb-1">{t.text}</div>
                       <div className="text-xs text-gray-500 flex flex-wrap items-center gap-2">
                          <span className="font-medium">{getUserName(t.translatorId)}</span>
                          <span>•</span>
                          <span>{new Date(t.timestamp).toLocaleDateString()}</span>
                          {t.status === 'approved' && <Badge color="green">Approved</Badge>}
                       </div>
                    </div>
                    <div className="flex flex-col items-center bg-white rounded border p-1 shadow-sm">
                       <button onClick={() => onVote(t.id, 'up')} className={`p-1 ${voteStatus === 'up' ? 'text-green-600' : 'text-gray-400'}`}>▲</button>
                       <span className={`text-sm font-bold ${t.votes > 0 ? 'text-green-600' : 'text-gray-600'}`}>{t.votes}</span>
                       <button onClick={() => onVote(t.id, 'down')} className={`p-1 ${voteStatus === 'down' ? 'text-red-600' : 'text-gray-400'}`}>▼</button>
                    </div>
                 </div>
                 <div className="mt-3 pt-2 border-t border-gray-200">
                     <div className="flex gap-2">
                         <input type="text" placeholder="Reply..." className="flex-1 text-sm border rounded px-3 py-2" onKeyDown={(e) => { if (e.key === 'Enter') { onAddComment(t.id, e.currentTarget.value); e.currentTarget.value = ''; }}} />
                         <button className="text-xs text-brand-600" onClick={() => setHistoryModalTranslation(t)}>History</button>
                     </div>
                 </div>
              </Card>
            );
         })}
       </div>

       {/* Sticky Mobile Action Footer for quick navigation */}
       <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200 flex justify-between gap-3 sm:hidden z-40 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
            <Button variant="secondary" fullWidth onClick={handlePrev} disabled={index === 0}>Previous</Button>
            <Button variant="primary" fullWidth onClick={handleNext} disabled={index === sentences.length - 1}>Next / Skip</Button>
       </div>

       {selectedWord && <WordDefinitionModal isOpen={!!selectedWord} onClose={() => setSelectedWord(null)} selectedWord={selectedWord.t} normalizedWord={selectedWord.n} existingTranslations={getExistingTranslations(selectedWord.n)} targetLanguage={targetLanguage} onSave={(t, n) => { onSaveWordTranslation(selectedWord.t, selectedWord.n, t, n, sentence.id); setSelectedWord(null); }} />}
       <SentenceNavigator isOpen={isNavOpen} onClose={() => setIsNavOpen(false)} sentences={sentences} translations={translations} targetLanguage={targetLanguage} onSelectSentence={setIndex} />
       <TranslationHistoryModal isOpen={!!historyModalTranslation} onClose={() => setHistoryModalTranslation(null)} translation={historyModalTranslation} />
    </div>
  );
};
import React, { useState } from 'react';
import { Word, WordTranslation, User, WordCategory, WordCorrection, Translation } from '../types';
import { Card, Input, Button, Modal, Badge } from './UI'; // Removed unused 'toast'
import { StorageService } from '../services/storageService';
import WordDetail from './WordDetail';

const WORD_CATEGORIES: WordCategory[] = [
  'family', 'people', 'food', 'ocean', 'nature', 'body', 'animals',
  'village', 'culture', 'emotion', 'numbers', 'colors', 'tools',
  'places', 'time', 'other'
];

interface DictionaryProps {
  words: Word[];
  wordTranslations: WordTranslation[]; 
  translations: Translation[]; 
  user: User | null;
  onDeleteWord: (id: string) => void;
  onAddWord: (word: Partial<Word>) => void;
  onSuggestCorrection: (wordId: string, suggestion: { type: 'meaning' | 'spelling' | 'category' | 'note'; newValue: any; comment?: string }) => void;
}

export const Dictionary: React.FC<DictionaryProps> = ({ 
  words, translations, user, onDeleteWord, onAddWord, onSuggestCorrection 
}) => {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  
  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newWord, setNewWord] = useState<Partial<Word>>({ text: '', meanings: [], categories: [] });
  const [newWordMeanings, setNewWordMeanings] = useState(''); 

  const [selectedWord, setSelectedWord] = useState<Word | null>(null); 
  const [isCorrectionModalOpen, setIsCorrectionModalOpen] = useState(false); 
  const [correctionType, setCorrectionType] = useState<WordCorrection['suggestionType']>('meaning');
  const [correctionValue, setCorrectionValue] = useState('');

  const canManageDictionary = StorageService.hasPermission(user, 'dictionary.manage');

  // --- FILTERS ---
  const filteredWords = words.filter(w => {
    const matchesSearch = 
        w.text.toLowerCase().includes(search.toLowerCase()) || 
        w.normalizedText?.includes(search.toLowerCase()) ||
        w.meanings?.some(m => m.toLowerCase().includes(search.toLowerCase()));
    
    const matchesCategory = !categoryFilter || w.categories?.includes(categoryFilter as any);

    return matchesSearch && matchesCategory;
  }).sort((a, b) => a.text.localeCompare(b.text));

  // --- HANDLERS ---
  const handleAddSubmit = () => {
      if (!newWord.text) return;
      
      const meaningsArray = newWordMeanings.split(',').map(s => s.trim()).filter(Boolean);
      
      onAddWord({
          ...newWord,
          id: crypto.randomUUID(),
          normalizedText: newWord.text.toLowerCase().trim(),
          meanings: meaningsArray,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          createdBy: user?.id
      });
      setIsAddModalOpen(false);
      setNewWord({ text: '', meanings: [], categories: [] });
      setNewWordMeanings('');
      // toast.success is handled by parent prop onAddWord if async, 
      // but since prop is void, we rely on App.tsx to show toast.
  };

  const handleCorrectionSubmit = () => {
      if (!selectedWord || !user) return;
      
      onSuggestCorrection(selectedWord.id, {
          type: correctionType,
          newValue: correctionValue,
          comment: "Manual suggestion from dictionary list"
      });
      setIsCorrectionModalOpen(false);
      setCorrectionValue('');
  };

  const handleCorrectionFromDetail = (correction: { wordId: string, type: any, newValue: any, comment?: string }) => {
      if (!user) return;
      onSuggestCorrection(correction.wordId, {
          type: correction.type,
          newValue: correction.newValue,
          comment: correction.comment
      });
  };

  const handleDelete = (word: Word) => {
      if (confirm(`Are you sure you want to delete "${word.text}"?`)) {
          onDeleteWord(word.id);
          if (selectedWord?.id === word.id) setSelectedWord(null);
      }
  };

  const getFrequencyBadge = (freq?: number) => {
      if (!freq) return <Badge color="gray">Rare</Badge>;
      if (freq >= 100) return <Badge color="purple">Very Common</Badge>;
      if (freq >= 20) return <Badge color="green">Common</Badge>;
      if (freq >= 5) return <Badge color="blue">Uncommon</Badge>;
      return <Badge color="gray">Rare</Badge>;
  };

  // Get examples for selected word
  const getExamples = (word: Word): Translation[] => {
      if (!word || !translations.length) return [];
      const lowerWord = word.text.toLowerCase();
      return translations.filter(t => t.text.toLowerCase().includes(lowerWord)).slice(0, 5);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
       
       {/* HEADER & FILTERS */}
       <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
           <div>
               <h1 className="text-2xl font-bold text-slate-900">Dictionary</h1>
               <p className="text-slate-500">{words.length} words indexed</p>
           </div>
           {canManageDictionary && (
               <Button onClick={() => setIsAddModalOpen(true)}>+ Add New Word</Button>
           )}
       </div>

       <Card>
           <div className="flex flex-col md:flex-row gap-4">
               <Input 
                   className="flex-1" 
                   placeholder="Search words, meanings..." 
                   value={search} 
                   onChange={e => setSearch(e.target.value)} 
               />
               <div className="w-full md:w-64">
                   <select 
                       className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-slate-700 focus:border-brand-400 focus:ring-4 focus:ring-brand-500/10 outline-none transition-all"
                       value={categoryFilter}
                       onChange={e => setCategoryFilter(e.target.value)}
                   >
                       <option value="">All Categories</option>
                       {WORD_CATEGORIES.map(c => (
                           <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                       ))}
                   </select>
               </div>
           </div>
       </Card>

       {/* MAIN CONTENT */}
       <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
           
           {/* WORD LIST */}
           <div className={`lg:col-span-${selectedWord ? '2' : '3'} space-y-4`}>
               {filteredWords.length === 0 && (
                   <div className="text-center py-12 text-slate-400 bg-white rounded-3xl border border-dashed border-slate-200">
                       No words found.
                   </div>
               )}
               
               {filteredWords.map(w => (
                   <Card 
                        key={w.id} 
                        className={`transition-all hover:border-brand-200 ${selectedWord?.id === w.id ? 'ring-2 ring-brand-400 border-brand-400' : ''}`}
                        onClick={() => setSelectedWord(w)}
                        noPadding
                   >
                       <div className="p-5 flex justify-between items-center">
                           <div>
                               <div className="flex items-center gap-3 mb-1">
                                   <h3 className="text-xl font-bold text-slate-900">{w.text}</h3>
                                   {getFrequencyBadge(w.frequency)}
                               </div>
                               <div className="text-sm text-slate-600 line-clamp-1">
                                   {w.meanings?.join(', ') || <span className="italic text-slate-400">No definitions yet</span>}
                               </div>
                           </div>
                           
                           <div className="flex items-center gap-2">
                               <div className="hidden sm:flex gap-1">
                                   {w.categories?.slice(0, 2).map(c => (
                                       <span key={c} className="text-[10px] px-2 py-1 bg-slate-100 text-slate-500 rounded-full uppercase font-bold tracking-wider">{c.toString()}</span>
                                   ))}
                                   {(w.categories?.length || 0) > 2 && <span className="text-xs text-slate-400 self-center">+{w.categories!.length - 2}</span>}
                               </div>
                               {canManageDictionary && (
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); handleDelete(w); }}
                                        className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-colors ml-2"
                                    >
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                    </button>
                               )}
                           </div>
                       </div>
                   </Card>
               ))}
           </div>

           {/* DETAIL PANEL */}
           {selectedWord && (
               <div className="lg:col-span-1">
                   <WordDetail 
                      word={selectedWord}
                      exampleTranslations={getExamples(selectedWord)} 
                      onClose={() => setSelectedWord(null)}
                      onSuggestCorrection={handleCorrectionFromDetail}
                   />
               </div>
           )}
       </div>

       {/* ADD WORD MODAL */}
       <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Add New Word">
           <div className="space-y-4">
               <Input 
                   label="Word Text" 
                   value={newWord.text} 
                   onChange={e => setNewWord({...newWord, text: e.target.value})} 
                   placeholder="e.g. Hello"
               />
               
               <div>
                   <label className="block text-sm font-bold text-slate-700 mb-2">Meanings (comma separated)</label>
                   <textarea 
                       className="w-full border-2 border-slate-100 rounded-xl p-3 focus:border-brand-400 focus:ring-4 focus:ring-brand-500/10 outline-none"
                       rows={3}
                       value={newWordMeanings}
                       onChange={e => setNewWordMeanings(e.target.value)}
                       placeholder="e.g. greeting, salutation"
                   />
               </div>

               <div>
                   <label className="block text-sm font-bold text-slate-700 mb-2">Categories</label>
                   <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 border-2 border-slate-100 rounded-xl">
                       {WORD_CATEGORIES.map(cat => (
                           <label key={cat} className="flex items-center space-x-2 bg-slate-50 px-3 py-1.5 rounded-lg cursor-pointer hover:bg-slate-100 border border-slate-200">
                               <input 
                                   type="checkbox"
                                   checked={newWord.categories?.includes(cat)}
                                   onChange={(e) => {
                                       const current = newWord.categories || [];
                                       const next = e.target.checked 
                                           ? [...current, cat]
                                           : current.filter(c => c !== cat);
                                       setNewWord({...newWord, categories: next});
                                   }}
                                   className="rounded text-brand-600 focus:ring-brand-500"
                               />
                               <span className="text-sm text-slate-700 capitalize">{cat}</span>
                           </label>
                       ))}
                   </div>
               </div>

               <Input 
                   label="Notes (Optional)" 
                   value={newWord.notes || ''} 
                   onChange={e => setNewWord({...newWord, notes: e.target.value})} 
               />

               <Button fullWidth onClick={handleAddSubmit} disabled={!newWord.text}>Add Word</Button>
           </div>
       </Modal>

       {/* SUGGEST CORRECTION MODAL */}
       <Modal isOpen={isCorrectionModalOpen} onClose={() => setIsCorrectionModalOpen(false)} title="Suggest Correction">
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">What needs fixing?</label>
                    <select 
                        className="w-full p-3 bg-slate-50 border-2 border-slate-100 rounded-xl outline-none"
                        value={correctionType}
                        onChange={(e) => setCorrectionType(e.target.value as any)}
                    >
                        <option value="meaning">Meaning / Definition</option>
                        <option value="spelling">Spelling</option>
                        <option value="category">Category</option>
                        <option value="note">Note</option>
                    </select>
                </div>

                <Input 
                    label="Correct Value / Suggestion" 
                    value={correctionValue} 
                    onChange={e => setCorrectionValue(e.target.value)} 
                    placeholder="Enter the correct information..."
                />

                <Button fullWidth onClick={handleCorrectionSubmit} disabled={!correctionValue.trim()}>Submit Suggestion</Button>
            </div>
       </Modal>
    </div>
  );
};
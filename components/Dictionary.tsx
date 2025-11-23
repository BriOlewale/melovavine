import React, { useState } from 'react';
import { Word, WordTranslation, User } from '../types';
import { Card, Input } from './UI';
import { StorageService } from '../services/storageService';

export const Dictionary: React.FC<{ words: Word[], wordTranslations: WordTranslation[], user: User | null, onDeleteWord: (id: string) => void }> = ({ words, wordTranslations, user, onDeleteWord }) => {
  const [search, setSearch] = useState('');
  const filtered = words.filter(w => w.text.toLowerCase().includes(search.toLowerCase()));

  const canManageDictionary = StorageService.hasPermission(user, 'dictionary.manage');

  const handleDelete = (word: Word) => {
      if (confirm(`Are you sure you want to delete the word "${word.text}"? This cannot be undone.`)) {
          onDeleteWord(word.id);
      }
  };

  return (
    <div className="max-w-4xl mx-auto">
       <Input label="Search" value={search} onChange={e => setSearch(e.target.value)} className="mb-6" placeholder="Search words..." />
       <div className="grid gap-4">
          {filtered.length === 0 && (
              <div className="text-center text-gray-500 py-8">No words found matching "{search}".</div>
          )}
          {filtered.map(w => {
             const trans = wordTranslations.filter(wt => wt.wordId === w.id);
             return (
                 <Card key={w.id} className="relative group">
                    <div className="flex justify-between items-start">
                        <div>
                            <h3 className="font-bold text-lg text-slate-800">{w.text}</h3>
                            {trans.length > 0 ? (
                                <ul className="mt-2 space-y-1">
                                    {trans.map(t => (
                                        <li key={t.id} className="text-brand-600 font-medium">
                                            {t.translation} 
                                            {t.notes && <span className="text-gray-400 text-xs font-normal ml-2">- {t.notes}</span>}
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-xs text-gray-400 mt-1 italic">No translations yet.</p>
                            )}
                        </div>
                        {canManageDictionary && (
                            <button 
                                onClick={(e) => { e.stopPropagation(); handleDelete(w); }}
                                className="text-gray-300 hover:text-red-500 transition-colors p-2 rounded-full hover:bg-red-50"
                                title="Delete Word"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                            </button>
                        )}
                    </div>
                 </Card>
             );
          })}
       </div>
    </div>
  );
};
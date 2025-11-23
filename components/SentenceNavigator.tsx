import React, { useState } from 'react';
import { Modal, Input } from './UI';
import { Sentence, Translation, Language } from '../types';

export const SentenceNavigator: React.FC<{ isOpen: boolean, onClose: () => void, sentences: Sentence[], translations: Translation[], targetLanguage: Language, onSelectSentence: (i: number) => void }> = ({ isOpen, onClose, sentences, onSelectSentence }) => {
  const [q, setQ] = useState('');
  
  // Filter based on search query
  const filtered = sentences.filter(s => s.english.toLowerCase().includes(q.toLowerCase())).slice(0, 20);
  
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Navigate">
       <Input label="Search" value={q} onChange={e => setQ(e.target.value)} placeholder="Type a word to find sentences..." />
       <ul className="mt-4 max-h-60 overflow-y-auto divide-y divide-gray-100">
          {filtered.map((s) => (
              <li 
                key={s.id} 
                onClick={() => { 
                    // FIX: Find the ACTUAL index in the main sentences array
                    const originalIndex = sentences.findIndex(original => original.id === s.id);
                    if (originalIndex !== -1) {
                        onSelectSentence(originalIndex); 
                        onClose();
                    }
                }} 
                className="p-3 hover:bg-gray-50 cursor-pointer truncate text-sm text-gray-700 transition-colors"
              >
                 <span className="font-mono text-xs text-gray-400 mr-2">#{s.id}</span>
                 {s.english}
              </li>
          ))}
          {filtered.length === 0 && (
              <li className="p-4 text-center text-gray-500 italic text-sm">No sentences found.</li>
          )}
       </ul>
    </Modal>
  );
};
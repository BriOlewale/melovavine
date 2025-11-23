import React, { useState } from 'react';
import { Modal, Button, Input } from './UI';
import { WordTranslation, Language } from '../types';

export const WordDefinitionModal: React.FC<{ isOpen: boolean, onClose: () => void, selectedWord: string, normalizedWord: string, existingTranslations: WordTranslation[], targetLanguage: Language, onSave: (t: string, n: string) => void }> = ({ isOpen, onClose, selectedWord, existingTranslations, targetLanguage, onSave }) => {
  const [text, setText] = useState('');
  const [notes, setNotes] = useState('');
  
  const hasExisting = existingTranslations.length > 0;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Define: ${selectedWord}`}>
       {hasExisting ? (
           <div>
               <div className="p-4 bg-blue-50 text-blue-800 rounded-xl border border-blue-100 mb-4">
                   <div className="flex items-center gap-2 mb-2">
                       <span className="text-xl">✅</span>
                       <span className="font-bold">Already Translated</span>
                   </div>
                   <p className="text-sm">This word has already been added to the {targetLanguage.name} dictionary:</p>
               </div>
               <div className="space-y-3">
                   {existingTranslations.map(wt => (
                       <div key={wt.id} className="p-3 bg-white border border-gray-200 rounded-lg shadow-sm">
                           <div className="text-lg font-bold text-brand-700">{wt.translation}</div>
                           {wt.notes && <div className="text-sm text-gray-500 mt-1">{wt.notes}</div>}
                       </div>
                   ))}
               </div>
               <Button onClick={onClose} variant="secondary" className="mt-6 w-full">Close</Button>
           </div>
       ) : (
           <>
               <Input label="Translation" value={text} onChange={e => setText(e.target.value)} placeholder={`Enter ${targetLanguage.name} word`} />
               <Input label="Notes (Optional)" value={notes} onChange={e => setNotes(e.target.value)} className="mt-3" placeholder="Context, usage, etc." />
               <Button onClick={() => onSave(text, notes)} className="mt-6 w-full" disabled={!text.trim()}>Save Definition</Button>
           </>
       )}
    </Modal>
  );
};
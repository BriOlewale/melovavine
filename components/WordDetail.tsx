import React, { useState } from 'react';
import { Word, Translation } from '../types';
import { Card, Button, Badge, Modal, Input } from './UI';

interface WordDetailProps {
  word: Word;
  exampleTranslations: Translation[];
  onClose: () => void;
  onSuggestCorrection: (correction: {
    wordId: string;
    type: 'meaning' | 'spelling' | 'category' | 'note';
    newValue: any;
    comment?: string;
  }) => void;
}

const WordDetail: React.FC<WordDetailProps> = ({ word, exampleTranslations, onClose, onSuggestCorrection }) => {
  const [isCorrectionOpen, setIsCorrectionOpen] = useState(false);
  const [correctionType, setCorrectionType] = useState<'meaning' | 'spelling' | 'category' | 'note'>('meaning');
  const [correctionValue, setCorrectionValue] = useState('');
  const [correctionComment, setCorrectionComment] = useState('');

  const handleCorrectionSubmit = () => {
    if (!correctionValue.trim()) return;
    onSuggestCorrection({
      wordId: word.id,
      type: correctionType,
      newValue: correctionValue,
      comment: correctionComment
    });
    setIsCorrectionOpen(false);
    setCorrectionValue('');
    setCorrectionComment('');
  };

  const getFrequencyBadge = (freq?: number) => {
    if (!freq) return <Badge color="gray">Rare</Badge>;
    if (freq >= 100) return <Badge color="purple">Very Common</Badge>;
    if (freq >= 20) return <Badge color="green">Common</Badge>;
    if (freq >= 5) return <Badge color="blue">Uncommon</Badge>;
    return <Badge color="gray">Rare</Badge>;
  };

  return (
    <div className="sticky top-24 animate-slide-up">
      <Card className="border-l-4 border-l-brand-500 overflow-visible relative">
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-3xl font-bold text-slate-900 mb-2">{word.text}</h2>
            <div className="flex gap-2 items-center">
                {getFrequencyBadge(word.frequency)}
                {word.language && <span className="text-xs text-slate-400 uppercase font-bold tracking-wider">{word.language}</span>}
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
            aria-label="Close details"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="space-y-6">
            {/* Meanings */}
            <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Meanings</label>
                {word.meanings && word.meanings.length > 0 ? (
                    <ul className="list-disc list-inside text-slate-700 space-y-1">
                        {word.meanings.map((m, i) => <li key={i} className="font-medium">{m}</li>)}
                    </ul>
                ) : (
                    <p className="text-sm text-slate-400 italic">No definitions listed.</p>
                )}
            </div>

            {/* Categories */}
            <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Categories</label>
                <div className="flex flex-wrap gap-2">
                    {word.categories && word.categories.length > 0 ? (
                        word.categories.map((c: string) => <Badge key={c} color="blue">{c}</Badge>)
                    ) : (
                        <p className="text-sm text-slate-400 italic">Uncategorized</p>
                    )}
                </div>
            </div>

            {/* Notes */}
            {word.notes && (
                <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Notes</label>
                    <div className="text-sm text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
                        {word.notes}
                    </div>
                </div>
            )}

            {/* Examples */}
            {exampleTranslations.length > 0 && (
                <div className="pt-4 border-t border-slate-100">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 block">Examples in Context</label>
                    <div className="space-y-3">
                        {exampleTranslations.slice(0, 3).map(t => (
                            <div key={t.id} className="text-sm bg-brand-50/50 p-3 rounded-lg border border-brand-100/50">
                                <div className="font-medium text-brand-800 mb-1">"{t.text}"</div>
                                <div className="text-xs text-brand-400">Usage example</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Actions */}
            <div className="pt-6 border-t border-slate-100">
                <Button variant="secondary" fullWidth onClick={() => setIsCorrectionOpen(true)}>
                    Suggest Correction
                </Button>
            </div>
        </div>
      </Card>

      {/* Correction Modal */}
      <Modal isOpen={isCorrectionOpen} onClose={() => setIsCorrectionOpen(false)} title="Suggest Correction">
          <div className="space-y-4">
              <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Correction Type</label>
                  <select 
                      className="w-full p-3 bg-slate-50 border-2 border-slate-100 rounded-xl outline-none focus:border-brand-400 transition-colors"
                      value={correctionType}
                      onChange={(e) => setCorrectionType(e.target.value as any)}
                  >
                      <option value="meaning">Definition / Meaning</option>
                      <option value="spelling">Spelling</option>
                      <option value="category">Category</option>
                      <option value="note">Note / Usage</option>
                  </select>
              </div>

              <Input 
                  label="Correct Value" 
                  value={correctionValue} 
                  onChange={e => setCorrectionValue(e.target.value)} 
                  placeholder="Enter the correct information..."
              />
              
              <Input 
                  label="Comment (Optional)" 
                  value={correctionComment} 
                  onChange={e => setCorrectionComment(e.target.value)} 
                  placeholder="Why is this change needed?"
              />

              <div className="flex gap-3 mt-4">
                  <Button variant="secondary" fullWidth onClick={() => setIsCorrectionOpen(false)}>Cancel</Button>
                  <Button fullWidth onClick={handleCorrectionSubmit} disabled={!correctionValue.trim()}>Submit</Button>
              </div>
          </div>
      </Modal>
    </div>
  );
};

export default WordDetail;
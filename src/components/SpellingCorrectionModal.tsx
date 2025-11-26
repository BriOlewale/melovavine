import React, { useState } from 'react';
import { Modal, Button, Input, toast } from '@/components/UI';
import { StorageService } from '@/services/storageService';
import { SpellingSuggestion, Translation, User } from '@/types';

interface SpellingCorrectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  translation: Translation;
  user: User;
  onSuccess?: () => void;
}

export const SpellingCorrectionModal: React.FC<SpellingCorrectionModalProps> = ({ 
  isOpen, onClose, translation, user, onSuccess 
}) => {
  // ... rest of the component (no logic changes)
  const [suggestion, setSuggestion] = useState(translation.text);
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!suggestion.trim() || suggestion === translation.text) {
        toast.error("Please make a change to the text.");
        return;
    }

    setIsSubmitting(true);
    try {
        const newSuggestion: SpellingSuggestion = {
            id: crypto.randomUUID(),
            translationId: translation.id,
            originalText: translation.text,
            suggestedText: suggestion,
            reason: reason,
            status: 'open',
            createdAt: Date.now(),
            createdByUserId: user.id,
            createdByUserName: user.name
        };

        await StorageService.createSpellingSuggestion(newSuggestion);
        toast.success("Suggestion submitted for review! 📝");
        if (onSuccess) onSuccess();
        onClose();
    } catch (error) {
        console.error("Failed to submit suggestion:", error);
        toast.error("Failed to submit suggestion.");
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Suggest Spelling Correction">
        <div className="space-y-4">
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Original Text</label>
                <p className="text-slate-700 font-medium">{translation.text}</p>
            </div>

            <div>
                <label className="block text-sm font-bold text-slate-700 mb-2 ml-1">Corrected Text</label>
                <textarea 
                  className="w-full border-2 border-slate-100 rounded-xl p-3 focus:ring-4 focus:ring-brand-500/10 focus:border-brand-400 outline-none transition-all"
                  rows={3}
                  value={suggestion}
                  onChange={e => setSuggestion(e.target.value)}
                />
            </div>

            <Input 
                label="Reason (Optional)" 
                placeholder="e.g., Wrong vowel, missing accent..." 
                value={reason} 
                onChange={e => setReason(e.target.value)} 
            />

            <Button 
                fullWidth 
                onClick={handleSubmit} 
                isLoading={isSubmitting}
                disabled={!suggestion.trim() || suggestion === translation.text}
            >
                Submit Correction
            </Button>
        </div>
    </Modal>
  );
};
import React from 'react';
import { Modal, Badge, Button } from '@/components/UI';
import { TranslationReview } from '@/types';

interface ReviewHistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  reviews: TranslationReview[];
}

const ReviewHistoryDrawer: React.FC<ReviewHistoryDrawerProps> = ({ isOpen, onClose, reviews }) => {
  // ... rest of the component (no logic changes)
  const getActionColor = (action: TranslationReview['action']) => {
    switch (action) {
      case 'approved': return 'green';
      case 'rejected': return 'red';
      case 'edited': return 'blue';
      default: return 'gray';
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Review History">
       <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2">
          {reviews.length === 0 ? (
              <div className="text-center py-8 text-slate-400 italic bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  No reviews yet.
              </div>
          ) : (
              reviews.map(r => (
                  <div key={r.id} className="relative pl-6 pb-6 border-l-2 border-slate-100 last:border-0 last:pb-0">
                      <div className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full border-2 border-white shadow-sm ${r.action === 'approved' ? 'bg-emerald-500' : r.action === 'rejected' ? 'bg-rose-500' : 'bg-blue-500'}`}></div>
                      
                      <div className="flex justify-between items-start mb-1">
                          <div className="font-bold text-slate-800 text-sm">{r.reviewerName}</div>
                          <span className="text-xs text-slate-400 font-mono">{new Date(r.createdAt).toLocaleDateString()}</span>
                      </div>
                      
                      <div className="mb-2">
                          <Badge color={getActionColor(r.action)}>
                              {r.action === 'edited' ? 'Minor Fix' : r.action.charAt(0).toUpperCase() + r.action.slice(1)}
                          </Badge>
                      </div>

                      {r.comment && (
                          <div className="bg-slate-50 p-3 rounded-lg text-sm text-slate-600 border border-slate-100 italic mb-2">
                              "{r.comment}"
                          </div>
                      )}

                      {r.action === 'edited' && (r.previousText || r.newText) && (
                          <div className="text-xs bg-blue-50/50 p-3 rounded-lg border border-blue-100/50 space-y-2">
                              {r.previousText && (
                                  <div>
                                      <span className="block font-bold text-rose-400 uppercase tracking-wider text-[10px] mb-0.5">Before</span>
                                      <div className="text-slate-500 line-through decoration-rose-300 decoration-2">{r.previousText}</div>
                                  </div>
                              )}
                              {r.newText && (
                                  <div>
                                      <span className="block font-bold text-emerald-500 uppercase tracking-wider text-[10px] mb-0.5">After</span>
                                      <div className="text-slate-800 font-medium">{r.newText}</div>
                                  </div>
                              )}
                          </div>
                      )}
                  </div>
              ))
          )}
       </div>
       <div className="mt-6 pt-4 border-t border-slate-100">
           <Button variant="secondary" fullWidth onClick={onClose}>Close History</Button>
       </div>
    </Modal>
  );
};

export default ReviewHistoryDrawer;
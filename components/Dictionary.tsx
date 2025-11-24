import React, { useState } from 'react';
import { Word, WordTranslation, User, WordCategory } from '../types';
import { Card, Input, Button, Badge } from './UI';
import { StorageService } from '../services/storageService';
import WordDetail from './WordDetail';

const WORD_CATEGORIES: WordCategory[] = [
  'family',
  'people',
  'food',
  'ocean',
  'nature',
  'body',
  'animals',
  'village',
  'culture',
  'emotion',
  'numbers',
  'colors',
  'tools',
  'places',
  'time',
  'other',
];

interface DictionaryProps {
  words: Word[];
  wordTranslations: WordTranslation[];
  user: User | null;
  onDeleteWord?: (id: string) => void;
  onAddWord?: (word: Partial<Word>) => void;
}

export const Dictionary: React.FC<DictionaryProps> = ({
  words,
  wordTranslations,
  user,
  onDeleteWord,
  onAddWord,
}) => {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [selectedWord, setSelectedWord] = useState<Word | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newWordText, setNewWordText] = useState('');
  const [newWordMeanings, setNewWordMeanings] = useState('');
  const [newWordCategories, setNewWordCategories] = useState<WordCategory[]>([]);

  const canManageDictionary = StorageService.hasPermission(
    user,
    'dictionary.manage',
  );

  const getFrequencyBadge = (freq?: number) => {
    if (!freq) return <Badge color="gray">Rare</Badge>;
    if (freq >= 100) return <Badge color="purple">Very common</Badge>;
    if (freq >= 20) return <Badge color="green">Common</Badge>;
    if (freq >= 5) return <Badge color="blue">Uncommon</Badge>;
    return <Badge color="gray">Rare</Badge>;
  };

  // simple search + filter
  const filteredWords = words
    .filter((w) => {
      const q = search.toLowerCase().trim();
      const matchesSearch =
        !q ||
        w.text.toLowerCase().includes(q) ||
        (w.normalizedText && w.normalizedText.includes(q)) ||
        (w.meanings || []).some((m) => m.toLowerCase().includes(q));

      const matchesCategory =
        !categoryFilter || (w.categories || []).includes(categoryFilter as any);

      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => a.text.localeCompare(b.text));

  const handleAddWord = () => {
    if (!newWordText.trim() || !onAddWord) return;

    const meaningsArray = newWordMeanings
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    onAddWord({
      id: crypto.randomUUID(),
      text: newWordText.trim(),
      normalizedText: newWordText.toLowerCase().trim(),
      meanings: meaningsArray,
      categories: newWordCategories,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      createdBy: user?.id,
    });

    setIsAddModalOpen(false);
    setNewWordText('');
    setNewWordMeanings('');
    setNewWordCategories([]);
  };

  // For now we don't have real example linking; pass empty array.
  const getExampleTranslationsForWord = (w: Word) => {
    return [] as any[];
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header & filters */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dictionary</h1>
          <p className="text-slate-500">
            {words.length} words indexed
          </p>
        </div>
        {canManageDictionary && (
          <Button onClick={() => setIsAddModalOpen(true)}>
            + Add new word
          </Button>
        )}
      </div>

      <Card>
        <div className="flex flex-col md:flex-row gap-4">
          <Input
            className="flex-1"
            placeholder="Search words or meanings..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="w-full md:w-64">
            <select
              className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-slate-700 focus:border-brand-400 focus:ring-4 focus:ring-brand-500/10 outline-none transition-all"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="">All categories</option>
              {WORD_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c.charAt(0).toUpperCase() + c.slice(1)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* Main content: list + detail panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Word list */}
        <div className={`space-y-4 lg:col-span-${selectedWord ? '2' : '3'}`}>
          {filteredWords.length === 0 && (
            <div className="text-center py-12 text-slate-400 bg-white rounded-3xl border border-dashed border-slate-200">
              No words found.
            </div>
          )}

          {filteredWords.map((w) => (
            <Card
              key={w.id}
              className={`transition-all hover:border-brand-200 cursor-pointer ${
                selectedWord?.id === w.id
                  ? 'ring-2 ring-brand-400 border-brand-400'
                  : ''
              }`}
              onClick={() => setSelectedWord(w)}
              noPadding
            >
              <div className="p-5 flex justify-between items-center gap-4">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="text-xl font-bold text-slate-900">
                      {w.text}
                    </h3>
                    {getFrequencyBadge(w.frequency)}
                  </div>
                  <div className="text-sm text-slate-600 line-clamp-1">
                    {w.meanings && w.meanings.length > 0 ? (
                      w.meanings.join(', ')
                    ) : (
                      <span className="italic text-slate-400">
                        No definitions yet
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="hidden sm:flex gap-1">
                    {(w.categories || []).slice(0, 2).map((c) => (
                      <span
                        key={c}
                        className="text-[10px] px-2 py-1 bg-slate-100 text-slate-500 rounded-full uppercase font-bold tracking-wider"
                      >
                        {c}
                      </span>
                    ))}
                    {(w.categories?.length || 0) > 2 && (
                      <span className="text-xs text-slate-400 self-center">
                        +{(w.categories?.length || 0) - 2}
                      </span>
                    )}
                  </div>

                  {canManageDictionary && onDeleteWord && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (
                          confirm(
                            `Delete the word "${w.text}" from the dictionary?`,
                          )
                        ) {
                          onDeleteWord(w.id);
                          if (selectedWord?.id === w.id) {
                            setSelectedWord(null);
                          }
                        }
                      }}
                      className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-colors ml-2"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Detail panel */}
        {selectedWord && (
          <div className="lg:col-span-1">
            <WordDetail
              word={selectedWord}
              exampleTranslations={getExampleTranslationsForWord(selectedWord)}
              onClose={() => setSelectedWord(null)}
            />
          </div>
        )}
      </div>

      {/* Very simple Add Word modal using plain markup for now */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 space-y-4">
            <h2 className="text-xl font-bold text-slate-900 mb-2">
              Add new word
            </h2>
            <Input
              label="Word"
              value={newWordText}
              onChange={(e) => setNewWordText(e.target.value)}
            />
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                Meanings (comma separated)
              </label>
              <textarea
                className="w-full border-2 border-slate-100 rounded-xl p-3 focus:border-brand-400 focus:ring-4 focus:ring-brand-500/10 outline-none"
                rows={3}
                value={newWordMeanings}
                onChange={(e) => setNewWordMeanings(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                Categories
              </label>
              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 border-2 border-slate-100 rounded-xl">
                {WORD_CATEGORIES.map((cat) => {
                  const checked = newWordCategories.includes(cat);
                  return (
                    <label
                      key={cat}
                      className="flex items-center space-x-2 bg-slate-50 px-3 py-1.5 rounded-lg cursor-pointer hover:bg-slate-100 border border-slate-200"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          setNewWordCategories((prev) =>
                            e.target.checked
                              ? [...prev, cat]
                              : prev.filter((c) => c !== cat),
                          );
                        }}
                        className="rounded text-brand-600 focus:ring-brand-500"
                      />
                      <span className="text-sm text-slate-700 capitalize">
                        {cat}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="secondary"
                onClick={() => setIsAddModalOpen(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleAddWord} disabled={!newWordText.trim()}>
                Save word
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
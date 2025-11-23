import React, { useState } from 'react';
import { Translation, User, Language } from '../types';
import { Card } from './UI'; // Removed Button

export const Leaderboard: React.FC<{ translations: Translation[], users: User[], targetLanguage: Language }> = ({ translations, users, targetLanguage }) => {
  const [metric, setMetric] = useState<'approved' | 'votes'>('approved');

  const stats = users.map(u => {
      // Filter translations for this user and the current target language
      const userTranslations = translations.filter(t => t.translatorId === u.id && t.languageCode === targetLanguage.code);
      
      const approvedCount = userTranslations.filter(t => t.status === 'approved').length;
      const totalVotes = userTranslations.reduce((sum, t) => sum + (t.votes || 0), 0);
      
      return { 
          id: u.id,
          name: u.name, 
          approvedCount, 
          totalVotes 
      };
  })
  .filter(s => s.approvedCount > 0 || s.totalVotes > 0) // Only show active users
  .sort((a, b) => {
      if (metric === 'approved') return b.approvedCount - a.approvedCount;
      return b.totalVotes - a.totalVotes;
  });

  const getMedal = (rank: number) => {
      if (rank === 0) return '🥇';
      if (rank === 1) return '🥈';
      if (rank === 2) return '🥉';
      return `#${rank + 1}`;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
       <div className="text-center space-y-2">
           <h2 className="text-3xl font-bold text-slate-900">Leaderboard</h2>
           <p className="text-slate-500">Top contributors for {targetLanguage.name}</p>
       </div>

       <div className="flex justify-center space-x-4 p-1 bg-slate-100 rounded-xl w-fit mx-auto">
           <button 
               className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${metric === 'approved' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
               onClick={() => setMetric('approved')}
           >
               Most Approved
           </button>
           <button 
               className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${metric === 'votes' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
               onClick={() => setMetric('votes')}
           >
               Highest Voted
           </button>
       </div>

       {/* PODIUM SECTION */}
       {stats.length > 0 && (
           <div className="flex flex-col sm:flex-row justify-center items-end gap-4 mb-10 px-4">
               {/* 2nd Place */}
               <div className="order-2 sm:order-1 w-full sm:w-1/3">
                   {stats[1] ? (
                       <Card className="text-center h-48 flex flex-col justify-center items-center transform hover:-translate-y-1 transition-transform duration-300 border-slate-200">
                           <div className="text-4xl mb-3 bg-slate-100 w-16 h-16 rounded-full flex items-center justify-center border-4 border-white shadow-sm">🥈</div>
                           <div className="font-bold text-lg text-slate-800 truncate w-full px-4">{stats[1].name}</div>
                           <div className="text-3xl font-black text-slate-400 mt-1">
                               {metric === 'approved' ? stats[1].approvedCount : stats[1].totalVotes}
                           </div>
                           <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-1">
                               {metric === 'approved' ? 'Approved' : 'Votes'}
                           </div>
                       </Card>
                   ) : <div className="h-48 hidden sm:block"></div>}
               </div>
               
               {/* 1st Place */}
               <div className="order-1 sm:order-2 w-full sm:w-1/3 -mt-8">
                   {stats[0] && (
                       <Card className="text-center h-60 flex flex-col justify-center items-center border-yellow-400 ring-4 ring-yellow-50 shadow-xl shadow-yellow-100 relative overflow-hidden">
                           <div className="absolute top-0 left-0 w-full h-1 bg-yellow-400"></div>
                           <div className="text-5xl mb-4 bg-yellow-100 w-20 h-20 rounded-full flex items-center justify-center border-4 border-white shadow-sm text-yellow-600">👑</div>
                           <div className="font-bold text-xl text-slate-900 truncate w-full px-4">{stats[0].name}</div>
                           <div className="text-5xl font-black text-brand-600 mt-2">
                               {metric === 'approved' ? stats[0].approvedCount : stats[0].totalVotes}
                           </div>
                           <div className="text-xs font-bold uppercase tracking-widest text-brand-300 mt-2">
                               {metric === 'approved' ? 'APPROVED' : 'VOTES'}
                           </div>
                       </Card>
                   )}
               </div>

               {/* 3rd Place */}
               <div className="order-3 sm:order-3 w-full sm:w-1/3">
                   {stats[2] ? (
                       <Card className="text-center h-40 flex flex-col justify-center items-center transform hover:-translate-y-1 transition-transform duration-300 border-slate-200">
                           <div className="text-3xl mb-3 bg-orange-50 w-14 h-14 rounded-full flex items-center justify-center border-4 border-white shadow-sm">🥉</div>
                           <div className="font-bold text-base text-slate-800 truncate w-full px-4">{stats[2].name}</div>
                           <div className="text-2xl font-bold text-slate-500 mt-1">
                               {metric === 'approved' ? stats[2].approvedCount : stats[2].totalVotes}
                           </div>
                       </Card>
                   ) : <div className="h-40 hidden sm:block"></div>}
               </div>
           </div>
       )}

       {/* FULL LIST */}
       <Card noPadding className="overflow-hidden">
          <div className="overflow-x-auto">
              <table className="w-full">
                 <thead className="bg-slate-50">
                     <tr>
                         <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Rank</th>
                         <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Translator</th>
                         <th className="px-6 py-4 text-right text-xs font-bold text-slate-400 uppercase tracking-wider">Approved</th>
                         <th className="px-6 py-4 text-right text-xs font-bold text-slate-400 uppercase tracking-wider">Total Votes</th>
                     </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100">
                    {stats.map((s, i) => (
                        <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                           <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                               {getMedal(i)}
                           </td>
                           <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700 font-bold">
                               {s.name}
                           </td>
                           <td className={`px-6 py-4 whitespace-nowrap text-sm text-right ${metric === 'approved' ? 'font-bold text-emerald-600' : 'text-slate-500'}`}>
                               {s.approvedCount}
                           </td>
                           <td className={`px-6 py-4 whitespace-nowrap text-sm text-right ${metric === 'votes' ? 'font-bold text-blue-600' : 'text-slate-500'}`}>
                               {s.totalVotes}
                           </td>
                        </tr>
                    ))}
                    {stats.length === 0 && (
                        <tr>
                            <td colSpan={4} className="px-6 py-12 text-center text-slate-400">
                                <div className="flex flex-col items-center gap-2">
                                    <span className="text-4xl">📉</span>
                                    <span>No contributions found yet.</span>
                                    <span className="text-xs text-slate-300">Start translating to see your name here!</span>
                                </div>
                            </td>
                        </tr>
                    )}
                 </tbody>
              </table>
          </div>
       </Card>
    </div>
  );
};
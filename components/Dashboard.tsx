import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { Sentence, Translation, Language, User } from '../types';
import { Card, Button } from './UI';

// Modern Line Icons
const Icons = {
  Book: () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 4.168 6.253v13C4.168 19.977 5.754 19.5 7.5 19.5S10.832 19.977 12 20.5m0-14.247C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 19.977 18.247 19.5 16.5 19.5c-1.747 0-3.332.477-4.5 1.253" /></svg>,
  Check: () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  Clock: () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  Star: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>,
  Zap: () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>,
  Translate: () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" /></svg>,
  TrendingUp: () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>,
  Users: () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
};

export const Dashboard: React.FC<{ sentences: Sentence[]; totalCount: number; translations: Translation[]; language: Language; users: User[]; onNavigate: (page: string) => void }> = ({ sentences, totalCount, translations, language, users, onNavigate }) => {
  const langTrans = translations.filter(t => t.languageCode === language.code);
  const approved = langTrans.filter(t => t.status === 'approved').length;
  const pending = langTrans.filter(t => t.status === 'pending').length;
  
  // Use totalCount if available (cloud), otherwise fallback to array length (local)
  const displayTotal = totalCount > 0 ? totalCount : sentences.length;
  const remaining = Math.max(0, displayTotal - langTrans.length);
  
  const progressPercent = Math.round(((displayTotal - remaining) / displayTotal) * 100) || 0;

  const data = [
    { name: 'Approved', value: approved, color: '#10b981' }, 
    { name: 'Pending', value: pending, color: '#f59e0b' },   
    { name: 'Remaining', value: remaining, color: '#f1f5f9' }, 
  ];

  const topContributors = users.map(u => {
      const userTrans = langTrans.filter(t => t.translatorId === u.id);
      const approvedCount = userTrans.filter(t => t.status === 'approved').length;
      return { id: u.id, name: u.name, approvedCount, total: userTrans.length };
  })
  .filter(u => u.total > 0)
  .sort((a, b) => b.approvedCount - a.approvedCount)
  .slice(0, 5);

  return (
    <div className="space-y-6 sm:space-y-8 pb-12">
       
       {/* HERO HEADER */}
       <div className="relative bg-gradient-to-br from-cyan-500 to-teal-600 rounded-3xl p-8 sm:p-12 text-white overflow-hidden shadow-xl shadow-teal-500/20">
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div>
                  <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest mb-3">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                      Live Project
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2">Welcome back! 👋</h1>
                  <p className="text-teal-100 mt-1 text-sm sm:text-base">Here's what's happening with the <strong>{language.name}</strong> translation project.</p>
              </div>
              <div className="flex gap-3">
                  <Button variant="glass" onClick={() => window.scrollTo({top: 500, behavior: 'smooth'})}>View Stats</Button>
                  <div className="bg-white text-teal-600 font-bold px-6 py-3 rounded-xl shadow-lg cursor-default">
                      {progressPercent}% Complete
                  </div>
              </div>
          </div>
          
          {/* Decorative circles */}
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-40 h-40 bg-cyan-300/20 rounded-full blur-2xl"></div>
       </div>

       {/* STATS GRID - Stack on mobile */}
       <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 -mt-8 sm:-mt-12 relative z-20 px-4 sm:px-8">
          <Card className="flex flex-col justify-between h-full !border-0 !shadow-lg shadow-slate-200/50">
             <div className="flex justify-between items-start">
                <div>
                    <p className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Total Sentences</p>
                    <p className="text-2xl sm:text-3xl font-bold text-slate-800">{displayTotal.toLocaleString()}</p>
                </div>
                <div className="p-3 rounded-xl bg-blue-50 text-brand-600">
                   <Icons.Book />
                </div>
             </div>
             <div className="mt-4 w-full bg-slate-100 rounded-full h-1.5">
                <div className="bg-brand-500 h-1.5 rounded-full" style={{ width: '100%' }}></div>
             </div>
          </Card>

          <Card className="flex flex-col justify-between h-full !border-0 !shadow-lg shadow-slate-200/50">
             <div className="flex justify-between items-start">
                <div>
                    <p className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Approved</p>
                    <p className="text-2xl sm:text-3xl font-bold text-slate-800">{approved.toLocaleString()}</p>
                </div>
                <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600">
                   <Icons.Check />
                </div>
             </div>
             <div className="mt-4 w-full bg-slate-100 rounded-full h-1.5">
                <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${(approved/displayTotal)*100}%` }}></div>
             </div>
          </Card>

          <Card className="flex flex-col justify-between h-full !border-0 !shadow-lg shadow-slate-200/50">
             <div className="flex justify-between items-start">
                <div>
                    <p className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Pending</p>
                    <p className="text-2xl sm:text-3xl font-bold text-slate-800">{pending.toLocaleString()}</p>
                </div>
                <div className="p-3 rounded-xl bg-amber-50 text-amber-600">
                   <Icons.Clock />
                </div>
             </div>
             <div className="mt-4 w-full bg-slate-100 rounded-full h-1.5">
                <div className="bg-amber-500 h-1.5 rounded-full" style={{ width: `${(pending/displayTotal)*100}%` }}></div>
             </div>
          </Card>
       </div>

       {/* MAIN CONTENT GRID - Stack on mobile */}
       <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
           
           {/* LEFT COLUMN */}
           <div className="lg:col-span-2 space-y-6 sm:space-y-8">
               {/* PROJECT HEALTH CHART */}
               <Card className="h-80 sm:h-96 flex flex-col">
                   <div className="flex justify-between items-center mb-6">
                       <div>
                           <h3 className="font-bold text-lg text-slate-800">Project Progress</h3>
                           <p className="text-sm text-slate-500">{progressPercent}% completed</p>
                       </div>
                       <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2.5 py-0.5 rounded">Active</span>
                   </div>
                   <div className="flex-1 relative">
                      <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                             <Pie 
                                data={data} 
                                cx="50%" 
                                cy="50%" 
                                innerRadius={70} 
                                outerRadius={100} 
                                paddingAngle={5} 
                                dataKey="value"
                                stroke="none"
                             >
                                {data.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                             </Pie>
                             <Tooltip 
                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                             />
                          </PieChart>
                       </ResponsiveContainer>
                       {/* Center Metric */}
                       <div className="absolute inset-0 flex items-center justify-center pointer-events-none pb-4">
                          <div className="text-center">
                             <p className="text-4xl font-black text-slate-800">{langTrans.length}</p>
                             <p className="text-xs text-slate-400 font-bold tracking-widest uppercase">Contributions</p>
                          </div>
                       </div>
                   </div>
               </Card>

               {/* QUICK ACTIONS */}
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div className="bg-gradient-to-br from-brand-500 to-cyan-400 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
                       <div className="relative z-10">
                           <div className="h-12 w-12 bg-white/20 rounded-xl flex items-center justify-center mb-4 backdrop-blur-sm">
                               <Icons.Translate />
                           </div>
                           <h3 className="text-xl font-bold mb-2">Start Translating</h3>
                           <p className="text-brand-50 text-sm mb-6">Help us reach 100% completion. Every sentence counts!</p>
                           <Button size="sm" className="bg-white text-brand-600 hover:bg-brand-50 border-none shadow-none w-full sm:w-auto" onClick={() => onNavigate('translate')}>Go to Translator →</Button>
                       </div>
                       <div className="absolute -bottom-12 -right-12 h-40 w-40 rounded-full bg-white/10"></div>
                   </div>

                   <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm relative overflow-hidden hover:shadow-md transition-shadow">
                       <div className="relative z-10">
                           <div className="h-12 w-12 bg-amber-50 text-amber-500 rounded-xl flex items-center justify-center mb-4">
                               <Icons.Check />
                           </div>
                           <h3 className="text-xl font-bold text-slate-800 mb-2">Review Pending</h3>
                           <p className="text-slate-500 text-sm mb-6">There are {pending} sentences waiting for your approval.</p>
                           <Button size="sm" variant="secondary" className="w-full" onClick={() => onNavigate('review')}>Go to Reviews</Button>
                       </div>
                   </div>
               </div>
           </div>
           
           {/* RIGHT COLUMN */}
           <div className="space-y-8">
               {/* TOP CONTRIBUTORS */}
               <Card className="h-auto">
                   <div className="flex items-center justify-between mb-6">
                       <h3 className="font-bold text-lg text-slate-800">Top Contributors</h3>
                       <div className="p-2 bg-yellow-50 rounded-lg text-yellow-600">
                           <Icons.TrendingUp />
                       </div>
                   </div>
                   
                   {topContributors.length > 0 ? (
                       <div className="space-y-5">
                           {topContributors.map((c, i) => (
                               <div key={c.id} className="flex items-center gap-4 group p-2 hover:bg-slate-50 rounded-xl transition-colors">
                                   <div className={`flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center font-bold text-sm ${i === 0 ? 'bg-yellow-50 text-yellow-700 border-yellow-200' : 'bg-slate-50 text-slate-600 border-slate-100'}`}>
                                       {c.name.substring(0, 2).toUpperCase()}
                                   </div>
                                   <div className="flex-1 min-w-0">
                                       <div className="flex justify-between items-center mb-1">
                                           <p className="text-sm font-semibold text-slate-800 truncate">{c.name}</p>
                                           {i === 0 && <span className="text-xs font-bold text-yellow-600">👑 #1</span>}
                                       </div>
                                       <div className="w-full bg-slate-100 rounded-full h-1.5">
                                           <div className="bg-brand-500 h-1.5 rounded-full" style={{ width: `${(c.approvedCount / (topContributors[0].approvedCount || 1)) * 100}%` }}></div>
                                       </div>
                                       <p className="text-xs text-slate-400 mt-1">{c.approvedCount} Approved</p>
                                   </div>
                               </div>
                           ))}
                       </div>
                   ) : (
                       <div className="text-center py-8 text-slate-400">
                           <Icons.Users />
                           <p className="mt-2 text-sm">No contributions yet.</p>
                       </div>
                   )}
                   
                   <div className="mt-6 pt-4 border-t border-slate-50">
                       <Button variant="ghost" fullWidth className="text-sm text-slate-500 hover:text-brand-600" onClick={() => onNavigate('leaderboard')}>View Leaderboard</Button>
                   </div>
               </Card>
           </div>
       </div>
    </div>
  );
};
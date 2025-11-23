import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { Sentence, Translation, Language, User } from '../types';
import { Card, Button, Skeleton } from './UI';

const Icons = {
  Book: () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 4.168 6.253v13C4.168 19.977 5.754 19.5 7.5 19.5S10.832 19.977 12 20.5m0-14.247C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 19.977 18.247 19.5 16.5 19.5c-1.747 0-3.332.477-4.5 1.253" /></svg>,
  Check: () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  Clock: () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  Translate: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" /></svg>,
  TrendingUp: () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>,
  Users: () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
};

export const Dashboard: React.FC<{ sentences: Sentence[]; totalCount: number; translations: Translation[]; language: Language; users: User[]; onNavigate: (page: string) => void }> = ({ sentences, totalCount, translations, language, users, onNavigate }) => {
  const langTrans = translations.filter(t => t.languageCode === language.code);
  const approved = langTrans.filter(t => t.status === 'approved').length;
  const pending = langTrans.filter(t => t.status === 'pending').length;
  const displayTotal = totalCount > 0 ? totalCount : sentences.length;
  const remaining = Math.max(0, displayTotal - langTrans.length);
  const progressPercent = Math.round(((displayTotal - remaining) / displayTotal) * 100) || 0;

  const data = [
    { name: 'Approved', value: approved, color: '#10b981' }, 
    { name: 'Pending', value: pending, color: '#f59e0b' },   
    { name: 'Remaining', value: remaining, color: '#e2e8f0' }, 
  ];

  const topContributors = users.map(u => {
      const userTrans = langTrans.filter(t => t.translatorId === u.id);
      const approvedCount = userTrans.filter(t => t.status === 'approved').length;
      return { id: u.id, name: u.name, approvedCount, total: userTrans.length };
  })
  .filter(u => u.total > 0)
  .sort((a, b) => b.approvedCount - a.approvedCount)
  .slice(0, 5);

  if (displayTotal === 0) return <div className="space-y-6"><Skeleton className="h-40 w-full" /><Skeleton className="h-96 w-full" /></div>;

  return (
    <div className="space-y-6 sm:space-y-10 pb-12">
       
       {/* HERO HEADER */}
       <div className="relative bg-gradient-to-br from-brand-400 to-brand-600 rounded-[32px] p-8 sm:p-12 text-white overflow-hidden shadow-xl shadow-brand-500/25 animate-fade-in">
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div>
                  <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest mb-3 border border-white/20">
                      <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                      System Live
                  </div>
                  <h1 className="text-3xl sm:text-4xl font-black tracking-tight mb-2 font-display">Welcome back! 👋</h1>
                  <p className="text-brand-50 mt-1 text-lg">Here's what's happening with the <strong>{language.name}</strong> project.</p>
              </div>
              <div className="flex gap-3">
                  <div className="bg-white text-brand-700 font-bold px-6 py-3 rounded-2xl shadow-lg cursor-default flex flex-col items-center min-w-[120px]">
                      <span className="text-2xl">{progressPercent}%</span>
                      <span className="text-[10px] uppercase tracking-wider text-brand-400">Complete</span>
                  </div>
              </div>
          </div>
          <div className="absolute top-0 right-0 -mt-16 -mr-16 w-80 h-80 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 -mb-16 -ml-16 w-60 h-60 bg-brand-300/20 rounded-full blur-3xl"></div>
       </div>

       {/* STATS GRID */}
       <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 -mt-10 sm:-mt-16 relative z-20 px-4 sm:px-8">
          <Card className="flex flex-col justify-between h-full !border-0 !shadow-xl !shadow-slate-200/60 hover:-translate-y-2 transition-transform duration-300">
             <div className="flex justify-between items-start">
                <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total</p>
                    <p className="text-3xl font-black text-slate-800 mt-1">{displayTotal.toLocaleString()}</p>
                </div>
                <div className="p-3 rounded-2xl bg-blue-50 text-brand-600">
                   <Icons.Book />
                </div>
             </div>
             <div className="mt-4 w-full bg-slate-100 rounded-full h-2">
                <div className="bg-brand-500 h-2 rounded-full" style={{ width: '100%' }}></div>
             </div>
          </Card>

          <Card className="flex flex-col justify-between h-full !border-0 !shadow-xl !shadow-slate-200/60 hover:-translate-y-2 transition-transform duration-300">
             <div className="flex justify-between items-start">
                <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Approved</p>
                    <p className="text-3xl font-black text-slate-800 mt-1">{approved.toLocaleString()}</p>
                </div>
                <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-600">
                   <Icons.Check />
                </div>
             </div>
             <div className="mt-4 w-full bg-slate-100 rounded-full h-2">
                <div className="bg-emerald-500 h-2 rounded-full" style={{ width: `${(approved/displayTotal)*100}%` }}></div>
             </div>
          </Card>

          <Card className="flex flex-col justify-between h-full !border-0 !shadow-xl !shadow-slate-200/60 hover:-translate-y-2 transition-transform duration-300">
             <div className="flex justify-between items-start">
                <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Pending</p>
                    <p className="text-3xl font-black text-slate-800 mt-1">{pending.toLocaleString()}</p>
                </div>
                <div className="p-3 rounded-2xl bg-amber-50 text-amber-600">
                   <Icons.Clock />
                </div>
             </div>
             <div className="mt-4 w-full bg-slate-100 rounded-full h-2">
                <div className="bg-amber-500 h-2 rounded-full" style={{ width: `${(pending/displayTotal)*100}%` }}></div>
             </div>
          </Card>
       </div>

       {/* MAIN CONTENT */}
       <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
           <div className="lg:col-span-2 space-y-8">
               <Card className="h-96 flex flex-col !p-0 !overflow-hidden">
                   <div className="flex justify-between items-center p-8 border-b border-slate-50">
                       <h3 className="font-bold text-lg text-slate-800">Project Health</h3>
                       <span className="bg-brand-50 text-brand-700 text-xs font-bold px-3 py-1 rounded-full">Live Updates</span>
                   </div>
                   <div className="flex-1 relative">
                      <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                             <Pie 
                                data={data} cx="50%" cy="50%" innerRadius={80} outerRadius={110} paddingAngle={4} dataKey="value" stroke="none" cornerRadius={8}
                             >
                                {data.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                             </Pie>
                             <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 40px -10px rgba(0,0,0,0.1)' }} />
                          </PieChart>
                       </ResponsiveContainer>
                   </div>
               </Card>
           </div>
           
           <div className="space-y-8">
               <Card className="h-auto !p-0">
                   <div className="flex items-center justify-between p-6 border-b border-slate-50">
                       <h3 className="font-bold text-lg text-slate-800">Top Contributors</h3>
                       <div className="p-2 bg-yellow-50 rounded-xl text-yellow-600"><Icons.TrendingUp /></div>
                   </div>
                   {topContributors.length > 0 ? (
                       <div className="p-4 space-y-2">
                           {topContributors.map((c, i) => (
                               <div key={c.id} className="flex items-center gap-4 p-3 hover:bg-slate-50 rounded-2xl transition-colors">
                                   <div className={`flex-shrink-0 h-10 w-10 rounded-xl flex items-center justify-center font-bold text-sm ${i === 0 ? 'bg-gradient-to-br from-yellow-300 to-amber-400 text-white shadow-lg shadow-amber-400/30' : 'bg-slate-100 text-slate-600'}`}>
                                       {i === 0 ? '👑' : i + 1}
                                   </div>
                                   <div className="flex-1">
                                       <p className="text-sm font-bold text-slate-800">{c.name}</p>
                                       <div className="text-xs text-slate-400 font-medium">{c.approvedCount} Approved Translations</div>
                                   </div>
                               </div>
                           ))}
                       </div>
                   ) : (
                       <div className="text-center py-12 text-slate-400">
                           <Icons.Users />
                           <p className="mt-2 text-sm font-medium">No data yet.</p>
                       </div>
                   )}
               </Card>
           </div>
       </div>
    </div>
  );
};
import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Legend } from 'recharts';
import { Sentence, Translation, Language, User } from '../types';
import { Card, Badge, Button } from './UI';

// Icons (SVG Components for portability)
const Icons = {
  Book: () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 4.168 6.253v13C4.168 19.977 5.754 19.5 7.5 19.5S10.832 19.977 12 20.5m0-14.247C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 19.977 18.247 19.5 16.5 19.5c-1.747 0-3.332.477-4.5 1.253" /></svg>,
  CheckCircle: () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  Clock: () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  Translate: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" /></svg>,
  TrendingUp: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>,
  Users: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
};

export const Dashboard: React.FC<{ sentences: Sentence[]; translations: Translation[]; language: Language; users: User[] }> = ({ sentences, translations, language, users }) => {
  const langTrans = translations.filter(t => t.languageCode === language.code);
  const approved = langTrans.filter(t => t.status === 'approved').length;
  const pending = langTrans.filter(t => t.status === 'pending').length;
  const remaining = sentences.length - langTrans.length;
  
  const progressPercent = Math.round(((sentences.length - remaining) / sentences.length) * 100) || 0;

  const data = [
    { name: 'Approved', value: approved, color: '#10b981' }, // Emerald-500
    { name: 'Pending', value: pending, color: '#f59e0b' },   // Amber-500
    { name: 'Remaining', value: remaining > 0 ? remaining : 0, color: '#f1f5f9' }, // Slate-100
  ];

  // Calculate Top Contributors
  const topContributors = users.map(u => {
      const userTrans = langTrans.filter(t => t.translatorId === u.id);
      const approvedCount = userTrans.filter(t => t.status === 'approved').length;
      const totalVotes = userTrans.reduce((acc, t) => acc + (t.votes || 0), 0);
      return { id: u.id, name: u.name, approvedCount, totalVotes, total: userTrans.length };
  })
  .filter(u => u.total > 0)
  .sort((a, b) => b.approvedCount - a.approvedCount)
  .slice(0, 5);

  // Simple activity chart data (mocked for now based on users)
  const activityData = [
    { name: 'Mon', count: 12 },
    { name: 'Tue', count: 19 },
    { name: 'Wed', count: 3 },
    { name: 'Thu', count: 5 },
    { name: 'Fri', count: 2 },
    { name: 'Sat', count: 0 },
    { name: 'Sun', count: 0 },
  ];

  return (
    <div className="space-y-8 pb-12">
       
       {/* HERO SECTION */}
       <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Welcome back, Team! 👋</h1>
            <p className="text-slate-500 mt-1">Here's what's happening with the <strong>{language.name}</strong> translation project today.</p>
          </div>
          <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-full shadow-sm border border-slate-100">
             <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
             <span className="text-sm font-medium text-slate-600">System Operational</span>
          </div>
       </div>

       {/* VITAL STATS CARDS */}
       <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="relative overflow-hidden group">
             <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Icons.Book />
             </div>
             <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-blue-50 text-brand-600">
                   <Icons.Book />
                </div>
                <div>
                   <p className="text-sm font-medium text-slate-500">Total Sentences</p>
                   <p className="text-3xl font-bold text-slate-800">{sentences.length.toLocaleString()}</p>
                </div>
             </div>
             <div className="mt-4 w-full bg-slate-100 rounded-full h-1.5">
                <div className="bg-brand-500 h-1.5 rounded-full" style={{ width: '100%' }}></div>
             </div>
          </Card>

          <Card className="relative overflow-hidden group">
             <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity text-green-600">
                <Icons.CheckCircle />
             </div>
             <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600">
                   <Icons.CheckCircle />
                </div>
                <div>
                   <p className="text-sm font-medium text-slate-500">Approved Translations</p>
                   <p className="text-3xl font-bold text-slate-800">{approved.toLocaleString()}</p>
                </div>
             </div>
             <div className="mt-4 w-full bg-slate-100 rounded-full h-1.5">
                <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${(approved/sentences.length)*100}%` }}></div>
             </div>
          </Card>

          <Card className="relative overflow-hidden group">
             <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity text-amber-500">
                <Icons.Clock />
             </div>
             <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-amber-50 text-amber-500">
                   <Icons.Clock />
                </div>
                <div>
                   <p className="text-sm font-medium text-slate-500">Pending Review</p>
                   <p className="text-3xl font-bold text-slate-800">{pending.toLocaleString()}</p>
                </div>
             </div>
             <div className="mt-4 w-full bg-slate-100 rounded-full h-1.5">
                <div className="bg-amber-500 h-1.5 rounded-full" style={{ width: `${(pending/sentences.length)*100}%` }}></div>
             </div>
          </Card>
       </div>

       {/* MAIN CONTENT GRID */}
       <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
           
           {/* LEFT COLUMN (2/3) */}
           <div className="lg:col-span-2 space-y-8">
               {/* PROJECT HEALTH CHART */}
               <Card className="h-96 flex flex-col">
                   <div className="flex justify-between items-center mb-6">
                       <div>
                           <h3 className="font-bold text-lg text-slate-800">Project Progress</h3>
                           <p className="text-sm text-slate-500">{progressPercent}% of the dataset has been translated</p>
                       </div>
                       <Badge color="blue">Active</Badge>
                   </div>
                   <div className="flex-1 relative">
                      <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                             <Pie 
                                data={data} 
                                cx="50%" 
                                cy="50%" 
                                innerRadius={80} 
                                outerRadius={110} 
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
                             <Legend verticalAlign="bottom" height={36} iconType="circle" />
                          </PieChart>
                       </ResponsiveContainer>
                       {/* Center Text */}
                       <div className="absolute inset-0 flex items-center justify-center pointer-events-none pb-8">
                          <div className="text-center">
                             <p className="text-3xl font-bold text-slate-800">{langTrans.length}</p>
                             <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Translated</p>
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
                           <Button size="sm" className="bg-white text-brand-600 hover:bg-brand-50 border-none shadow-none">Go to Translator →</Button>
                       </div>
                       {/* Decorative Circle */}
                       <div className="absolute -bottom-12 -right-12 h-40 w-40 rounded-full bg-white/10"></div>
                   </div>

                   <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm relative overflow-hidden hover:shadow-md transition-shadow">
                       <div className="relative z-10">
                           <div className="h-12 w-12 bg-amber-50 text-amber-500 rounded-xl flex items-center justify-center mb-4">
                               <Icons.CheckCircle />
                           </div>
                           <h3 className="text-xl font-bold text-slate-800 mb-2">Review Pending</h3>
                           <p className="text-slate-500 text-sm mb-6">There are {pending} sentences waiting for your approval.</p>
                           <Button size="sm" variant="secondary" className="w-full">Go to Reviews</Button>
                       </div>
                   </div>
               </div>
           </div>
           
           {/* RIGHT COLUMN (1/3) */}
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
                               <div key={c.id} className="flex items-center gap-4 group">
                                   <div className={`flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center font-bold text-sm border-2 ${i === 0 ? 'bg-yellow-50 text-yellow-700 border-yellow-200' : 'bg-slate-50 text-slate-600 border-slate-100'}`}>
                                       {c.name.substring(0, 2).toUpperCase()}
                                   </div>
                                   <div className="flex-1 min-w-0">
                                       <div className="flex justify-between mb-1">
                                           <p className="text-sm font-semibold text-slate-800 truncate">{c.name}</p>
                                           {i === 0 && <span className="text-xs font-bold text-yellow-600">👑 #1</span>}
                                       </div>
                                       <div className="w-full bg-slate-100 rounded-full h-1.5">
                                           <div className="bg-brand-500 h-1.5 rounded-full" style={{ width: `${(c.approvedCount / (topContributors[0].approvedCount || 1)) * 100}%` }}></div>
                                       </div>
                                       <p className="text-xs text-slate-400 mt-1">{c.approvedCount} Approved • {c.totalVotes} Votes</p>
                                   </div>
                               </div>
                           ))}
                       </div>
                   ) : (
                       <div className="text-center py-8 text-slate-400">
                           <Icons.Users />
                           <p className="mt-2 text-sm">No contributions yet. Be the first!</p>
                       </div>
                   )}
                   
                   <div className="mt-6 pt-4 border-t border-slate-50">
                       <Button variant="ghost" className="w-full text-sm text-slate-500 hover:text-brand-600">View Full Leaderboard</Button>
                   </div>
               </Card>

               {/* ACTIVITY MINI CHART */}
               <Card>
                   <h3 className="font-bold text-sm text-slate-500 uppercase tracking-wider mb-4">Weekly Activity</h3>
                   <div className="h-32">
                       <ResponsiveContainer width="100%" height="100%">
                           <BarChart data={activityData}>
                               <XAxis dataKey="name" hide />
                               <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
                               <Bar dataKey="count" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                           </BarChart>
                       </ResponsiveContainer>
                   </div>
               </Card>
           </div>
       </div>
    </div>
  );
};
import React, { useState, useEffect } from 'react';
import { User, UserGroup, Project, AuditLog } from '../types'; 
import { Button, Card, Input, Modal, Badge } from './UI';
import { StorageService } from '../services/storageService'; // Removed ALL_PERMISSIONS

// Removed 'sentences' from Props because it wasn't being used
export const AdminPanel: React.FC<{ onImportSentences: Function }> = ({ onImportSentences }) => {
  const [tab, setTab] = useState('users');
  const [isLoading, setIsLoading] = useState(false);
  const [importStatus, setImportStatus] = useState(''); 
  
  // Data State
  const [users, setUsers] = useState<User[]>([]);
  const [groups, setGroups] = useState<UserGroup[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [settings, setSettings] = useState<any>({});
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Modal State - Temporarily unused in simplified view, can re-enable for full admin features
  // const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  // const [editingGroup, setEditingGroup] = useState<UserGroup | null>(null);
  
  // const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  // const [editingProject, setEditingProject] = useState<Project | null>(null);

  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [resetPasswordUserId, setResetPasswordUserId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');

  useEffect(() => {
    loadData();
    setCurrentUser(StorageService.getCurrentUser());
  }, [tab]);

  const loadData = async () => {
    setIsLoading(true);
    try {
        const [u, g, p, l, s] = await Promise.all([
            StorageService.getAllUsers(),
            StorageService.getUserGroups(),
            StorageService.getProjects(),
            StorageService.getAuditLogs(),
            StorageService.getSystemSettings()
        ]);
        setUsers(u); setGroups(g); setProjects(p); setLogs(l); setSettings(s);
    } catch (e) {
        console.error(e);
    } finally {
        setIsLoading(false);
    }
  };

  // --- Handlers ---

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onload = async (ev) => {
              try {
                  const json = JSON.parse(ev.target?.result as string);
                  const formatted = json.map((x: any) => ({ 
                      id: x.id, 
                      english: x.english || x.sentence,
                      projectId: projects.length > 0 ? projects[0].id : 'default' 
                  })).filter((x: any) => x.id && x.english);
                  
                  if (formatted.length === 0) {
                      alert("No valid sentences found in JSON. Ensure 'id' and 'english' fields exist.");
                      return;
                  }

                  setImportStatus(`Preparing to import ${formatted.length} sentences...`);
                  
                  await StorageService.saveSentences(formatted, (count) => {
                      setImportStatus(`Imported ${count} / ${formatted.length} sentences...`);
                  });

                  await onImportSentences();
                  
                  if (currentUser) StorageService.logAuditAction(currentUser, 'IMPORT_DATA', `Imported ${formatted.length} sentences`);
                  setImportStatus(`Success! Imported ${formatted.length} sentences.`);
                  alert('Import Complete! The page will now reload.');
                  setImportStatus('');
              } catch (err: any) {
                  console.error(err);
                  setImportStatus('Error: ' + err.message);
                  alert('Import failed. Check the status message.');
              }
          };
          reader.readAsText(file);
      }
  };

  const saveSettings = async () => { 
      await StorageService.saveSystemSettings(settings); 
      if (currentUser) await StorageService.logAuditAction(currentUser, 'UPDATE_SETTINGS', 'Updated system settings');
      alert('Saved'); 
  };

  const handleUpdateUser = async () => {
      if (editingUser) {
          await StorageService.updateUser(editingUser);
          if (currentUser) await StorageService.logAuditAction(currentUser, 'UPDATE_USER', `Updated profile for user: ${editingUser.email}`);
          setIsUserModalOpen(false);
          loadData();
      }
  };

  const handlePasswordReset = async () => {
      if (resetPasswordUserId && newPassword) {
          await StorageService.adminSetUserPassword(resetPasswordUserId, newPassword);
          setResetPasswordUserId(null);
          setNewPassword('');
      }
  };

  const NavButton = ({ id, label }: { id: string, label: string }) => (
      <button 
          className={`whitespace-nowrap px-4 py-3 rounded-lg font-medium text-sm transition-colors ${tab === id ? 'bg-brand-50 text-brand-700 shadow-sm ring-1 ring-brand-200' : 'text-gray-600 hover:bg-gray-50'}`} 
          onClick={() => setTab(id)}
      >
          {label}
      </button>
  );

  return (
    <div className="flex flex-col md:flex-row min-h-[calc(100vh-4rem)] bg-white md:rounded-lg md:shadow overflow-hidden">
       
       {/* Mobile Navigation (Horizontal Scroll) */}
       <div className="md:hidden overflow-x-auto flex gap-2 p-4 border-b border-gray-100 no-scrollbar bg-white sticky top-16 z-30">
          <NavButton id="users" label="Users" />
          <NavButton id="groups" label="Groups" />
          <NavButton id="projects" label="Projects" />
          <NavButton id="data" label="Data" />
          <NavButton id="logs" label="Logs" />
          <NavButton id="settings" label="Settings" />
       </div>

       {/* Desktop Sidebar */}
       <aside className="hidden md:block w-64 p-6 border-r bg-gray-50">
          <div className="text-xs font-bold text-gray-400 uppercase mb-2 tracking-wider">Management</div>
          <div className="space-y-1">
            <NavButton id="users" label="Users" />
            <NavButton id="groups" label="Groups & Roles" />
            <NavButton id="projects" label="Projects" />
          </div>
          <div className="text-xs font-bold text-gray-400 uppercase mb-2 mt-6 tracking-wider">System</div>
          <div className="space-y-1">
            <NavButton id="data" label="Data Import/Export" />
            <NavButton id="logs" label="Audit Logs" />
            <NavButton id="settings" label="Settings" />
          </div>
       </aside>
       
       <main className="flex-1 p-4 sm:p-8 overflow-y-auto">
          {isLoading && <div className="mb-4 text-brand-600">Syncing data...</div>}
          
          {/* USERS TAB */}
          {tab === 'users' && (
              <div>
                 <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold">User Management</h2>
                 </div>
                 {/* Desktop Table */}
                 <div className="hidden md:block bg-white border rounded-lg overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name / Email</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Groups</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {users.map(u => (
                                <tr key={u.id}>
                                    <td className="px-6 py-4">
                                        <div className="text-sm font-medium text-gray-900">{u.name}</div>
                                        <div className="text-sm text-gray-500">{u.email}</div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-500 capitalize">{u.role}</td>
                                    <td className="px-6 py-4 text-sm text-gray-500">
                                        <div className="flex flex-wrap gap-1">
                                            {u.groupIds?.map(gid => {
                                                const g = groups.find(x => x.id === gid);
                                                return g ? <Badge key={gid}>{g.name}</Badge> : null;
                                            })}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <Badge color={u.isActive ? 'green' : 'red'}>{u.isActive ? 'Active' : 'Inactive'}</Badge>
                                    </td>
                                    <td className="px-6 py-4 text-right text-sm font-medium space-x-2">
                                        <button onClick={() => { setEditingUser(u); setIsUserModalOpen(true); }} className="text-brand-600 hover:text-brand-900">Edit</button>
                                        <button onClick={() => setResetPasswordUserId(u.id)} className="text-gray-600 hover:text-gray-900">Reset PWD</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                 </div>
                 {/* Mobile Card Stack */}
                 <div className="md:hidden space-y-4">
                    {users.map(u => (
                        <Card key={u.id}>
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <h3 className="font-bold text-gray-900">{u.name}</h3>
                                    <p className="text-sm text-gray-500">{u.email}</p>
                                </div>
                                <Badge color={u.isActive ? 'green' : 'red'}>{u.isActive ? 'Active' : 'Inactive'}</Badge>
                            </div>
                            <div className="text-sm text-gray-600 mb-3 flex gap-2 flex-wrap">
                                <Badge color="blue">{u.role}</Badge>
                                {u.groupIds?.map(gid => {
                                    const g = groups.find(x => x.id === gid);
                                    return g ? <Badge key={gid}>{g.name}</Badge> : null;
                                })}
                            </div>
                            <div className="flex gap-2">
                                <Button size="sm" variant="secondary" fullWidth onClick={() => { setEditingUser(u); setIsUserModalOpen(true); }}>Edit</Button>
                                <Button size="sm" variant="ghost" fullWidth onClick={() => setResetPasswordUserId(u.id)}>Reset PWD</Button>
                            </div>
                        </Card>
                    ))}
                 </div>
              </div>
          )}
          
          {/* GROUPS TAB */}
          {tab === 'groups' && (
              <div>
                 <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold">Groups & Permissions</h2>
                 </div>
                 <div className="grid gap-4">
                     {groups.map(g => (
                         <Card key={g.id} className="flex flex-col">
                             <div className="flex justify-between items-start mb-2">
                                 <div>
                                    <h3 className="text-lg font-bold">{g.name}</h3>
                                    <p className="text-sm text-gray-500">{g.description}</p>
                                 </div>
                             </div>
                             <div className="mt-2 flex flex-wrap gap-1">
                                 {g.permissions.includes('*') 
                                     ? <Badge color="purple">ALL ACCESS (Super Admin)</Badge>
                                     : g.permissions.slice(0, 8).map(p => <Badge key={p} color="gray">{p}</Badge>)
                                 }
                                 {g.permissions.length > 8 && <span className="text-xs text-gray-500">+{g.permissions.length - 8} more</span>}
                             </div>
                         </Card>
                     ))}
                 </div>
              </div>
          )}

          {tab === 'projects' && (
              <div>
                 <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold">Projects</h2>
                 </div>
                 {/* Desktop Table */}
                 <div className="hidden md:block bg-white border rounded-lg overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                             <tr>
                                <th className="px-6 py-3 text-left text-xs uppercase text-gray-500">Project Name</th>
                                <th className="px-6 py-3 text-left text-xs uppercase text-gray-500">Language</th>
                                <th className="px-6 py-3 text-left text-xs uppercase text-gray-500">Status</th>
                                <th className="px-6 py-3 text-right text-xs uppercase text-gray-500">Actions</th>
                             </tr>
                        </thead>
                        <tbody>
                            {projects.map(p => (
                                <tr key={p.id}>
                                    <td className="px-6 py-4 font-medium">{p.name}</td>
                                    <td className="px-6 py-4 uppercase">{p.targetLanguageCode}</td>
                                    <td className="px-6 py-4"><Badge color={p.status === 'active' ? 'green' : 'gray'}>{p.status}</Badge></td>
                                    <td className="px-6 py-4 text-right">
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                 </div>
                 {/* Mobile Cards */}
                 <div className="md:hidden space-y-4">
                    {projects.map(p => (
                        <Card key={p.id}>
                            <div className="flex justify-between mb-2">
                                <h3 className="font-bold">{p.name}</h3>
                                <Badge color={p.status === 'active' ? 'green' : 'gray'}>{p.status}</Badge>
                            </div>
                            <div className="text-sm text-gray-500 mb-4">Language: {p.targetLanguageCode}</div>
                        </Card>
                    ))}
                 </div>
              </div>
          )}

          {tab === 'data' && (
              <div className="max-w-2xl">
                 <h2 className="text-2xl font-bold mb-6">Data Management</h2>
                 <Card className="mb-6">
                     <h3 className="font-bold mb-2">Import Sentences</h3>
                     <p className="text-sm text-gray-600 mb-4">Upload a JSON file containing an array of objects with <code>id</code> and <code>english</code> (or <code>sentence</code>) fields.</p>
                     <input type="file" accept=".json" onChange={handleImport} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100"/>
                     {importStatus && (
                         <div className={`mt-4 p-3 rounded font-mono text-sm ${importStatus.includes('Error') ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'}`}>
                             {importStatus}
                         </div>
                     )}
                 </Card>
                 
                 <Card className="mb-6">
                     <h3 className="font-bold mb-2">Export Translations</h3>
                     <p className="text-sm text-gray-600 mb-4">Download the full translation dataset.</p>
                     <Button fullWidth onClick={() => alert("Export unavailable in this view.")}>Download JSON</Button>
                 </Card>

                 <Card className="border-red-200 bg-red-50">
                     <h3 className="font-bold text-red-700 mb-2">Danger Zone</h3>
                     <p className="text-sm text-red-600 mb-4">Clear All is disabled in Cloud Mode.</p>
                     <Button fullWidth variant="danger" disabled>Factory Reset App</Button>
                 </Card>
              </div>
          )}

          {tab === 'logs' && (
              <div>
                 <h2 className="text-2xl font-bold mb-6">Audit Logs</h2>
                 {/* Desktop Table */}
                 <div className="hidden md:block bg-white border rounded-lg overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs uppercase text-gray-500">Time</th>
                                <th className="px-6 py-3 text-left text-xs uppercase text-gray-500">User</th>
                                <th className="px-6 py-3 text-left text-xs uppercase text-gray-500">Action</th>
                                <th className="px-6 py-3 text-left text-xs uppercase text-gray-500">Details</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {logs.slice(0, 50).map(log => (
                                <tr key={log.id}>
                                    <td className="px-6 py-4 text-sm text-gray-500">{new Date(log.timestamp).toLocaleString()}</td>
                                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{log.userName}</td>
                                    <td className="px-6 py-4 text-xs font-mono text-gray-600">{log.action}</td>
                                    <td className="px-6 py-4 text-sm text-gray-600">{log.details}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                 </div>
                 {/* Mobile Cards */}
                 <div className="md:hidden space-y-3">
                     {logs.slice(0, 30).map(log => (
                         <div key={log.id} className="bg-white p-3 rounded border text-sm">
                             <div className="flex justify-between mb-1">
                                 <span className="font-bold text-gray-800">{log.userName}</span>
                                 <span className="text-xs text-gray-400">{new Date(log.timestamp).toLocaleDateString()}</span>
                             </div>
                             <div className="font-mono text-xs text-brand-600 mb-1">{log.action}</div>
                             <div className="text-gray-600">{log.details}</div>
                         </div>
                     ))}
                 </div>
              </div>
          )}

          {tab === 'settings' && (
              <div className="max-w-xl space-y-6">
                 <h2 className="text-2xl font-bold">System Settings</h2>
                 
                 <Card>
                     <h3 className="text-lg font-medium mb-4">Artificial Intelligence</h3>
                     <Input label="Google Gemini API Key" type="password" value={settings.geminiApiKey || ''} onChange={e => setSettings({...settings, geminiApiKey: e.target.value})} />
                     <p className="text-xs text-gray-500 mt-2">Required for translation suggestions and quality scoring.</p>
                 </Card>
                 <Card>
                     <h3 className="text-lg font-medium mb-4">Email Configuration</h3>
                     <div className="space-y-3">
                        <Input label="Service ID" value={settings.emailJsServiceId || ''} onChange={e => setSettings({...settings, emailJsServiceId: e.target.value})} />
                        <Input label="Template ID" value={settings.emailJsTemplateId || ''} onChange={e => setSettings({...settings, emailJsTemplateId: e.target.value})} />
                        <Input label="Public Key" type="password" value={settings.emailJsPublicKey || ''} onChange={e => setSettings({...settings, emailJsPublicKey: e.target.value})} />
                     </div>
                 </Card>
                 <Card>
                     <h3 className="text-lg font-medium mb-4">General</h3>
                     <label className="flex items-center space-x-2">
                        <input type="checkbox" checked={settings.showDemoBanner} onChange={e => setSettings({...settings, showDemoBanner: e.target.checked})} />
                        <span>Show "Demo Mode" Banner</span>
                     </label>
                 </Card>
                 <div className="pt-4"><Button onClick={saveSettings} fullWidth>Save All Settings</Button></div>
              </div>
          )}
       </main>
       
       {isUserModalOpen && editingUser && (
           <Modal isOpen={isUserModalOpen} onClose={() => setIsUserModalOpen(false)} title={`Edit User`}>
               <div className="space-y-4">
                   <Input 
                        label="Display Name" 
                        value={editingUser.name} 
                        onChange={e => setEditingUser({...editingUser, name: e.target.value})} 
                   />
                   <div>
                       <label className="block text-sm font-medium text-gray-700 mb-2">Assigned Groups</label>
                       <div className="space-y-2 border p-3 rounded">
                           {groups.map(g => (
                               <label key={g.id} className="flex items-center space-x-2">
                                   <input 
                                      type="checkbox" 
                                      checked={editingUser.groupIds?.includes(g.id)} 
                                      onChange={() => {
                                          const current = editingUser.groupIds || [];
                                          const newGroups = current.includes(g.id) 
                                              ? current.filter(id => id !== g.id)
                                              : [...current, g.id];
                                          setEditingUser({ ...editingUser, groupIds: newGroups });
                                      }}
                                   />
                                   <span>{g.name}</span>
                               </label>
                           ))}
                       </div>
                   </div>
                   <Button onClick={handleUpdateUser} fullWidth>Save Changes</Button>
               </div>
           </Modal>
       )}
       {resetPasswordUserId && (
           <Modal isOpen={!!resetPasswordUserId} onClose={() => setResetPasswordUserId(null)} title="Reset Password">
               <div className="space-y-4">
                   <p className="text-sm text-gray-600">Enter a new password for this user.</p>
                   <Input label="New Password" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
                   <Button onClick={handlePasswordReset} className="w-full" disabled={!newPassword}>Confirm Reset</Button>
               </div>
           </Modal>
       )}
    </div>
  );
};
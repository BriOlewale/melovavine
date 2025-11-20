import React, { useState, useEffect } from 'react';
import { Sentence, Translation, User, UserGroup, Project, AuditLog, Permission } from '../types';
import { Button, Card, Input, Modal, Badge } from './UI';
import { StorageService, ALL_PERMISSIONS } from '../services/storageService';

export const AdminPanel: React.FC<{ onImportSentences: Function, sentences: Sentence[], translations: Translation[], onClearAll: Function }> = ({ onImportSentences, sentences, translations, onClearAll }) => {
  const [tab, setTab] = useState('users');
  
  // Data State
  const [users, setUsers] = useState<User[]>([]);
  const [groups, setGroups] = useState<UserGroup[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [settings, setSettings] = useState(StorageService.getSystemSettings());
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Modal State
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<UserGroup | null>(null);
  
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [resetPasswordUserId, setResetPasswordUserId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');

  useEffect(() => {
    loadData();
    setCurrentUser(StorageService.getCurrentUser());
  }, [tab]);

  const loadData = () => {
    setUsers(StorageService.getAllUsers());
    setGroups(StorageService.getUserGroups());
    setProjects(StorageService.getProjects());
    setLogs(StorageService.getAuditLogs());
    setSettings(StorageService.getSystemSettings());
  };

  // --- Handlers ---

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onload = (ev) => {
              try {
                  const json = JSON.parse(ev.target?.result as string);
                  // Handle both {id, english} and {id, sentence} formats
                  const formatted = json.map((x: any) => ({ 
                      id: x.id, 
                      english: x.english || x.sentence,
                      projectId: projects.length > 0 ? projects[0].id : 'default' // Default to first project
                  }));
                  onImportSentences(formatted);
                  StorageService.logAuditAction(currentUser!, 'IMPORT_DATA', `Imported ${formatted.length} sentences`);
                  alert(`Successfully imported ${formatted.length} sentences.`);
                  loadData();
              } catch (err) {
                  alert('Invalid JSON format');
              }
          };
          reader.readAsText(file);
      }
  };

  const saveSettings = () => { 
      StorageService.saveSystemSettings(settings); 
      StorageService.logAuditAction(currentUser!, 'UPDATE_SETTINGS', 'Updated system settings');
      alert('Saved'); 
  };

  const handleSaveGroup = () => {
      if (editingGroup) {
          StorageService.saveUserGroup(editingGroup);
          StorageService.logAuditAction(currentUser!, 'UPDATE_GROUP', `Updated group: ${editingGroup.name}`);
          setIsGroupModalOpen(false);
          loadData();
      }
  };

  const handleSaveProject = () => {
      if (editingProject) {
          StorageService.saveProject(editingProject);
          StorageService.logAuditAction(currentUser!, 'UPDATE_PROJECT', `Updated project: ${editingProject.name}`);
          setIsProjectModalOpen(false);
          loadData();
      }
  };

  const handleUpdateUserGroups = () => {
      if (editingUser) {
          StorageService.updateUser(editingUser);
          StorageService.logAuditAction(currentUser!, 'UPDATE_USER_GROUPS', `Updated groups for user: ${editingUser.email}`);
          setIsUserModalOpen(false);
          loadData();
      }
  };

  const handlePasswordReset = () => {
      if (resetPasswordUserId && newPassword) {
          StorageService.adminSetUserPassword(resetPasswordUserId, newPassword);
          StorageService.logAuditAction(currentUser!, 'RESET_PASSWORD', `Reset password for user ID: ${resetPasswordUserId}`);
          setResetPasswordUserId(null);
          setNewPassword('');
          alert('Password updated');
      }
  };

  const toggleGroupPermission = (perm: Permission) => {
      if (!editingGroup) return;
      const has = editingGroup.permissions.includes(perm);
      const newPerms = has 
          ? editingGroup.permissions.filter(p => p !== perm)
          : [...editingGroup.permissions, perm];
      setEditingGroup({ ...editingGroup, permissions: newPerms });
  };

  // --- UI Components ---

  const NavButton = ({ id, label }: { id: string, label: string }) => (
      <button 
          className={`block w-full text-left p-3 rounded mb-1 ${tab === id ? 'bg-brand-50 text-brand-700 font-medium' : 'hover:bg-gray-100 text-gray-600'}`} 
          onClick={() => setTab(id)}
      >
          {label}
      </button>
  );

  return (
    <div className="flex min-h-[calc(100vh-4rem)] bg-white rounded-lg shadow overflow-hidden">
       <aside className="w-64 p-4 border-r bg-gray-50">
          <div className="text-xs font-bold text-gray-400 uppercase mb-2 tracking-wider">Management</div>
          <NavButton id="users" label="Users" />
          <NavButton id="groups" label="Groups & Roles" />
          <NavButton id="projects" label="Projects" />
          <div className="text-xs font-bold text-gray-400 uppercase mb-2 mt-6 tracking-wider">System</div>
          <NavButton id="data" label="Data Import/Export" />
          <NavButton id="logs" label="Audit Logs" />
          <NavButton id="settings" label="Settings" />
       </aside>
       
       <main className="flex-1 p-8 overflow-y-auto">
          {/* USERS TAB */}
          {tab === 'users' && (
              <div>
                 <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold">User Management</h2>
                 </div>
                 <div className="bg-white border rounded-lg overflow-hidden">
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
                                        <button onClick={() => { setEditingUser(u); setIsUserModalOpen(true); }} className="text-brand-600 hover:text-brand-900">Edit Groups</button>
                                        <button onClick={() => setResetPasswordUserId(u.id)} className="text-gray-600 hover:text-gray-900">Reset PWD</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                 </div>
              </div>
          )}

          {/* GROUPS TAB */}
          {tab === 'groups' && (
              <div>
                 <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold">Groups & Permissions</h2>
                    <Button onClick={() => { setEditingGroup({ id: crypto.randomUUID(), name: '', permissions: [], description: '' }); setIsGroupModalOpen(true); }}>Create Group</Button>
                 </div>
                 <div className="grid gap-4">
                     {groups.map(g => (
                         <Card key={g.id} className="flex flex-col">
                             <div className="flex justify-between items-start mb-2">
                                 <div>
                                    <h3 className="text-lg font-bold">{g.name}</h3>
                                    <p className="text-sm text-gray-500">{g.description}</p>
                                 </div>
                                 <Button variant="ghost" onClick={() => { setEditingGroup(g); setIsGroupModalOpen(true); }}>Edit</Button>
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

          {/* PROJECTS TAB */}
          {tab === 'projects' && (
              <div>
                 <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold">Projects</h2>
                    <Button onClick={() => { setEditingProject({ id: crypto.randomUUID(), name: '', targetLanguageCode: 'hula', status: 'active', createdAt: Date.now() }); setIsProjectModalOpen(true); }}>New Project</Button>
                 </div>
                 <div className="bg-white border rounded-lg overflow-hidden">
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
                                        <button onClick={() => { setEditingProject(p); setIsProjectModalOpen(true); }} className="text-brand-600 hover:underline">Edit</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                 </div>
              </div>
          )}

          {/* DATA TAB */}
          {tab === 'data' && (
              <div className="max-w-2xl">
                 <h2 className="text-2xl font-bold mb-6">Data Management</h2>
                 <Card className="mb-6">
                     <h3 className="font-bold mb-2">Import Sentences</h3>
                     <p className="text-sm text-gray-600 mb-4">Upload a JSON file containing an array of objects with <code>id</code> and <code>english</code> (or <code>sentence</code>) fields.</p>
                     <input type="file" accept=".json" onChange={handleImport} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100"/>
                 </Card>
                 <Card className="mb-6">
                     <h3 className="font-bold mb-2">Export Translations</h3>
                     <p className="text-sm text-gray-600 mb-4">Download the full translation dataset.</p>
                     <Button onClick={() => {
                         const blob = new Blob([JSON.stringify(translations, null, 2)], { type: 'application/json' });
                         const url = URL.createObjectURL(blob);
                         const a = document.createElement('a');
                         a.href = url;
                         a.download = `va_vanagi_export_${Date.now()}.json`;
                         a.click();
                         StorageService.logAuditAction(currentUser!, 'EXPORT_DATA', 'Exported full dataset');
                     }}>Download JSON</Button>
                 </Card>
                 <Card className="border-red-200 bg-red-50">
                     <h3 className="font-bold text-red-700 mb-2">Danger Zone</h3>
                     <p className="text-sm text-red-600 mb-4">This will permanently delete all local data.</p>
                     <Button variant="danger" onClick={() => { if(confirm('Are you sure?')) { onClearAll(); StorageService.logAuditAction(currentUser!, 'WIPE_DATA', 'Cleared all application data'); } }}>Factory Reset App</Button>
                 </Card>
              </div>
          )}

          {/* AUDIT LOGS TAB */}
          {tab === 'logs' && (
              <div>
                 <h2 className="text-2xl font-bold mb-6">Audit Logs</h2>
                 <div className="bg-white border rounded-lg overflow-hidden">
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
              </div>
          )}

          {/* SETTINGS TAB */}
          {tab === 'settings' && (
              <div className="max-w-xl">
                 <h2 className="text-2xl font-bold mb-6">System Settings</h2>
                 <Card>
                     <Input label="Google Gemini API Key" type="password" value={settings.geminiApiKey || ''} onChange={e => setSettings({...settings, geminiApiKey: e.target.value})} />
                     <p className="text-xs text-gray-500 mt-2 mb-4">Required for AI suggestions and quality scoring.</p>
                     
                     <label className="flex items-center space-x-2 mt-4">
                        <input type="checkbox" checked={settings.showDemoBanner} onChange={e => setSettings({...settings, showDemoBanner: e.target.checked})} />
                        <span>Show "Demo Mode" Banner</span>
                     </label>
                     
                     <div className="mt-6">
                        <Button onClick={saveSettings}>Save Settings</Button>
                     </div>
                 </Card>
              </div>
          )}
       </main>

       {/* MODALS */}
       
       {/* Group Modal */}
       {isGroupModalOpen && editingGroup && (
           <Modal isOpen={isGroupModalOpen} onClose={() => setIsGroupModalOpen(false)} title={editingGroup.id ? "Edit Group" : "Create Group"}>
               <div className="space-y-4 max-h-[70vh] overflow-y-auto">
                   <Input label="Group Name" value={editingGroup.name} onChange={e => setEditingGroup({...editingGroup, name: e.target.value})} />
                   <Input label="Description" value={editingGroup.description || ''} onChange={e => setEditingGroup({...editingGroup, description: e.target.value})} />
                   
                   <div>
                       <label className="block text-sm font-medium text-gray-700 mb-2">Permissions</label>
                       <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-gray-50 p-4 rounded border">
                           {ALL_PERMISSIONS.map(perm => (
                               <label key={perm} className="flex items-center space-x-2">
                                   <input 
                                      type="checkbox" 
                                      checked={editingGroup.permissions.includes(perm)} 
                                      onChange={() => toggleGroupPermission(perm)}
                                      disabled={editingGroup.id === 'g-admin' && perm === '*'} // Prevent locking out admin
                                   />
                                   <span className="text-sm font-mono text-gray-600">{perm}</span>
                               </label>
                           ))}
                       </div>
                   </div>
                   
                   <div className="pt-4">
                       <Button onClick={handleSaveGroup} className="w-full">Save Group</Button>
                   </div>
               </div>
           </Modal>
       )}

       {/* Project Modal */}
       {isProjectModalOpen && editingProject && (
           <Modal isOpen={isProjectModalOpen} onClose={() => setIsProjectModalOpen(false)} title="Manage Project">
               <div className="space-y-4">
                   <Input label="Project Name" value={editingProject.name} onChange={e => setEditingProject({...editingProject, name: e.target.value})} />
                   <Input label="Language Code" value={editingProject.targetLanguageCode} onChange={e => setEditingProject({...editingProject, targetLanguageCode: e.target.value})} />
                   <div>
                       <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                       <select 
                          className="block w-full border rounded p-2"
                          value={editingProject.status}
                          onChange={e => setEditingProject({...editingProject, status: e.target.value as any})}
                       >
                           <option value="active">Active</option>
                           <option value="completed">Completed</option>
                           <option value="archived">Archived</option>
                           <option value="draft">Draft</option>
                       </select>
                   </div>
                   <Button onClick={handleSaveProject} className="w-full mt-4">Save Project</Button>
               </div>
           </Modal>
       )}

       {/* User Edit Modal */}
       {isUserModalOpen && editingUser && (
           <Modal isOpen={isUserModalOpen} onClose={() => setIsUserModalOpen(false)} title={`Edit User: ${editingUser.name}`}>
               <div className="space-y-4">
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
                   <Button onClick={handleUpdateUserGroups} className="w-full">Update User</Button>
               </div>
           </Modal>
       )}

       {/* Password Reset Modal */}
       {resetPasswordUserId && (
           <Modal isOpen={!!resetPasswordUserId} onClose={() => setResetPasswordUserId(null)} title="Reset Password">
               <div className="space-y-4">
                   <p className="text-sm text-gray-600">Enter a new password for this user. This will overwrite their existing password.</p>
                   <Input label="New Password" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
                   <Button onClick={handlePasswordReset} className="w-full" disabled={!newPassword}>Confirm Reset</Button>
               </div>
           </Modal>
       )}
    </div>
  );
};
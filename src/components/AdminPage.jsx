import React, { useState, useEffect } from 'react';
import { 
  collection, 
  onSnapshot, 
  doc, 
  updateDoc, 
  arrayUnion, 
  arrayRemove, 
  deleteDoc,
  setDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase.js';
import AdminUploader from './AdminUploader.jsx';
import { Paperclip, ExternalLink, Users, Shield, ShieldAlert, Crown, Edit, Calendar, Save, X } from 'lucide-react';

// --- 設定超級管理員 Email ---
const SUPER_ADMIN_EMAILS = [
  'amanhung0419@gmail.com', 
  'admin@example.com'
];

const AdminPage = ({ user }) => {
  const [activeTab, setActiveTab] = useState('resources'); 
  
  // 資料狀態
  const [sops, setSops] = useState([]);
  const [videos, setVideos] = useState([]);
  const [usersList, setUsersList] = useState([]); 
  const [settings, setSettings] = useState({ quickKeywords: [], categories: [] });
  
  // 錯誤與編輯狀態
  const [error, setError] = useState(null);
  const [editingItem, setEditingItem] = useState(null); // SOP/Video 編輯
  
  // 用戶編輯狀態
  const [editingUser, setEditingUser] = useState(null); // User 編輯
  const [userForm, setUserForm] = useState({ displayName: '', arrivalDate: '', role: 'student' });

  // 輸入狀態 (用於設定頁面)
  const [newKeyword, setNewKeyword] = useState('');
  const [newCategory, setNewCategory] = useState('');

  // 1. 監聽 SOP 資料
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'sop_articles'), (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSops(list);
    });
    return () => unsubscribe();
  }, []);

  // 2. 監聽 Video 資料
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'training_videos'), (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setVideos(list);
    });
    return () => unsubscribe();
  }, []);

  // 3. 監聽 設定檔
  useEffect(() => {
    const docRef = doc(db, 'site_settings', 'sop_config');
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        setSettings(docSnap.data());
      } else {
        setDoc(docRef, { quickKeywords: [], categories: [] });
      }
    });
    return () => unsubscribe();
  }, []);

  // 4. 監聽 用戶列表
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'users'), (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUsersList(list);
    });
    return () => unsubscribe();
  }, []);

  // 處理資源刪除/編輯 (SOP/Video)
  const handleDeleteResource = async (collectionName, id) => {
    if (window.confirm('確定要刪除此項目嗎？')) {
      try {
        await deleteDoc(doc(db, collectionName, id));
        if (editingItem && editingItem.id === id) setEditingItem(null);
      } catch (error) { alert('刪除失敗'); }
    }
  };
  const handleEditResource = (item, type) => {
    setEditingItem({ ...item, type });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // 處理參數設定
  const updateSettingArray = async (field, action, value) => {
    if (!value.trim()) return;
    const docRef = doc(db, 'site_settings', 'sop_config');
    try {
      if (action === 'add') {
        if (settings[field]?.includes(value)) return alert('已存在');
        await updateDoc(docRef, { [field]: arrayUnion(value) });
      } else if (action === 'remove') {
        if (window.confirm(`確定移除 "${value}"?`)) await updateDoc(docRef, { [field]: arrayRemove(value) });
      }
    } catch (error) { alert('更新失敗'); }
  };

  // --- 用戶管理功能 ---

  // 開啟編輯用戶 Modal
  const openEditUser = (u) => {
    setEditingUser(u);
    setUserForm({
      displayName: u.displayName || '',
      arrivalDate: u.arrivalDate || '',
      role: u.role || 'student'
    });
  };

  // 儲存用戶資料
  const handleSaveUser = async (e) => {
    e.preventDefault();
    if (!editingUser) return;
    
    // 超級管理員保護
    if (SUPER_ADMIN_EMAILS.includes(editingUser.email) && userForm.role !== 'teacher') {
       alert("超級管理員必須保留指導藥師(或更高)權限");
       return;
    }

    try {
      await updateDoc(doc(db, 'users', editingUser.id), {
        displayName: userForm.displayName,
        arrivalDate: userForm.arrivalDate,
        role: userForm.role
      });
      setEditingUser(null);
      alert("用戶資料已更新");
    } catch (error) {
      console.error(error);
      alert("更新失敗");
    }
  };

  return (
    <div className="bg-gray-50 min-h-screen p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex justify-between items-center bg-white p-6 rounded-lg shadow-sm">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">藥局後台管理系統</h1>
            <p className="text-gray-500 text-sm mt-1">
              目前資料庫狀態：{sops.length} 份 SOP, {videos.length} 部影片, {usersList.length} 位用戶
            </p>
          </div>
          <div className="space-x-2">
            <button onClick={() => setActiveTab('resources')} className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'resources' ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-100 text-gray-600'}`}>資源管理</button>
            <button onClick={() => setActiveTab('settings')} className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'settings' ? 'bg-teal-600 text-white shadow-md' : 'bg-gray-100 text-gray-600'}`}>參數與人員</button>
          </div>
        </div>

        {error && <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded text-red-700 font-bold">{error}</div>}

        {/* TAB 1: 資源管理 */}
        {activeTab === 'resources' && (
          <div className="space-y-8">
            <AdminUploader 
              editData={editingItem} 
              onCancelEdit={() => setEditingItem(null)}
              onSuccess={() => setEditingItem(null)}
              settings={settings}
            />
            {/* ... SOP List ... */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
               <div className="px-6 py-4 border-b border-gray-100 bg-blue-50 flex justify-between items-center">
                <h3 className="font-bold text-blue-800">SOP 文件 ({sops.length})</h3>
               </div>
               <div className="overflow-x-auto max-h-96">
                 <table className="w-full text-left text-sm">
                   <thead className="bg-gray-50 sticky top-0">
                     <tr><th className="px-6 py-3">標題</th><th className="px-6 py-3">分類</th><th className="px-6 py-3">附件</th><th className="px-6 py-3 text-right">操作</th></tr>
                   </thead>
                   <tbody className="divide-y divide-gray-100">
                     {sops.map(s => (
                       <tr key={s.id} className="hover:bg-gray-50">
                         <td className="px-6 py-4">{s.title}</td>
                         <td className="px-6 py-4"><span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">{s.category}</span></td>
                         <td className="px-6 py-4">{s.attachmentUrl ? <a href={s.attachmentUrl} target="_blank" rel="noreferrer" className="text-blue-500 flex items-center gap-1"><Paperclip className="w-3 h-3"/>連結</a> : '-'}</td>
                         <td className="px-6 py-4 text-right space-x-2">
                           <button onClick={() => handleEditResource(s, 'sop')} className="text-indigo-600 font-medium">編輯</button>
                           <button onClick={() => handleDeleteResource('sop_articles', s.id)} className="text-red-600 font-medium">刪除</button>
                         </td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
            </div>
            
            {/* ... Video List ... */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
               <div className="px-6 py-4 border-b border-gray-100 bg-purple-50 flex justify-between items-center">
                <h3 className="font-bold text-purple-800">教學影片 ({videos.length})</h3>
               </div>
               <div className="overflow-x-auto max-h-96">
                 <table className="w-full text-left text-sm">
                   <thead className="bg-gray-50 sticky top-0">
                     <tr><th className="px-6 py-3">標題</th><th className="px-6 py-3">分類</th><th className="px-6 py-3 text-right">操作</th></tr>
                   </thead>
                   <tbody className="divide-y divide-gray-100">
                     {videos.map(v => (
                       <tr key={v.id} className="hover:bg-gray-50">
                         <td className="px-6 py-4">{v.title}</td>
                         <td className="px-6 py-4"><span className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded-full">{v.category}</span></td>
                         <td className="px-6 py-4 text-right space-x-2">
                           <button onClick={() => handleEditResource(v, 'video')} className="text-indigo-600 font-medium">編輯</button>
                           <button onClick={() => handleDeleteResource('training_videos', v.id)} className="text-red-600 font-medium">刪除</button>
                         </td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
            </div>
          </div>
        )}

        {/* TAB 2: 參數與人員 */}
        {activeTab === 'settings' && (
          <div className="space-y-8">
            {/* 關鍵字與分類設定 (保持不變) */}
            <div className="grid md:grid-cols-2 gap-8">
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <h3 className="text-lg font-bold text-gray-800 mb-4">🏷️ 常用關鍵字</h3>
                <div className="flex gap-2 mb-6">
                  <input type="text" value={newKeyword} onChange={(e) => setNewKeyword(e.target.value)} placeholder="輸入新關鍵字..." className="flex-1 px-4 py-2 border rounded-lg"/>
                  <button onClick={() => { updateSettingArray('quickKeywords', 'add', newKeyword); setNewKeyword(''); }} className="bg-teal-600 text-white px-4 py-2 rounded-lg">新增</button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {settings.quickKeywords?.map((kw, idx) => (
                    <span key={idx} className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm flex items-center">
                      {kw}<button onClick={() => updateSettingArray('quickKeywords', 'remove', kw)} className="ml-2 text-gray-400 hover:text-red-500">×</button>
                    </span>
                  ))}
                </div>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <h3 className="text-lg font-bold text-gray-800 mb-4">📂 分類標籤</h3>
                <div className="flex gap-2 mb-6">
                  <input type="text" value={newCategory} onChange={(e) => setNewCategory(e.target.value)} placeholder="輸入新分類..." className="flex-1 px-4 py-2 border rounded-lg"/>
                  <button onClick={() => { updateSettingArray('categories', 'add', newCategory); setNewCategory(''); }} className="bg-blue-600 text-white px-4 py-2 rounded-lg">新增</button>
                </div>
                <div className="flex flex-col gap-2">
                  {settings.categories?.map((cat, idx) => (
                    <div key={idx} className="flex justify-between bg-blue-50 px-4 py-2 rounded-lg">
                      <span className="text-blue-800">{cat}</span>
                      <button onClick={() => updateSettingArray('categories', 'remove', cat)} className="text-red-400 hover:text-red-600 text-sm">刪除</button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 人員權限管理 */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-600" /> 人員資料與權限管理
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 text-gray-600 uppercase border-b border-gray-100">
                    <tr>
                      <th className="px-6 py-3">使用者</th>
                      <th className="px-6 py-3">到職日期</th>
                      <th className="px-6 py-3">身分權限</th>
                      <th className="px-6 py-3 text-right">管理</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {usersList.map((u) => {
                      const isTeacher = u.role === 'teacher';
                      const isSuperAdmin = SUPER_ADMIN_EMAILS.includes(u.email);
                      
                      return (
                        <tr key={u.id} className={`hover:bg-gray-50 transition-colors ${isSuperAdmin ? 'bg-indigo-50/50' : ''}`}>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2 font-medium text-gray-900">
                              <img src={u.photoURL || 'https://via.placeholder.com/32'} alt="" className="w-6 h-6 rounded-full" />
                              {u.displayName || '未命名'}
                              {isSuperAdmin && <Crown className="w-3 h-3 text-amber-500" />}
                            </div>
                            <div className="text-xs text-gray-400 mt-1">{u.email}</div>
                          </td>
                          <td className="px-6 py-4 text-gray-600 font-mono">
                            {u.arrivalDate || '-'}
                          </td>
                          <td className="px-6 py-4">
                            {isSuperAdmin ? (
                              <span className="inline-flex items-center gap-1 bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs font-bold border border-purple-200">
                                系統管理員
                              </span>
                            ) : isTeacher ? (
                              <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 px-2 py-1 rounded-full text-xs font-bold">
                                指導藥師
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-xs">
                                PGY 學員
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right">
                             <button 
                               onClick={() => openEditUser(u)}
                               className="px-3 py-1 bg-gray-100 hover:bg-indigo-50 text-indigo-600 rounded-md text-xs font-medium border border-gray-200 flex items-center gap-1 ml-auto"
                             >
                               <Edit className="w-3 h-3" /> 編輯/變更
                             </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* User Edit Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setEditingUser(null)}>
           <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
             <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
               <h3 className="text-lg font-bold text-gray-800">編輯用戶資料</h3>
               <button onClick={() => setEditingUser(null)}><X className="w-5 h-5 text-gray-400 hover:text-gray-600" /></button>
             </div>
             <form onSubmit={handleSaveUser} className="p-6 space-y-4">
               <div>
                 <label className="block text-sm font-bold text-gray-700 mb-1">Email (唯讀)</label>
                 <input type="text" value={editingUser.email} disabled className="w-full px-4 py-2 border bg-gray-100 rounded-lg text-gray-500" />
               </div>
               <div>
                 <label className="block text-sm font-bold text-gray-700 mb-1">姓名</label>
                 <input 
                   type="text" 
                   value={userForm.displayName} 
                   onChange={e => setUserForm({...userForm, displayName: e.target.value})}
                   className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                 />
               </div>
               <div>
                 <label className="block text-sm font-bold text-gray-700 mb-1">到職日期</label>
                 <input 
                   type="date" 
                   value={userForm.arrivalDate} 
                   onChange={e => setUserForm({...userForm, arrivalDate: e.target.value})}
                   className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                 />
               </div>
               <div>
                 <label className="block text-sm font-bold text-gray-700 mb-1">系統身分</label>
                 <div className="flex gap-2">
                   <button 
                     type="button"
                     onClick={() => setUserForm({...userForm, role: 'student'})}
                     className={`flex-1 py-2 rounded-lg border text-sm font-bold ${userForm.role === 'student' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200'}`}
                   >
                     PGY 學員
                   </button>
                   <button 
                     type="button"
                     onClick={() => setUserForm({...userForm, role: 'teacher'})}
                     className={`flex-1 py-2 rounded-lg border text-sm font-bold ${userForm.role === 'teacher' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-gray-600 border-gray-200'}`}
                   >
                     指導藥師
                   </button>
                 </div>
                 {SUPER_ADMIN_EMAILS.includes(editingUser.email) && (
                   <p className="text-xs text-amber-600 mt-2 font-medium flex items-center gap-1"><Crown className="w-3 h-3"/> 超級管理員帳號建議維持最高權限</p>
                 )}
               </div>
               <div className="pt-4">
                 <button type="submit" className="w-full py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700">儲存變更</button>
               </div>
             </form>
           </div>
        </div>
      )}
    </div>
  );
};

export default AdminPage;

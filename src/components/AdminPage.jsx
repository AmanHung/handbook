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
  getDocs, 
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase.js';
import AdminUploader from './AdminUploader.jsx';
import DashboardCharts from './DashboardCharts.jsx'; 
import { 
  Paperclip, ExternalLink, Users, Shield, ShieldAlert, Crown, 
  Edit, Calendar, Save, X, BarChart3, Search, Loader2, Trash2 // ★ 新增 Trash2 圖示
} from 'lucide-react';

// --- 設定超級管理員 Email ---
const SUPER_ADMIN_EMAILS = [
  'obm0304@gmail.com',
];

// ★★★ 請替換成您的 GAS 網址 ★★★
const GAS_API_URL = "https://script.google.com/macros/s/AKfycbw3-nakNBi0t3W3_-XtQmztYqq9qAj0ZOaGpXKZG41eZfhYjNfIM5xuVXwzSLa1_X3hfA/exec"; 

const AdminPage = ({ user }) => {
  const [activeTab, setActiveTab] = useState('dashboard'); 
  
  const [sops, setSops] = useState([]);
  const [videos, setVideos] = useState([]);
  const [usersList, setUsersList] = useState([]); 
  const [settings, setSettings] = useState({ quickKeywords: [], categories: [] });
  
  const [error, setError] = useState(null);
  const [editingItem, setEditingItem] = useState(null); 
  
  const [editingUser, setEditingUser] = useState(null); 
  const [userForm, setUserForm] = useState({ displayName: '', arrivalDate: '', role: 'student' });

  const [newKeyword, setNewKeyword] = useState('');
  const [newCategory, setNewCategory] = useState('');

  const [dashboardData, setDashboardData] = useState(null);
  const [loadingDashboard, setLoadingDashboard] = useState(false);
  const [selectedStudentEmail, setSelectedStudentEmail] = useState('');

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
      
      const students = list.filter(u => u.role === 'student');
      if (students.length > 0 && !selectedStudentEmail) {
        setSelectedStudentEmail(students[0].email);
      }
    });
    return () => unsubscribe();
  }, [selectedStudentEmail]);

  // 5. 讀取儀表板聚合資料
  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoadingDashboard(true);
      try {
        const res = await fetch(`${GAS_API_URL}?type=getDashboardData&studentEmail=ALL`);
        const data = await res.json();
        setDashboardData(data);
      } catch (error) {
        console.error("Dashboard fetch error:", error);
      } finally {
        setLoadingDashboard(false);
      }
    };
    fetchDashboardData();
  }, []);

  // 處理資源刪除/編輯
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

  const openEditUser = (u) => {
    setEditingUser(u);
    setUserForm({
      displayName: u.displayName || '',
      arrivalDate: u.arrivalDate || '',
      role: u.role || 'student'
    });
  };

  const handleSaveUser = async (e) => {
    e.preventDefault();
    if (!editingUser) return;
    
    if (SUPER_ADMIN_EMAILS.includes(editingUser.email) && userForm.role !== 'admin') {
       alert("超級管理員必須保留最高權限");
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

  // ★★★ [新增] 刪除用戶功能 ★★★
  const handleDeleteUser = async (u) => {
    // 1. 防護：不能刪除自己
    if (u.email === user?.email) {
      return alert("安全限制：您無法刪除自己的帳號！");
    }
    // 2. 防護：不能刪除超級管理員
    if (SUPER_ADMIN_EMAILS.includes(u.email)) {
      return alert("安全限制：無法刪除系統超級管理員！");
    }
    
    // 3. 防呆確認
    if (window.confirm(`⚠️ 警告：確定要徹底刪除用戶「${u.displayName || u.email}」嗎？\n此動作將從資料庫永久移除該帳號且無法復原！`)) {
      try {
        await deleteDoc(doc(db, 'users', u.id));
        alert("✅ 用戶已成功刪除！");
      } catch (error) {
        console.error(error);
        alert("❌ 刪除失敗：" + error.message);
      }
    }
  };

  const studentsOnly = usersList.filter(u => u.role === 'student');

  return (
    <div className="bg-gray-50 min-h-screen p-0 md:p-6">
      <div className="max-w-6xl mx-auto space-y-4 md:space-y-8">
        
        {/* Header 與 主要分頁導航 */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-4 md:p-6 md:rounded-lg shadow-sm border-b md:border-0 border-gray-100 gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-800 flex items-center gap-2">
              <Shield className="w-6 h-6 text-indigo-600" /> 後台管理中心
            </h1>
            <p className="text-gray-500 text-xs md:text-sm mt-1">
              狀態：{sops.length} SOP, {videos.length} 影片, {usersList.length} 用戶
            </p>
          </div>
          <div className="flex flex-wrap gap-2 w-full md:w-auto">
            <button 
              onClick={() => setActiveTab('dashboard')} 
              className={`flex-1 md:flex-none px-3 py-2 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-1.5 ${activeTab === 'dashboard' ? 'bg-indigo-600 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              <BarChart3 className="w-4 h-4"/> 儀表板
            </button>
            <button 
              onClick={() => setActiveTab('resources')} 
              className={`flex-1 md:flex-none px-3 py-2 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-1.5 ${activeTab === 'resources' ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              <Paperclip className="w-4 h-4"/> 資源
            </button>
            <button 
              onClick={() => setActiveTab('settings')} 
              className={`flex-1 md:flex-none px-3 py-2 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-1.5 ${activeTab === 'settings' ? 'bg-teal-600 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              <Users className="w-4 h-4"/> 參數與權限
            </button>
          </div>
        </div>

        {error && <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded text-red-700 font-bold mx-4 md:mx-0">{error}</div>}

        {/* TAB 0: 學習成效儀表板 */}
        {activeTab === 'dashboard' && (
          <div className="animate-in fade-in space-y-6 mx-4 md:mx-0">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-indigo-50 p-4 rounded-xl border border-indigo-100">
              <div>
                <h2 className="text-lg font-bold text-indigo-900 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" /> 學習成效總覽
                </h2>
                <p className="text-sm text-indigo-700 mt-1">選取學員以檢視各項臨床評估的成長軌跡與雷達圖</p>
              </div>
              
              <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-indigo-200 shadow-sm w-full sm:w-auto">
                <Users className="w-4 h-4 text-indigo-500" />
                <select 
                  value={selectedStudentEmail}
                  onChange={(e) => setSelectedStudentEmail(e.target.value)}
                  className="bg-transparent text-sm font-bold text-gray-700 outline-none w-full sm:w-48"
                >
                  <option value="" disabled>請選擇學員...</option>
                  {studentsOnly.map(s => (
                    <option key={s.email} value={s.email}>{s.displayName || s.email}</option>
                  ))}
                </select>
              </div>
            </div>

            {loadingDashboard ? (
              <div className="flex flex-col items-center justify-center py-20 text-gray-400 bg-white rounded-xl border border-gray-100">
                <Loader2 className="w-10 h-10 animate-spin mb-4 text-indigo-500" />
                <p className="font-medium">正在聚合學習數據，請稍候...</p>
              </div>
            ) : (
              <DashboardCharts 
                studentEmail={selectedStudentEmail} 
                dashboardData={dashboardData} 
              />
            )}
          </div>
        )}

        {/* TAB 1: 資源管理 (SOP / 影片) */}
        {activeTab === 'resources' && (
          <div className="space-y-4 md:space-y-8 animate-in fade-in">
            <AdminUploader 
              editData={editingItem} 
              onCancelEdit={() => setEditingItem(null)}
              onSuccess={() => setEditingItem(null)}
              settings={settings}
            />
            
            <div className="bg-white md:rounded-lg shadow-sm overflow-hidden border-t md:border-t-0 border-gray-100">
               <div className="px-4 md:px-6 py-4 border-b border-gray-100 bg-blue-50 flex justify-between items-center">
                <h3 className="font-bold text-blue-800 text-sm md:text-base flex items-center gap-2"><Paperclip className="w-4 h-4"/> SOP 文件 ({sops.length})</h3>
               </div>
               <div className="overflow-x-auto max-h-96">
                 <table className="w-full text-left text-sm whitespace-nowrap md:whitespace-normal">
                   <thead className="bg-gray-50 sticky top-0">
                     <tr><th className="px-4 md:px-6 py-3">標題</th><th className="px-4 md:px-6 py-3">分類</th><th className="px-4 md:px-6 py-3">附件</th><th className="px-4 md:px-6 py-3 text-right">操作</th></tr>
                   </thead>
                   <tbody className="divide-y divide-gray-100">
                     {sops.map(s => (
                       <tr key={s.id} className="hover:bg-gray-50">
                         <td className="px-4 md:px-6 py-4">{s.title}</td>
                         <td className="px-4 md:px-6 py-4"><span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">{s.category}</span></td>
                         <td className="px-4 md:px-6 py-4">{s.attachmentUrl ? <a href={s.attachmentUrl} target="_blank" rel="noreferrer" className="text-blue-500 flex items-center gap-1"><Paperclip className="w-3 h-3"/>連結</a> : '-'}</td>
                         <td className="px-4 md:px-6 py-4 text-right space-x-2">
                           <button onClick={() => handleEditResource(s, 'sop')} className="text-indigo-600 font-medium text-xs md:text-sm">編輯</button>
                           <button onClick={() => handleDeleteResource('sop_articles', s.id)} className="text-red-600 font-medium text-xs md:text-sm">刪除</button>
                         </td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
            </div>
            
            <div className="bg-white md:rounded-lg shadow-sm overflow-hidden border-t md:border-t-0 border-gray-100">
               <div className="px-4 md:px-6 py-4 border-b border-gray-100 bg-purple-50 flex justify-between items-center">
                <h3 className="font-bold text-purple-800 text-sm md:text-base flex items-center gap-2"><ExternalLink className="w-4 h-4"/> 教學影片 ({videos.length})</h3>
               </div>
               <div className="overflow-x-auto max-h-96">
                 <table className="w-full text-left text-sm whitespace-nowrap md:whitespace-normal">
                   <thead className="bg-gray-50 sticky top-0">
                     <tr><th className="px-4 md:px-6 py-3">標題</th><th className="px-4 md:px-6 py-3">分類</th><th className="px-4 md:px-6 py-3 text-right">操作</th></tr>
                   </thead>
                   <tbody className="divide-y divide-gray-100">
                     {videos.map(v => (
                       <tr key={v.id} className="hover:bg-gray-50">
                         <td className="px-4 md:px-6 py-4">{v.title}</td>
                         <td className="px-4 md:px-6 py-4"><span className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded-full">{v.category}</span></td>
                         <td className="px-4 md:px-6 py-4 text-right space-x-2">
                           <button onClick={() => handleEditResource(v, 'video')} className="text-indigo-600 font-medium text-xs md:text-sm">編輯</button>
                           <button onClick={() => handleDeleteResource('training_videos', v.id)} className="text-red-600 font-medium text-xs md:text-sm">刪除</button>
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
          <div className="space-y-4 md:space-y-8 animate-in fade-in mx-4 md:mx-0">
            <div className="grid md:grid-cols-2 gap-4 md:gap-8">
              {/* 常用關鍵字 */}
              <div className="bg-white p-4 md:p-6 md:rounded-lg shadow-sm border border-gray-100">
                <h3 className="text-base md:text-lg font-bold text-gray-800 mb-4">🏷️ 常用關鍵字</h3>
                <div className="flex gap-2 mb-6">
                  <input type="text" value={newKeyword} onChange={(e) => setNewKeyword(e.target.value)} placeholder="輸入新關鍵字..." className="flex-1 px-4 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-teal-500"/>
                  <button onClick={() => { updateSettingArray('quickKeywords', 'add', newKeyword); setNewKeyword(''); }} className="bg-teal-600 text-white px-3 py-2 rounded-lg text-sm whitespace-nowrap hover:bg-teal-700">新增</button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {settings.quickKeywords?.map((kw, idx) => (
                    <span key={idx} className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-xs md:text-sm flex items-center border border-gray-200">
                      {kw}<button onClick={() => updateSettingArray('quickKeywords', 'remove', kw)} className="ml-2 text-gray-400 hover:text-red-500">×</button>
                    </span>
                  ))}
                </div>
              </div>

              {/* 分類標籤 */}
              <div className="bg-white p-4 md:p-6 md:rounded-lg shadow-sm border border-gray-100">
                <h3 className="text-base md:text-lg font-bold text-gray-800 mb-4">📂 分類標籤</h3>
                <div className="flex gap-2 mb-6">
                  <input type="text" value={newCategory} onChange={(e) => setNewCategory(e.target.value)} placeholder="輸入新分類..." className="flex-1 px-4 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"/>
                  <button onClick={() => { updateSettingArray('categories', 'add', newCategory); setNewCategory(''); }} className="bg-blue-600 text-white px-3 py-2 rounded-lg text-sm whitespace-nowrap hover:bg-blue-700">新增</button>
                </div>
                <div className="flex flex-col gap-2">
                  {settings.categories?.map((cat, idx) => (
                    <div key={idx} className="flex justify-between bg-blue-50 px-3 py-2 rounded-lg text-sm border border-blue-100">
                      <span className="text-blue-800 font-medium">{cat}</span>
                      <button onClick={() => updateSettingArray('categories', 'remove', cat)} className="text-red-400 hover:text-red-600">刪除</button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 人員權限管理 */}
            <div className="bg-white p-4 md:p-6 md:rounded-lg shadow-sm border border-gray-200">
              <h3 className="text-base md:text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-600" /> 人員資料與權限管理
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap md:whitespace-normal">
                  <thead className="bg-gray-50 text-gray-600 uppercase border-b border-gray-100">
                    <tr>
                      <th className="px-4 md:px-6 py-3">使用者</th>
                      <th className="px-4 md:px-6 py-3">到職日期</th>
                      <th className="px-4 md:px-6 py-3">身分權限</th>
                      <th className="px-4 md:px-6 py-3 text-right">管理</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {usersList.map((u) => {
                      const isTeacher = u.role === 'teacher';
                      const isSuperAdmin = u.role === 'admin' || SUPER_ADMIN_EMAILS.includes(u.email);
                      // 判斷是否為不能刪除的身分
                      const isSelf = u.email === user?.email;
                      const disableDelete = isSelf || isSuperAdmin;
                      
                      return (
                        <tr key={u.id} className={`hover:bg-gray-50 transition-colors ${isSuperAdmin ? 'bg-indigo-50/30' : ''}`}>
                          <td className="px-4 md:px-6 py-4">
                            <div className="flex items-center gap-2 font-medium text-gray-900">
                              <img src={u.photoURL || 'https://via.placeholder.com/32'} alt="" className="w-6 h-6 rounded-full" />
                              {u.displayName || '未命名'}
                              {isSuperAdmin && <Crown className="w-3 h-3 text-amber-500" />}
                            </div>
                            <div className="text-xs text-gray-400 mt-1">{u.email}</div>
                          </td>
                          <td className="px-4 md:px-6 py-4 text-gray-600 font-mono">
                            {u.arrivalDate || '-'}
                          </td>
                          <td className="px-4 md:px-6 py-4">
                            {isSuperAdmin ? (
                              <span className="inline-flex items-center gap-1 bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs font-bold border border-purple-200">
                                系統管理員
                              </span>
                            ) : isTeacher ? (
                              <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 px-2 py-1 rounded-full text-xs font-bold">
                                指導藥師
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-xs border border-gray-200">
                                PGY 學員
                              </span>
                            )}
                          </td>
                          <td className="px-4 md:px-6 py-4">
                             <div className="flex justify-end gap-2">
                               <button 
                                 onClick={() => openEditUser(u)}
                                 className="px-3 py-1.5 bg-white hover:bg-indigo-50 text-indigo-600 rounded-md text-xs font-bold border border-indigo-200 flex items-center gap-1 shadow-sm"
                               >
                                 <Edit className="w-3 h-3" /> <span className="hidden sm:inline">編輯</span>
                               </button>
                               {/* ★ 新增刪除按鈕 */}
                               <button 
                                 onClick={() => handleDeleteUser(u)}
                                 disabled={disableDelete}
                                 title={isSelf ? '安全限制：無法刪除自己' : isSuperAdmin ? '安全限制：無法刪除超級管理員' : '徹底刪除此用戶'}
                                 className={`px-3 py-1.5 rounded-md text-xs font-bold border flex items-center gap-1 shadow-sm transition-colors ${
                                   disableDelete 
                                     ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed opacity-60' 
                                     : 'bg-white hover:bg-red-50 text-red-600 border-red-200'
                                 }`}
                               >
                                 <Trash2 className="w-3 h-3" /> <span className="hidden sm:inline">刪除</span>
                               </button>
                             </div>
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
                 <label className="block text-sm font-bold text-gray-700 mb-2">系統身分</label>
                 <div className="flex flex-wrap gap-2">
                   <button 
                     type="button"
                     onClick={() => setUserForm({...userForm, role: 'student'})}
                     className={`flex-1 py-2 rounded-lg border text-sm font-bold ${userForm.role === 'student' ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                   >
                     PGY 學員
                   </button>
                   <button 
                     type="button"
                     onClick={() => setUserForm({...userForm, role: 'teacher'})}
                     className={`flex-1 py-2 rounded-lg border text-sm font-bold ${userForm.role === 'teacher' ? 'bg-emerald-600 text-white border-emerald-600 shadow-md' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                   >
                     指導藥師
                   </button>
                   <button 
                     type="button"
                     onClick={() => setUserForm({...userForm, role: 'admin'})}
                     className={`flex-1 py-2 rounded-lg border text-sm font-bold ${userForm.role === 'admin' ? 'bg-purple-600 text-white border-purple-600 shadow-md' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                   >
                     管理員
                   </button>
                 </div>
                 {SUPER_ADMIN_EMAILS.includes(editingUser.email) && (
                   <p className="text-xs text-amber-600 mt-2 font-medium flex items-center gap-1"><Crown className="w-3 h-3"/> 超級管理員帳號無法降級</p>
                 )}
               </div>
               <div className="pt-4 flex gap-3">
                 <button type="button" onClick={() => setEditingUser(null)} className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-lg font-bold hover:bg-gray-200">取消</button>
                 <button type="submit" className="flex-1 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 shadow-md">儲存變更</button>
               </div>
             </form>
           </div>
        </div>
      )}
    </div>
  );
};

export default AdminPage;

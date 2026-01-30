import React, { useState, useEffect } from 'react';
import { 
  collection, 
  onSnapshot, 
  doc, 
  updateDoc, 
  arrayUnion, 
  arrayRemove, 
  deleteDoc,
  setDoc
} from 'firebase/firestore';
import { db } from '../firebase.js';
import AdminUploader from './AdminUploader.jsx';
import { Link, Paperclip, ExternalLink, Users, Shield, ShieldAlert, CheckCircle } from 'lucide-react';

const AdminPage = ({ user }) => {
  const [activeTab, setActiveTab] = useState('resources'); // resources | settings
  
  // 資料狀態
  const [sops, setSops] = useState([]);
  const [videos, setVideos] = useState([]);
  const [usersList, setUsersList] = useState([]); // 新增：用戶列表
  const [settings, setSettings] = useState({ quickKeywords: [], categories: [] });
  
  // 錯誤狀態
  const [error, setError] = useState(null);

  // 編輯狀態
  const [editingItem, setEditingItem] = useState(null);

  // 輸入狀態 (用於設定頁面)
  const [newKeyword, setNewKeyword] = useState('');
  const [newCategory, setNewCategory] = useState('');

  // 1. 監聽 SOP 資料 (集合: sop_articles)
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'sop_articles'), (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSops(list);
      setError(null);
    }, (err) => {
      console.error("SOP 讀取錯誤:", err);
      setError(`無法讀取 SOP 資料: ${err.message} (請檢查 Firebase 權限)`);
    });
    return () => unsubscribe();
  }, []);

  // 2. 監聽 Video 資料 (集合: training_videos)
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'training_videos'), (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setVideos(list);
    }, (err) => {
      console.error("影片讀取錯誤:", err);
    });
    return () => unsubscribe();
  }, []);

  // 3. 監聽 設定檔 (site_settings/sop_config)
  useEffect(() => {
    const docRef = doc(db, 'site_settings', 'sop_config');
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        setSettings(docSnap.data());
      } else {
        setDoc(docRef, { quickKeywords: [], categories: [] });
      }
    }, (err) => {
      console.error("設定檔讀取錯誤:", err);
    });
    return () => unsubscribe();
  }, []);

  // 4. 新增：監聽 用戶列表 (users) - 僅在切換到設定頁籤時運作或常駐
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'users'), (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUsersList(list);
    }, (err) => {
      console.error("用戶列表讀取錯誤:", err);
    });
    return () => unsubscribe();
  }, []);

  // 處理刪除資源
  const handleDeleteResource = async (collectionName, id) => {
    if (window.confirm('確定要刪除此項目嗎？此動作無法復原。')) {
      try {
        await deleteDoc(doc(db, collectionName, id));
        if (editingItem && editingItem.id === id) {
          setEditingItem(null);
        }
      } catch (error) {
        console.error("Error removing document: ", error);
        alert('刪除失敗');
      }
    }
  };

  // 處理進入編輯模式
  const handleEditResource = (item, type) => {
    setEditingItem({ ...item, type });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // 處理參數設定更新 (關鍵字/分類)
  const updateSettingArray = async (field, action, value) => {
    if (!value.trim()) return;
    const docRef = doc(db, 'site_settings', 'sop_config');
    try {
      if (action === 'add') {
        if (settings[field]?.includes(value)) {
          alert('此項目已存在');
          return;
        }
        await updateDoc(docRef, { [field]: arrayUnion(value) });
      } else if (action === 'remove') {
        if (window.confirm(`確定要移除 "${value}" 嗎？`)) {
          await updateDoc(docRef, { [field]: arrayRemove(value) });
        }
      }
    } catch (error) {
      console.error(`Error updating ${field}:`, error);
      alert('更新設定失敗: ' + error.message);
    }
  };

  // 新增：切換用戶身分
  const toggleUserRole = async (targetUserId, currentRole) => {
    const newRole = currentRole === 'teacher' ? 'student' : 'teacher';
    const roleName = newRole === 'teacher' ? '指導藥師' : 'PGY 學員';
    
    if (window.confirm(`確定要將此用戶身分更改為「${roleName}」嗎？`)) {
      try {
        await updateDoc(doc(db, 'users', targetUserId), { role: newRole });
      } catch (error) {
        console.error("更新身分失敗:", error);
        alert("更新失敗，請檢查權限");
      }
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
              目前資料庫狀態：{sops.length} 份 SOP, {videos.length} 部影片
            </p>
          </div>
          <div className="space-x-2">
            <button
              onClick={() => setActiveTab('resources')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'resources' ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-100 text-gray-600'
              }`}
            >
              資源管理
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'settings' ? 'bg-teal-600 text-white shadow-md' : 'bg-gray-100 text-gray-600'
              }`}
            >
              參數設定
            </button>
          </div>
        </div>

        {/* 錯誤提示 */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded text-red-700 font-bold">
            {error}
          </div>
        )}

        {/* --- TAB 1: 資源管理 --- */}
        {activeTab === 'resources' && (
          <div className="space-y-8">
            <AdminUploader 
              editData={editingItem} 
              onCancelEdit={() => setEditingItem(null)}
              onSuccess={() => setEditingItem(null)}
              settings={settings}
            />

            {/* SOP 列表 */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 bg-blue-50 flex justify-between items-center">
                <h3 className="font-bold text-blue-800 flex items-center">
                  <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                  SOP 文件 ({sops.length})
                </h3>
              </div>
              <div className="overflow-x-auto max-h-96 overflow-y-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 text-gray-600 uppercase sticky top-0">
                    <tr>
                      <th className="px-6 py-3">標題</th>
                      <th className="px-6 py-3">分類</th>
                      <th className="px-6 py-3">附件</th>
                      <th className="px-6 py-3">更新時間</th>
                      <th className="px-6 py-3 text-right">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {sops.map((sop) => (
                      <tr key={sop.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 font-medium text-gray-900">
                          {sop.title}
                          <div className="flex gap-1 mt-1">
                            {sop.keywords?.map((k, i) => (
                              <span key={i} className="text-[10px] text-gray-400 bg-gray-100 px-1 rounded">#{k}</span>
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                            {sop.category}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {sop.attachmentUrl ? (
                            <a 
                              href={sop.attachmentUrl} 
                              target="_blank" 
                              rel="noreferrer"
                              className="text-blue-500 hover:text-blue-700 flex items-center gap-1"
                              title="開啟附件"
                            >
                              <Paperclip className="w-4 h-4" /> 連結
                            </a>
                          ) : (
                            <span className="text-gray-300">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-gray-400 text-xs">
                          {sop.updatedAt?.seconds ? new Date(sop.updatedAt.seconds * 1000).toLocaleDateString() : 'N/A'}
                        </td>
                        <td className="px-6 py-4 text-right space-x-2">
                          <button onClick={() => handleEditResource(sop, 'sop')} className="text-indigo-600 hover:text-indigo-900 font-medium">編輯</button>
                          <button onClick={() => handleDeleteResource('sop_articles', sop.id)} className="text-red-600 hover:text-red-900 font-medium">刪除</button>
                        </td>
                      </tr>
                    ))}
                    {sops.length === 0 && (
                      <tr>
                        <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                          目前沒有 SOP 資料，請使用上方表單新增。
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Video 列表 */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 bg-purple-50 flex justify-between items-center">
                <h3 className="font-bold text-purple-800 flex items-center">
                  <span className="w-2 h-2 bg-purple-500 rounded-full mr-2"></span>
                  教學影片 ({videos.length})
                </h3>
              </div>
              <div className="overflow-x-auto max-h-96 overflow-y-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 text-gray-600 uppercase sticky top-0">
                    <tr>
                      <th className="px-6 py-3">影片標題</th>
                      <th className="px-6 py-3">分類</th>
                      <th className="px-6 py-3 text-right">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {videos.map((vid) => (
                      <tr key={vid.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 font-medium text-gray-900">
                          {vid.title}
                          <a href={vid.url} target="_blank" rel="noreferrer" className="ml-2 text-gray-400 hover:text-purple-600 inline-block">
                             <ExternalLink className="w-3 h-3" />
                          </a>
                        </td>
                        <td className="px-6 py-4">
                          <span className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded-full">{vid.category}</span>
                        </td>
                        <td className="px-6 py-4 text-right space-x-2">
                          <button onClick={() => handleEditResource(vid, 'video')} className="text-indigo-600 hover:text-indigo-900 font-medium">編輯</button>
                          <button onClick={() => handleDeleteResource('training_videos', vid.id)} className="text-red-600 hover:text-red-900 font-medium">刪除</button>
                        </td>
                      </tr>
                    ))}
                    {videos.length === 0 && (
                      <tr>
                        <td colSpan="3" className="px-6 py-8 text-center text-gray-500">
                          目前沒有影片資料，請使用上方表單新增。
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* --- TAB 2: 參數設定 --- */}
        {activeTab === 'settings' && (
          <div className="space-y-8">
            <div className="grid md:grid-cols-2 gap-8">
              {/* 常用關鍵字 */}
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <h3 className="text-lg font-bold text-gray-800 mb-4">🏷️ 常用關鍵字</h3>
                <div className="flex gap-2 mb-6">
                  <input 
                    type="text" value={newKeyword} onChange={(e) => setNewKeyword(e.target.value)}
                    placeholder="輸入新關鍵字..." className="flex-1 px-4 py-2 border rounded-lg"
                  />
                  <button onClick={() => { updateSettingArray('quickKeywords', 'add', newKeyword); setNewKeyword(''); }} className="bg-teal-600 text-white px-4 py-2 rounded-lg">新增</button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {settings.quickKeywords?.map((kw, idx) => (
                    <span key={idx} className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm flex items-center">
                      {kw}
                      <button onClick={() => updateSettingArray('quickKeywords', 'remove', kw)} className="ml-2 text-gray-400 hover:text-red-500">×</button>
                    </span>
                  ))}
                </div>
              </div>

              {/* 分類標籤 */}
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <h3 className="text-lg font-bold text-gray-800 mb-4">📂 分類標籤</h3>
                <div className="flex gap-2 mb-6">
                  <input 
                    type="text" value={newCategory} onChange={(e) => setNewCategory(e.target.value)}
                    placeholder="輸入新分類..." className="flex-1 px-4 py-2 border rounded-lg"
                  />
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

            {/* --- 新增區塊：人員權限管理 --- */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-600" />
                人員權限管理 (指導藥師/學員)
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 text-gray-600 uppercase border-b border-gray-100">
                    <tr>
                      <th className="px-6 py-3">使用者名稱</th>
                      <th className="px-6 py-3">Email</th>
                      <th className="px-6 py-3">目前身分</th>
                      <th className="px-6 py-3">加入時間</th>
                      <th className="px-6 py-3 text-right">權限操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {usersList.map((u) => {
                      const isTeacher = u.role === 'teacher';
                      const isSelf = u.id === user?.uid;
                      
                      return (
                        <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 font-medium text-gray-900 flex items-center gap-2">
                            <img src={u.photoURL || 'https://via.placeholder.com/32'} alt="" className="w-6 h-6 rounded-full" />
                            {u.displayName || '未命名用戶'}
                            {isSelf && <span className="text-[10px] bg-indigo-100 text-indigo-600 px-1 rounded">你自己</span>}
                          </td>
                          <td className="px-6 py-4 text-gray-500">{u.email}</td>
                          <td className="px-6 py-4">
                            {isTeacher ? (
                              <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 px-2 py-1 rounded-full text-xs font-bold">
                                <Shield className="w-3 h-3" /> 指導藥師
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-xs">
                                <Users className="w-3 h-3" /> PGY 學員
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-gray-400 text-xs">
                             {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'N/A'}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={() => toggleUserRole(u.id, u.role)}
                              disabled={isSelf} // 防止自己降級自己
                              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                                isSelf 
                                  ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
                                  : isTeacher
                                    ? 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200'
                                    : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200'
                              }`}
                            >
                              {isTeacher ? '降級為學員' : '升級為藥師'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p className="mt-4 text-xs text-gray-400 flex items-center gap-1">
                <ShieldAlert className="w-3 h-3" /> 
                注意：只有「指導藥師」身分可以進入後台管理系統。請謹慎設定。
              </p>
            </div>
            {/* --- 結束 人員權限管理 --- */}

          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPage;

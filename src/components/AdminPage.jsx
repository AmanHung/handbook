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
  getDoc
} from 'firebase/firestore';
// 加入 .js 副檔名以確保路徑解析正確
import { db } from '../firebase.js';
// 加入 .jsx 副檔名以確保路徑解析正確
import AdminUploader from './AdminUploader.jsx';

const AdminPage = () => {
  const [activeTab, setActiveTab] = useState('resources'); // resources | settings
  
  // 資料狀態
  const [sops, setSops] = useState([]);
  const [videos, setVideos] = useState([]);
  const [settings, setSettings] = useState({ keywords: [], categories: [] });
  
  // 編輯狀態
  const [editingItem, setEditingItem] = useState(null);

  // 輸入狀態 (用於設定頁面)
  const [newKeyword, setNewKeyword] = useState('');
  const [newCategory, setNewCategory] = useState('');

  // 1. 監聽 SOP 資料
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'sops'), (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSops(list);
    });
    return () => unsubscribe();
  }, []);

  // 2. 監聽 Video 資料
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'videos'), (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setVideos(list);
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
        // 如果文件不存在，初始化它 (避免錯誤)
        setDoc(docRef, { keywords: [], categories: [] });
      }
    });
    return () => unsubscribe();
  }, []);

  // 處理刪除資源
  const handleDeleteResource = async (collectionName, id) => {
    if (window.confirm('確定要刪除此項目嗎？此動作無法復原。')) {
      try {
        await deleteDoc(doc(db, collectionName, id));
        alert('刪除成功');
        // 如果正在編輯這個項目，取消編輯狀態
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
    setEditingItem({ ...item, type }); // type: 'sop' or 'video'
    window.scrollTo({ top: 0, behavior: 'smooth' }); // 滾動到上方編輯器
  };

  // 處理參數設定更新 (新增/刪除 標籤或分類)
  const updateSettingArray = async (field, action, value) => {
    if (!value.trim()) return;
    
    const docRef = doc(db, 'site_settings', 'sop_config');
    try {
      if (action === 'add') {
        // 檢查是否重複
        if (settings[field]?.includes(value)) {
          alert('此項目已存在');
          return;
        }
        await updateDoc(docRef, {
          [field]: arrayUnion(value)
        });
      } else if (action === 'remove') {
        if (window.confirm(`確定要移除 "${value}" 嗎？`)) {
          await updateDoc(docRef, {
            [field]: arrayRemove(value)
          });
        }
      }
    } catch (error) {
      console.error(`Error updating ${field}:`, error);
      alert('更新設定失敗，請確認資料庫權限');
    }
  };

  return (
    <div className="bg-gray-50 min-h-screen p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex justify-between items-center bg-white p-6 rounded-lg shadow-sm">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">藥局後台管理系統</h1>
            <p className="text-gray-500 text-sm mt-1">SOP維護 / 影音教學 / 參數設定</p>
          </div>
          <div className="space-x-2">
            <button
              onClick={() => setActiveTab('resources')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'resources' 
                  ? 'bg-blue-600 text-white shadow-md' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              資源管理
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'settings' 
                  ? 'bg-teal-600 text-white shadow-md' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              參數設定
            </button>
          </div>
        </div>

        {/* --- TAB 1: 資源管理 --- */}
        {activeTab === 'resources' && (
          <div className="space-y-8">
            {/* 上傳/編輯區塊 */}
            <AdminUploader 
              editData={editingItem} 
              onCancelEdit={() => setEditingItem(null)}
              onSuccess={() => setEditingItem(null)}
            />

            {/* SOP 列表 */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 bg-blue-50">
                <h3 className="font-bold text-blue-800 flex items-center">
                  <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                  目前已上架 SOP 文件 ({sops.length})
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 text-gray-600 uppercase">
                    <tr>
                      <th className="px-6 py-3">標題</th>
                      <th className="px-6 py-3">分類</th>
                      <th className="px-6 py-3">關鍵字</th>
                      <th className="px-6 py-3">更新時間</th>
                      <th className="px-6 py-3 text-right">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {sops.map((sop) => (
                      <tr key={sop.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 font-medium text-gray-900">{sop.title}</td>
                        <td className="px-6 py-4">
                          <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                            {sop.category}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-gray-500">
                          {sop.keywords?.join(', ')}
                        </td>
                        <td className="px-6 py-4 text-gray-400 text-xs">
                          {sop.updatedAt?.seconds 
                            ? new Date(sop.updatedAt.seconds * 1000).toLocaleDateString() 
                            : 'N/A'}
                        </td>
                        <td className="px-6 py-4 text-right space-x-2">
                          <button 
                            onClick={() => handleEditResource(sop, 'sop')}
                            className="text-indigo-600 hover:text-indigo-900 font-medium"
                          >
                            編輯
                          </button>
                          <button 
                            onClick={() => handleDeleteResource('sops', sop.id)}
                            className="text-red-600 hover:text-red-900 font-medium"
                          >
                            刪除
                          </button>
                        </td>
                      </tr>
                    ))}
                    {sops.length === 0 && (
                      <tr>
                        <td colSpan="5" className="px-6 py-8 text-center text-gray-500">目前沒有 SOP 資料</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Video 列表 */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 bg-purple-50">
                <h3 className="font-bold text-purple-800 flex items-center">
                  <span className="w-2 h-2 bg-purple-500 rounded-full mr-2"></span>
                  目前已上架教學影片 ({videos.length})
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 text-gray-600 uppercase">
                    <tr>
                      <th className="px-6 py-3">影片標題</th>
                      <th className="px-6 py-3">分類</th>
                      <th className="px-6 py-3">影片連結</th>
                      <th className="px-6 py-3 text-right">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {videos.map((vid) => (
                      <tr key={vid.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 font-medium text-gray-900">{vid.title}</td>
                        <td className="px-6 py-4">
                          <span className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded-full">
                            {vid.category}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-gray-500 truncate max-w-xs">
                          <a href={vid.url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                            開啟連結
                          </a>
                        </td>
                        <td className="px-6 py-4 text-right space-x-2">
                          <button 
                            onClick={() => handleEditResource(vid, 'video')}
                            className="text-indigo-600 hover:text-indigo-900 font-medium"
                          >
                            編輯
                          </button>
                          <button 
                            onClick={() => handleDeleteResource('videos', vid.id)}
                            className="text-red-600 hover:text-red-900 font-medium"
                          >
                            刪除
                          </button>
                        </td>
                      </tr>
                    ))}
                    {videos.length === 0 && (
                      <tr>
                        <td colSpan="4" className="px-6 py-8 text-center text-gray-500">目前沒有影片資料</td>
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
          <div className="grid md:grid-cols-2 gap-8">
            {/* 常用關鍵字設定 */}
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                <span className="text-2xl mr-2">🏷️</span> 常用關鍵字管理
              </h3>
              <p className="text-gray-500 text-sm mb-4">這些關鍵字會出現在上傳頁面供快速選擇，也會用於搜尋建議。</p>
              
              <div className="flex gap-2 mb-6">
                <input 
                  type="text" 
                  value={newKeyword}
                  onChange={(e) => setNewKeyword(e.target.value)}
                  placeholder="輸入新關鍵字..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
                  onKeyPress={(e) => e.key === 'Enter' && (updateSettingArray('keywords', 'add', newKeyword), setNewKeyword(''))}
                />
                <button 
                  onClick={() => { updateSettingArray('keywords', 'add', newKeyword); setNewKeyword(''); }}
                  className="bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 font-medium"
                >
                  新增
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                {settings.keywords?.map((kw, idx) => (
                  <span key={idx} className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm flex items-center group">
                    {kw}
                    <button 
                      onClick={() => updateSettingArray('keywords', 'remove', kw)}
                      className="ml-2 text-gray-400 hover:text-red-500 font-bold px-1 rounded"
                    >
                      ×
                    </button>
                  </span>
                ))}
                {settings.keywords?.length === 0 && <span className="text-gray-400 text-sm">尚無關鍵字</span>}
              </div>
            </div>

            {/* 分類標籤設定 */}
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                <span className="text-2xl mr-2">📂</span> 分類標籤管理
              </h3>
              <p className="text-gray-500 text-sm mb-4">設定 SOP 與影片的主要分類，如：行政、臨床、調劑台等。</p>
              
              <div className="flex gap-2 mb-6">
                <input 
                  type="text" 
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  placeholder="輸入新分類..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  onKeyPress={(e) => e.key === 'Enter' && (updateSettingArray('categories', 'add', newCategory), setNewCategory(''))}
                />
                <button 
                  onClick={() => { updateSettingArray('categories', 'add', newCategory); setNewCategory(''); }}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium"
                >
                  新增
                </button>
              </div>

              <div className="flex flex-col gap-2">
                {settings.categories?.map((cat, idx) => (
                  <div key={idx} className="flex justify-between items-center bg-blue-50 px-4 py-2 rounded-lg border border-blue-100">
                    <span className="font-medium text-blue-800">{cat}</span>
                    <button 
                      onClick={() => updateSettingArray('categories', 'remove', cat)}
                      className="text-red-400 hover:text-red-600 text-sm font-medium px-2 py-1 rounded hover:bg-red-50"
                    >
                      刪除
                    </button>
                  </div>
                ))}
                {settings.categories?.length === 0 && <span className="text-gray-400 text-sm">尚無分類</span>}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPage;

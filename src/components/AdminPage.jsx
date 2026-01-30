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
  writeBatch,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase.js';
import AdminUploader from './AdminUploader.jsx';

// 引入原始靜態資料 (用於初始化/匯入)
import { sopData } from '../data/sopData.jsx'; 
import { trainingData } from '../data/trainingData.jsx';

const AdminPage = ({ user }) => {
  const [activeTab, setActiveTab] = useState('resources'); // resources | settings | migration
  
  // 資料狀態
  const [sops, setSops] = useState([]);
  const [videos, setVideos] = useState([]);
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
        // 如果文件不存在，初始化它
        setDoc(docRef, { quickKeywords: [], categories: [] });
      }
    }, (err) => {
      console.error("設定檔讀取錯誤:", err);
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

  // 處理參數設定更新
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
      alert('更新設定失敗');
    }
  };

  // --- 資料匯入功能 ---
  const handleImportDefaults = async () => {
    if (!window.confirm('確定要將靜態檔案資料匯入 Firebase 嗎？\n這將會新增多筆資料到資料庫中。')) return;
    
    const batch = writeBatch(db);
    let count = 0;

    try {
      // 1. 匯入 SOPs
      const sopsToImport = Array.isArray(sopData) ? sopData : []; 
      sopsToImport.forEach(item => {
        const docRef = doc(collection(db, 'sop_articles'));
        batch.set(docRef, {
          title: item.title || '未命名 SOP',
          category: item.category || '未分類',
          content: item.content || '',
          keywords: item.keywords || [],
          updatedAt: serverTimestamp(),
          createdAt: serverTimestamp()
        });
        count++;
      });

      // 2. 匯入 Videos
      const videoList = [];
      if (Array.isArray(trainingData)) {
        trainingData.forEach(catGroup => {
          if (catGroup.videos && Array.isArray(catGroup.videos)) {
            catGroup.videos.forEach(v => {
              videoList.push({
                ...v,
                category: catGroup.category || '一般教學'
              });
            });
          }
        });
      }
      
      videoList.forEach(item => {
        const docRef = doc(collection(db, 'training_videos'));
        batch.set(docRef, {
          title: item.title || '未命名影片',
          url: item.url || '',
          category: item.category || '一般教學',
          description: item.description || '',
          updatedAt: serverTimestamp(),
          createdAt: serverTimestamp()
        });
        count++;
      });

      if (count > 0) {
        await batch.commit();
        alert(`成功匯入 ${count} 筆資料！`);
      } else {
        alert('未找到可匯入的資料，請檢查 src/data/ 檔案結構。');
      }

    } catch (error) {
      console.error("Import error:", error);
      alert('匯入失敗：' + error.message);
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

        {/* 提示：如果資料庫是空的 */}
        {(sops.length === 0 && videos.length === 0 && !error) && (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded shadow-sm flex justify-between items-center">
            <div className="flex">
              <div className="ml-3">
                <p className="text-sm text-yellow-700">
                  資料庫目前沒有內容。若您是第一次使用，請點擊右側按鈕匯入預設資料。
                </p>
              </div>
            </div>
            <button 
              onClick={handleImportDefaults}
              className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow transition-colors"
            >
              一鍵匯入預設資料
            </button>
          </div>
        )}

        {/* --- TAB 1: 資源管理 --- */}
        {activeTab === 'resources' && (
          <div className="space-y-8">
            {/* 修正重點：將 settings 傳入子元件，確保同步 */}
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
                        <td className="px-6 py-4 text-gray-400 text-xs">
                          {sop.updatedAt?.seconds ? new Date(sop.updatedAt.seconds * 1000).toLocaleDateString() : 'N/A'}
                        </td>
                        <td className="px-6 py-4 text-right space-x-2">
                          <button onClick={() => handleEditResource(sop, 'sop')} className="text-indigo-600 hover:text-indigo-900 font-medium">編輯</button>
                          <button onClick={() => handleDeleteResource('sop_articles', sop.id)} className="text-red-600 hover:text-red-900 font-medium">刪除</button>
                        </td>
                      </tr>
                    ))}
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
                        <td className="px-6 py-4 font-medium text-gray-900">{vid.title}</td>
                        <td className="px-6 py-4">
                          <span className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded-full">{vid.category}</span>
                        </td>
                        <td className="px-6 py-4 text-right space-x-2">
                          <button onClick={() => handleEditResource(vid, 'video')} className="text-indigo-600 hover:text-indigo-900 font-medium">編輯</button>
                          <button onClick={() => handleDeleteResource('training_videos', vid.id)} className="text-red-600 hover:text-red-900 font-medium">刪除</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* --- TAB 2: 參數設定 --- */}
        {activeTab === 'settings' && (
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
        )}
      </div>
    </div>
  );
};

export default AdminPage;

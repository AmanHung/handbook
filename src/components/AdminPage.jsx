import React, { useState, useEffect } from 'react';
import { 
  Shield, Users, FileText, Search, UserCheck, UserX, Trash2, Video, Database, Settings, Plus, Edit, X, Save
} from 'lucide-react';
import { db } from '../firebase';
import { collection, getDocs, doc, updateDoc, deleteDoc, onSnapshot, query, getDoc, setDoc } from 'firebase/firestore';
import AdminUploader from './AdminUploader';

const AdminPage = ({ user }) => {
  const [activeTab, setActiveTab] = useState('resources'); // 'users' | 'resources' | 'settings'
  
  // 資源管理狀態
  const [resourceType, setResourceType] = useState('sop'); // 'sop' | 'video'
  const [resources, setResources] = useState([]);
  const [isEditing, setIsEditing] = useState(false); // 是否正在編輯/新增
  const [editItem, setEditItem] = useState(null); // 正在編輯的項目 (null = 新增)

  // 設定管理狀態
  const [settings, setSettings] = useState({ quickKeywords: [], categories: [] });
  const [newKeyword, setNewKeyword] = useState('');
  const [newCategory, setNewCategory] = useState('');

  // 使用者管理狀態
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  // 1. 監聽資源列表 (SOP / Video)
  useEffect(() => {
    if (activeTab === 'resources') {
      const collectionName = resourceType === 'sop' ? 'sop_articles' : 'training_videos';
      const q = query(collection(db, collectionName));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        // 簡單排序：依照建立時間 (若有)
        list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
        setResources(list);
      });
      return () => unsubscribe();
    }
  }, [activeTab, resourceType]);

  // 2. 讀取設定 (Settings Tab)
  useEffect(() => {
    if (activeTab === 'settings') {
      const fetchSettings = async () => {
        try {
          const docRef = doc(db, "site_settings", "sop_config");
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setSettings(docSnap.data());
          }
        } catch (e) {
          console.error("讀取設定失敗", e);
        }
      };
      fetchSettings();
    }
  }, [activeTab]);

  // 3. 讀取使用者 (Users Tab)
  useEffect(() => {
    if (activeTab === 'users') {
      const fetchUsers = async () => {
        const querySnapshot = await getDocs(collection(db, 'users'));
        const userList = [];
        querySnapshot.forEach((doc) => {
          userList.push({ uid: doc.id, ...doc.data() });
        });
        setUsers(userList);
      };
      fetchUsers();
    }
  }, [activeTab]);

  // --- 操作邏輯 ---

  // 刪除資源
  const handleDeleteResource = async (id, title) => {
    if (!window.confirm(`確定要刪除「${title}」嗎？無法復原。`)) return;
    try {
      const collectionName = resourceType === 'sop' ? 'sop_articles' : 'training_videos';
      await deleteDoc(doc(db, collectionName, id));
    } catch (e) {
      alert("刪除失敗: " + e.message);
    }
  };

  // 儲存設定 (關鍵字/分類)
  const saveSettings = async (newSettings) => {
    try {
      await setDoc(doc(db, "site_settings", "sop_config"), newSettings, { merge: true });
      setSettings(newSettings);
    } catch (e) {
      alert("儲存失敗: " + e.message);
    }
  };

  const addSettingItem = (key, value, setter) => {
    if (!value.trim()) return;
    const currentList = settings[key] || [];
    if (!currentList.includes(value.trim())) {
      saveSettings({ ...settings, [key]: [...currentList, value.trim()] });
    }
    setter('');
  };

  const removeSettingItem = (key, itemToRemove) => {
    const currentList = settings[key] || [];
    saveSettings({ ...settings, [key]: currentList.filter(i => i !== itemToRemove) });
  };

  // 修改權限
  const handleRoleChange = async (targetUser, newRole) => {
    if (window.confirm(`確定修改權限？`)) {
        await updateDoc(doc(db, 'users', targetUser.uid), { role: newRole });
        setUsers(users.map(u => u.uid === targetUser.uid ? { ...u, role: newRole } : u));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Tabs */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 flex flex-wrap justify-between items-center gap-4">
        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <Shield className="w-6 h-6 text-indigo-600" /> 後台管理
        </h2>
        <div className="flex bg-gray-100 p-1 rounded-lg">
          {[
            { id: 'users', label: '人員', icon: Users },
            { id: 'resources', label: '資源管理', icon: Database },
            { id: 'settings', label: '參數設定', icon: Settings },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setIsEditing(false); }}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
                activeTab === tab.id ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <tab.icon className="w-4 h-4" /> {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content: 資源管理 (SOP/Video) */}
      {activeTab === 'resources' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 左側列表 */}
          <div className={`lg:col-span-${isEditing ? '2' : '3'} space-y-4 transition-all`}>
            <div className="flex justify-between items-center bg-white p-4 rounded-lg shadow-sm border border-gray-100">
              <div className="flex gap-2">
                <button 
                    onClick={() => { setResourceType('sop'); setIsEditing(false); }}
                    className={`px-4 py-2 rounded-lg text-sm font-bold border transition-colors ${resourceType === 'sop' ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-gray-200 text-gray-600'}`}
                >
                    SOP 文件
                </button>
                <button 
                    onClick={() => { setResourceType('video'); setIsEditing(false); }}
                    className={`px-4 py-2 rounded-lg text-sm font-bold border transition-colors ${resourceType === 'video' ? 'bg-pink-50 border-pink-200 text-pink-700' : 'bg-white border-gray-200 text-gray-600'}`}
                >
                    教學影片
                </button>
              </div>
              <button 
                onClick={() => { setIsEditing(true); setEditItem(null); }}
                className="flex items-center gap-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
              >
                <Plus className="w-4 h-4" /> 新增
              </button>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
                <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
                    {resources.length === 0 ? (
                        <div className="p-8 text-center text-gray-400">目前尚無資料</div>
                    ) : resources.map(res => (
                        <div key={res.id} className="p-4 flex items-center justify-between hover:bg-gray-50 group">
                            <div className="flex-1 min-w-0 mr-4">
                                <h4 className="font-bold text-gray-800 truncate">{res.title}</h4>
                                <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                                    {resourceType === 'sop' && <span className="bg-gray-100 px-2 py-0.5 rounded">{res.category || '未分類'}</span>}
                                    <span>{new Date(res.createdAt).toLocaleDateString()}</span>
                                </div>
                            </div>
                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button 
                                    onClick={() => { setIsEditing(true); setEditItem(res); }}
                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded" title="編輯"
                                >
                                    <Edit className="w-4 h-4" />
                                </button>
                                <button 
                                    onClick={() => handleDeleteResource(res.id, res.title)}
                                    className="p-2 text-red-600 hover:bg-red-50 rounded" title="刪除"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
          </div>

          {/* 右側編輯器 (當 isEditing 為 true 時顯示) */}
          {isEditing && (
            <div className="lg:col-span-1 animate-fade-in-right">
                <AdminUploader 
                    type={resourceType}
                    editData={editItem}
                    onSuccess={() => setIsEditing(false)}
                    onCancel={() => setIsEditing(false)}
                />
            </div>
          )}
        </div>
      )}

      {/* Content: 參數設定 (Settings) */}
      {activeTab === 'settings' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 關鍵字設定 */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <Search className="w-5 h-5 text-indigo-600" /> 常用搜尋關鍵字
                </h3>
                <div className="flex gap-2 mb-4">
                    <input 
                        value={newKeyword}
                        onChange={e => setNewKeyword(e.target.value)}
                        placeholder="輸入關鍵字..."
                        className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm"
                    />
                    <button 
                        onClick={() => addSettingItem('quickKeywords', newKeyword, setNewKeyword)}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm"
                    >
                        新增
                    </button>
                </div>
                <div className="flex flex-wrap gap-2">
                    {(settings.quickKeywords || []).map(kw => (
                        <span key={kw} className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm flex items-center gap-1">
                            {kw}
                            <button onClick={() => removeSettingItem('quickKeywords', kw)} className="hover:text-red-500"><X className="w-3 h-3" /></button>
                        </span>
                    ))}
                </div>
            </div>

            {/* SOP 分類設定 */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-emerald-600" /> SOP 分類標籤
                </h3>
                <div className="flex gap-2 mb-4">
                    <input 
                        value={newCategory}
                        onChange={e => setNewCategory(e.target.value)}
                        placeholder="輸入新分類..."
                        className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm"
                    />
                    <button 
                        onClick={() => addSettingItem('categories', newCategory, setNewCategory)}
                        className="px-4 py-2 bg-emerald-600 text-white rounded-md text-sm"
                    >
                        新增
                    </button>
                </div>
                <div className="flex flex-wrap gap-2">
                    {(settings.categories || []).map(cat => (
                        <span key={cat} className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-sm flex items-center gap-1 border border-emerald-100">
                            {cat}
                            <button onClick={() => removeSettingItem('categories', cat)} className="hover:text-red-500"><X className="w-3 h-3" /></button>
                        </span>
                    ))}
                </div>
            </div>
        </div>
      )}

      {/* Content: 人員管理 (Users) */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-100 bg-gray-50">
                <input
                    type="text"
                    placeholder="搜尋人員..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-lg text-sm"
                />
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 text-gray-500">
                        <tr><th className="p-4">人員</th><th className="p-4">身分</th><th className="p-4 text-right">操作</th></tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {users.filter(u => u.displayName?.includes(searchTerm) || u.email?.includes(searchTerm)).map(u => (
                            <tr key={u.uid}>
                                <td className="p-4 flex items-center gap-3">
                                    <img src={u.photoURL} className="w-8 h-8 rounded-full bg-gray-200" />
                                    <div><div className="font-bold">{u.displayName}</div><div className="text-gray-500 text-xs">{u.email}</div></div>
                                </td>
                                <td className="p-4">
                                    <span className={`px-2 py-1 rounded text-xs ${u.role === 'teacher' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100'}`}>
                                        {u.role === 'teacher' ? '指導藥師' : '學員'}
                                    </span>
                                </td>
                                <td className="p-4 text-right">
                                    {u.uid !== user.uid && (
                                        <button onClick={() => handleRoleChange(u, u.role === 'teacher' ? 'student' : 'teacher')} className="text-blue-600 hover:underline">
                                            變更權限
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
      )}
    </div>
  );
};

export default AdminPage;

// src/components/SOPManager.jsx
import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, getDoc, setDoc } from 'firebase/firestore';
import { Edit, Trash2, Plus, Save, X, Loader2, Settings, List } from 'lucide-react';

export default function SOPManager() {
  const [activeTab, setActiveTab] = useState('list'); // 'list' or 'settings'
  const [sops, setSops] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // 系統設定 (分類與關鍵字)
  const [config, setConfig] = useState({
    categories: ['行政流程', '調劑規範', '系統操作', '法規', '臨床知識', '其他'], // 預設值
    quickKeywords: ['管制藥', '磨粉', '退藥', '急救車'] // 預設值
  });

  // 編輯模式狀態
  const [isEditing, setIsEditing] = useState(false);
  const [currentSop, setCurrentSop] = useState(null);

  // 1. 初始化讀取
  const fetchData = async () => {
    setLoading(true);
    try {
      // 讀取 SOP
      const sopSnapshot = await getDocs(collection(db, "sop_articles"));
      const sopDocs = sopSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSops(sopDocs.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));

      // 讀取系統設定 (分類與關鍵字)
      const configRef = doc(db, "site_settings", "sop_config");
      const configSnap = await getDoc(configRef);
      if (configSnap.exists()) {
        setConfig(configSnap.data());
      } else {
        // 如果沒有設定檔，建立預設的
        await setDoc(configRef, config);
      }
    } catch (error) {
      console.error("讀取錯誤:", error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  // 2. 開啟 SOP 編輯/新增視窗
  const openEditor = (sop = null) => {
    if (sop) {
      setCurrentSop({ ...sop, keywordsString: sop.keywords ? sop.keywords.join(', ') : '' });
    } else {
      // 使用動態分類的第一個作為預設
      setCurrentSop({ 
        title: '', 
        category: config.categories[0] || '未分類', 
        content: '', 
        keywordsString: '' 
      });
    }
    setIsEditing(true);
  };

  // 3. 儲存 SOP
  const handleSaveSop = async () => {
    if (!currentSop.title || !currentSop.content) return alert("標題與內容為必填！");
    setLoading(true);
    try {
      const dataToSave = {
        title: currentSop.title,
        category: currentSop.category,
        content: currentSop.content,
        keywords: currentSop.keywordsString.split(/[,，]/).map(k => k.trim()).filter(k => k),
        updatedAt: new Date()
      };

      if (currentSop.id) {
        await updateDoc(doc(db, "sop_articles", currentSop.id), dataToSave);
      } else {
        await addDoc(collection(db, "sop_articles"), { ...dataToSave, createdAt: new Date() });
      }
      setIsEditing(false);
      setCurrentSop(null);
      await fetchData(); 
    } catch (e) {
      alert("儲存失敗: " + e.message);
    }
    setLoading(false);
  };

  // 4. 儲存系統設定 (新增/刪除分類或關鍵字)
  const handleUpdateConfig = async (key, newValue) => {
    const newConfig = { ...config, [key]: newValue };
    setConfig(newConfig);
    try {
      await setDoc(doc(db, "site_settings", "sop_config"), newConfig);
    } catch (e) {
      alert("設定儲存失敗");
    }
  };

  const ConfigEditor = ({ title, dataKey, items }) => {
    const [newItem, setNewItem] = useState('');
    const addItem = () => {
      if (!newItem.trim()) return;
      if (items.includes(newItem.trim())) return alert("已存在相同項目");
      handleUpdateConfig(dataKey, [...items, newItem.trim()]);
      setNewItem('');
    };
    const removeItem = (itemToRemove) => {
        if (!confirm(`確定刪除 "${itemToRemove}" 嗎？`)) return;
        handleUpdateConfig(dataKey, items.filter(i => i !== itemToRemove));
    };

    return (
      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-4">
        <h4 className="font-bold text-slate-700 mb-3">{title}</h4>
        <div className="flex gap-2 mb-3">
          <input 
            value={newItem} 
            onChange={e => setNewItem(e.target.value)}
            className="flex-1 border border-slate-300 rounded px-2 py-1 text-sm"
            placeholder={`新增${title}...`}
          />
          <button onClick={addItem} className="bg-blue-600 text-white px-3 py-1 rounded text-sm font-bold">新增</button>
        </div>
        <div className="flex flex-wrap gap-2">
          {items.map(item => (
            <span key={item} className="bg-white border border-slate-300 px-2 py-1 rounded text-xs flex items-center gap-1">
              {item}
              <button onClick={() => removeItem(item)} className="text-red-400 hover:text-red-600"><X className="w-3 h-3"/></button>
            </span>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* 頂部切換列 */}
      <div className="flex justify-between items-center bg-white p-2 rounded-xl shadow-sm border border-slate-100">
        <div className="flex gap-1">
            <button 
                onClick={() => setActiveTab('list')}
                className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all ${activeTab === 'list' ? 'bg-blue-100 text-blue-700' : 'text-slate-500 hover:bg-slate-50'}`}
            >
                <List className="w-4 h-4"/> SOP 列表管理
            </button>
            <button 
                onClick={() => setActiveTab('settings')}
                className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all ${activeTab === 'settings' ? 'bg-blue-100 text-blue-700' : 'text-slate-500 hover:bg-slate-50'}`}
            >
                <Settings className="w-4 h-4"/> 系統參數設定
            </button>
        </div>
        
        {activeTab === 'list' && (
            <button 
            onClick={() => openEditor()} 
            className="bg-blue-600 text-white px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1 shadow-md hover:bg-blue-500"
            >
            <Plus className="w-4 h-4" /> 新增 SOP
            </button>
        )}
      </div>

      {/* 內容區塊 */}
      {activeTab === 'list' ? (
          <div className="grid gap-3 max-h-[600px] overflow-y-auto pr-2">
            {loading && !isEditing ? <div className="text-center py-4"><Loader2 className="animate-spin inline"/></div> : (
              sops.map(sop => (
                <div key={sop.id} className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex justify-between items-center group">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 rounded">{sop.category}</span>
                      <h4 className="font-bold text-slate-800 text-sm truncate">{sop.title}</h4>
                    </div>
                  </div>
                  <div className="flex gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEditor(sop)} className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100"><Edit className="w-4 h-4"/></button>
                    <button onClick={() => deleteDoc(doc(db, "sop_articles", sop.id)).then(fetchData)} className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100"><Trash2 className="w-4 h-4"/></button>
                  </div>
                </div>
              ))
            )}
          </div>
      ) : (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
              <h3 className="font-bold text-lg text-slate-800 mb-4">參數設定</h3>
              <ConfigEditor title="文章分類" dataKey="categories" items={config.categories} />
              <ConfigEditor title="常用搜尋關鍵字" dataKey="quickKeywords" items={config.quickKeywords} />
          </div>
      )}

      {/* 編輯器 Modal */}
      {isEditing && currentSop && (
        <div className="fixed inset-0 z-[150] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-black text-slate-800">{currentSop.id ? '編輯 SOP' : '新增 SOP'}</h3>
              <button onClick={() => setIsEditing(false)}><X className="w-6 h-6 text-slate-400 hover:text-slate-600"/></button>
            </div>
            
            <div className="p-5 space-y-4 overflow-y-auto">
              <div>
                <label className="text-xs font-bold text-slate-500 mb-1 block">標題</label>
                <input 
                  type="text" 
                  value={currentSop.title} 
                  onChange={e => setCurrentSop({...currentSop, title: e.target.value})}
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                   <label className="text-xs font-bold text-slate-500 mb-1 block">分類</label>
                   <select 
                      value={currentSop.category}
                      onChange={e => setCurrentSop({...currentSop, category: e.target.value})}
                      className="w-full border border-slate-300 rounded-lg p-2.5 text-sm bg-white"
                   >
                     {/* 動態讀取分類設定 */}
                     {config.categories.map(c => <option key={c} value={c}>{c}</option>)}
                   </select>
                </div>
                <div>
                   <label className="text-xs font-bold text-slate-500 mb-1 block">關鍵字 (逗號分隔)</label>
                   <input 
                    type="text" 
                    value={currentSop.keywordsString} 
                    onChange={e => setCurrentSop({...currentSop, keywordsString: e.target.value})}
                    className="w-full border border-slate-300 rounded-lg p-2.5 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 mb-1 block">SOP 內容</label>
                <textarea 
                  value={currentSop.content}
                  onChange={e => setCurrentSop({...currentSop, content: e.target.value})}
                  className="w-full border border-slate-300 rounded-lg p-3 text-sm min-h-[200px] leading-relaxed focus:ring-2 focus:ring-blue-500 outline-none"
                ></textarea>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 flex gap-3">
               <button onClick={() => setIsEditing(false)} className="flex-1 py-3 rounded-xl font-bold text-slate-500 bg-slate-100 hover:bg-slate-200">取消</button>
               <button onClick={handleSaveSop} disabled={loading} className="flex-1 py-3 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-lg flex justify-center items-center gap-2">
                 {loading ? <Loader2 className="animate-spin w-4 h-4"/> : <Save className="w-4 h-4"/>} 儲存
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
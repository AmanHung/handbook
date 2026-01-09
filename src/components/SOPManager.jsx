// src/components/SOPManager.jsx
import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { Edit, Trash2, Plus, Save, X, Loader2, Tag } from 'lucide-react';

export default function SOPManager() {
  const [sops, setSops] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // 編輯模式狀態
  const [isEditing, setIsEditing] = useState(false);
  const [currentSop, setCurrentSop] = useState(null); // 存放正在編輯的資料

  // 1. 讀取所有 SOP
  const fetchSOPs = async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, "sop_articles"));
      const docs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // 依照建立時間排序 (選用)
      setSops(docs.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));
    } catch (error) {
      console.error("讀取錯誤:", error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSOPs();
  }, []);

  // 2. 開啟編輯/新增視窗
  const openEditor = (sop = null) => {
    if (sop) {
      // 編輯現有：將關鍵字陣列轉為字串方便編輯
      setCurrentSop({ ...sop, keywordsString: sop.keywords ? sop.keywords.join(', ') : '' });
    } else {
      // 新增：給予空值
      setCurrentSop({ title: '', category: '行政流程', content: '', keywordsString: '' });
    }
    setIsEditing(true);
  };

  // 3. 儲存資料 (新增或更新)
  const handleSave = async () => {
    if (!currentSop.title || !currentSop.content) return alert("標題與內容為必填！");
    
    setLoading(true);
    try {
      // 處理資料格式
      const dataToSave = {
        title: currentSop.title,
        category: currentSop.category,
        content: currentSop.content,
        // 將逗號分隔的字串轉回陣列
        keywords: currentSop.keywordsString.split(/[,，]/).map(k => k.trim()).filter(k => k),
        updatedAt: new Date()
      };

      if (currentSop.id) {
        // 更新模式
        await updateDoc(doc(db, "sop_articles", currentSop.id), dataToSave);
      } else {
        // 新增模式
        await addDoc(collection(db, "sop_articles"), {
          ...dataToSave,
          createdAt: new Date()
        });
      }
      
      setIsEditing(false);
      setCurrentSop(null);
      await fetchSOPs(); // 重新整理列表
      
    } catch (e) {
      console.error("儲存失敗", e);
      alert("儲存失敗: " + e.message);
    }
    setLoading(false);
  };

  // 4. 刪除資料
  const handleDelete = async (id) => {
    if (!confirm("確定要永久刪除這筆 SOP 嗎？")) return;
    try {
      await deleteDoc(doc(db, "sop_articles", id));
      setSops(prev => prev.filter(s => s.id !== id));
    } catch (e) {
      alert("刪除失敗");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold text-slate-700">SOP 線上編輯器</h3>
        <button 
          onClick={() => openEditor()} 
          className="bg-blue-600 text-white px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1 shadow-md hover:bg-blue-500"
        >
          <Plus className="w-4 h-4" /> 新增 SOP
        </button>
      </div>

      {/* 列表區 */}
      <div className="grid gap-3 max-h-[400px] overflow-y-auto pr-2 border-t border-slate-200 pt-4">
        {loading && !isEditing ? <div className="text-center py-4"><Loader2 className="animate-spin inline"/></div> : (
          sops.map(sop => (
            <div key={sop.id} className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex justify-between items-center group">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                   <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 rounded">{sop.category}</span>
                   <h4 className="font-bold text-slate-800 text-sm truncate">{sop.title}</h4>
                </div>
                <p className="text-[10px] text-slate-400 mt-1 truncate">{sop.keywords?.join(', ')}</p>
              </div>
              <div className="flex gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                <button onClick={() => openEditor(sop)} className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100"><Edit className="w-4 h-4"/></button>
                <button onClick={() => handleDelete(sop.id)} className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100"><Trash2 className="w-4 h-4"/></button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 編輯器 Modal (全螢幕覆蓋) */}
      {isEditing && currentSop && (
        <div className="fixed inset-0 z-[150] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-black text-slate-800">{currentSop.id ? '編輯 SOP' : '新增 SOP'}</h3>
              <button onClick={() => setIsEditing(false)}><X className="w-6 h-6 text-slate-400 hover:text-slate-600"/></button>
            </div>
            
            {/* Form */}
            <div className="p-5 space-y-4 overflow-y-auto">
              <div>
                <label className="text-xs font-bold text-slate-500 mb-1 block">標題</label>
                <input 
                  type="text" 
                  value={currentSop.title} 
                  onChange={e => setCurrentSop({...currentSop, title: e.target.value})}
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="例如：管制藥品核發規範"
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
                     {['行政流程', '調劑規範', '系統操作', '法規', '臨床知識', '其他'].map(c => (
                       <option key={c} value={c}>{c}</option>
                     ))}
                   </select>
                </div>
                <div>
                   <label className="text-xs font-bold text-slate-500 mb-1 block">關鍵字 (逗號分隔)</label>
                   <input 
                    type="text" 
                    value={currentSop.keywordsString} 
                    onChange={e => setCurrentSop({...currentSop, keywordsString: e.target.value})}
                    className="w-full border border-slate-300 rounded-lg p-2.5 text-sm"
                    placeholder="例如: 管制藥, 嗎啡, 簽名"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 mb-1 block">SOP 內容</label>
                <textarea 
                  value={currentSop.content}
                  onChange={e => setCurrentSop({...currentSop, content: e.target.value})}
                  className="w-full border border-slate-300 rounded-lg p-3 text-sm min-h-[200px] leading-relaxed focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="請輸入詳細步驟..."
                ></textarea>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-100 flex gap-3">
               <button 
                 onClick={() => setIsEditing(false)}
                 className="flex-1 py-3 rounded-xl font-bold text-slate-500 bg-slate-100 hover:bg-slate-200"
               >
                 取消
               </button>
               <button 
                 onClick={handleSave}
                 disabled={loading}
                 className="flex-1 py-3 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-lg flex justify-center items-center gap-2"
               >
                 {loading ? <Loader2 className="animate-spin w-4 h-4"/> : <Save className="w-4 h-4"/>}
                 儲存變更
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
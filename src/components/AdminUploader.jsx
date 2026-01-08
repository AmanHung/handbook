// src/components/AdminUploader.jsx
import React, { useState } from 'react';
import { db } from '../firebase';
import { collection, addDoc, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { SOP_SEED_DATA } from '../data/sopSeed';
import { UploadCloud, Trash2, Loader2, RefreshCw } from 'lucide-react';

export default function AdminUploader() {
  const [status, setStatus] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const handleUpload = async () => {
    // 1. 防呆確認
    if (!confirm(`⚠️ 警告：\n這將會「清空」雲端目前所有的 SOP 資料，\n並匯入 sopSeed.js 中的 ${SOP_SEED_DATA.length} 筆新資料。\n\n確定要執行嗎？`)) return;
    
    setIsUploading(true);
    setStatus('準備中...');

    try {
      const collectionRef = collection(db, "sop_articles");
      
      // 2. 刪除舊資料 (避免重複)
      setStatus('正在清空舊資料庫...');
      const snapshot = await getDocs(collectionRef);
      if (!snapshot.empty) {
        // 使用 Promise.all 平行刪除，速度較快
        const deletePromises = snapshot.docs.map(d => deleteDoc(doc(db, "sop_articles", d.id)));
        await Promise.all(deletePromises);
      }

      // 3. 匯入新資料
      setStatus(`開始匯入 ${SOP_SEED_DATA.length} 筆新資料...`);
      let count = 0;
      for (const item of SOP_SEED_DATA) {
        await addDoc(collectionRef, {
          ...item,
          createdAt: new Date() // 加上建立時間戳記
        });
        count++;
      }

      // 4. 完成
      setStatus(`🎉 成功！已更新 ${count} 筆 SOP 資料。`);
    } catch (error) {
      console.error(error);
      setStatus(`❌ 失敗: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="bg-slate-800 text-white p-5 rounded-xl border-2 border-slate-700 shadow-xl">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="font-bold text-sm text-slate-200 flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-blue-400" />
            SOP 資料庫同步工具
          </h3>
          <p className="text-[10px] text-slate-400 mt-1 font-mono">
            來源: src/data/sopSeed.js
          </p>
        </div>
        <span className="text-[10px] bg-slate-900 px-2 py-1 rounded text-slate-500 font-mono">
          待匯入: {SOP_SEED_DATA.length} 筆
        </span>
      </div>

      <button 
        onClick={handleUpload}
        disabled={isUploading}
        className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-bold transition-all ${
          isUploading 
            ? 'bg-slate-700 cursor-not-allowed text-slate-400' 
            : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg hover:shadow-blue-500/30'
        }`}
      >
        {isUploading ? <Loader2 className="animate-spin w-4 h-4" /> : <UploadCloud className="w-4 h-4" />}
        {isUploading ? '正在同步資料庫...' : '一鍵覆寫雲端資料'}
      </button>

      {/* 狀態顯示區 */}
      {status && (
        <div className={`mt-4 text-xs font-mono p-3 rounded-lg border ${
          status.includes('❌') 
            ? 'bg-red-900/20 border-red-900/50 text-red-400' 
            : status.includes('🎉')
              ? 'bg-emerald-900/20 border-emerald-900/50 text-emerald-400'
              : 'bg-slate-900/50 border-slate-700 text-slate-300'
        }`}>
          {status}
        </div>
      )}
      
      <div className="mt-3 flex items-center gap-2 text-[10px] text-slate-500">
        <Trash2 className="w-3 h-3" />
        <span>注意：此操作會先移除舊資料再寫入新資料</span>
      </div>
    </div>
  );
}
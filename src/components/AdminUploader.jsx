import React, { useState } from 'react';
import { 
  Upload, 
  FileText, 
  Video, 
  Database, 
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Link as LinkIcon
} from 'lucide-react';
import { db } from '../firebase';
import { collection, addDoc, writeBatch, doc } from 'firebase/firestore';
import { sopData } from '../data/sopData'; 
import { shiftData } from '../data/shiftData';

const AdminUploader = () => {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ type: '', message: '' });

  // 通用上傳函式
  const handleUpload = async (e, collectionName) => {
    e.preventDefault();
    setLoading(true);
    setStatus({ type: '', message: '' });

    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());
    
    data.createdAt = new Date().toISOString();
    
    // SOP 文章：不再強制區分 type，而是視為混合內容
    // 預設 type 為 mixed，方便未來擴充
    if (collectionName === 'sop_articles') {
        data.type = 'mixed'; 
    }

    try {
      await addDoc(collection(db, collectionName), data);
      setStatus({ type: 'success', message: '發布成功！' });
      e.target.reset();
    } catch (error) {
      console.error("Error adding document: ", error);
      setStatus({ type: 'error', message: `發布失敗: ${error.message}` });
    } finally {
      setLoading(false);
    }
  };

  // 一鍵復原資料功能
  const handleRestoreData = async (type) => {
    const confirmRestore = window.confirm(
      `確定要將本地的 [${type}] 預設資料寫入資料庫嗎？`
    );
    if (!confirmRestore) return;

    setLoading(true);
    const batch = writeBatch(db);

    try {
      let count = 0;
      
      if (type === 'SOP') {
        const sourceData = sopData || []; 
        sourceData.forEach((item) => {
          const docRef = doc(collection(db, "sop_articles")); 
          batch.set(docRef, { 
              ...item, 
              type: 'mixed', 
              content: item.content || "尚無詳細內容", 
              createdAt: new Date().toISOString() 
          });
          count++;
        });
      } else if (type === 'Shift') {
        const sourceData = shiftData || [];
        sourceData.forEach((item) => {
          const docRef = doc(collection(db, "shifts"));
          batch.set(docRef, { ...item, createdAt: new Date().toISOString() });
          count++;
        });
      }

      await batch.commit();
      setStatus({ type: 'success', message: `成功復原 ${count} 筆 ${type} 資料！` });
    } catch (error) {
      console.error("Batch write error:", error);
      setStatus({ type: 'error', message: `復原失敗: ${error.message}` });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* 狀態訊息提示 */}
      {status.message && (
        <div className={`p-4 rounded-lg flex items-center gap-2 ${
          status.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
        }`}>
          {status.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
          {status.message}
        </div>
      )}

      {/* 區域 1: 系統資料救援/初始化 */}
      <div className="bg-orange-50 p-6 rounded-xl border border-orange-100">
        <h3 className="text-lg font-bold text-orange-800 mb-2 flex items-center gap-2">
          <Database className="w-5 h-5" />
          資料庫初始化 / 救援
        </h3>
        <p className="text-sm text-orange-600 mb-4">
          如果前台顯示空白，請使用此功能將預設資料寫入正確的集合。
        </p>
        <div className="flex gap-4">
          <button
            onClick={() => handleRestoreData('SOP')}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-orange-200 text-orange-700 rounded-lg hover:bg-orange-100 transition-colors shadow-sm"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            匯入預設 SOP
          </button>
          <button
            onClick={() => handleRestoreData('Shift')}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-orange-200 text-orange-700 rounded-lg hover:bg-orange-100 transition-colors shadow-sm"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            匯入預設班表
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* 區域 2: 上傳新的 SOP (混合模式：連結 + 內文) */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-4 text-indigo-600">
            <FileText className="w-5 h-5" />
            <h3 className="font-bold">發布 SOP 公告</h3>
          </div>
          
          <form onSubmit={(e) => handleUpload(e, 'sop_articles')} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">標題 <span className="text-red-500">*</span></label>
              <input name="title" required className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-2" placeholder="例如：門診退藥作業流程" />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">分類</label>
              <select name="category" className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-2">
                <option value="門診">門診組</option>
                <option value="住院">住院組</option>
                <option value="行政">行政組</option>
                <option value="臨床">臨床組</option>
              </select>
            </div>

            {/* 檔案連結欄位 (選填) */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <LinkIcon className="w-4 h-4 text-gray-400" />
                    檔案連結 (Google Drive / PDF) <span className="text-gray-400 text-xs font-normal">(選填)</span>
                </label>
                <input name="link" className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-2" placeholder="https://..." />
            </div>

            {/* 詳細內容欄位 (選填，若有填寫則前台點擊會彈出視窗) */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">詳細內容文字 <span className="text-gray-400 text-xs font-normal">(選填，若填寫則點擊彈窗顯示)</span></label>
                <textarea 
                    name="content" 
                    rows="6" 
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-2" 
                    placeholder="請在此直接輸入 SOP 的文字內容..." 
                />
            </div>

            <button type="submit" disabled={loading} className="w-full py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex justify-center items-center gap-2">
              <Upload className="w-4 h-4" />
              {loading ? '發布中...' : '確認發布'}
            </button>
          </form>
        </div>

        {/* 區域 3: 上傳新的影片 */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-4 text-pink-600">
            <Video className="w-5 h-5" />
            <h3 className="font-bold">新增教學影片</h3>
          </div>
          
          <form onSubmit={(e) => handleUpload(e, 'training_videos')} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">影片標題</label>
              <input name="title" required className="w-full rounded-md border-gray-300 shadow-sm focus:border-pink-500 focus:ring-pink-500 border p-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">YouTube 連結</label>
              <input name="url" required className="w-full rounded-md border-gray-300 shadow-sm focus:border-pink-500 focus:ring-pink-500 border p-2" placeholder="https://youtube.com/..." />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">影片描述</label>
              <textarea name="description" className="w-full rounded-md border-gray-300 shadow-sm focus:border-pink-500 focus:ring-pink-500 border p-2" rows="3"></textarea>
            </div>
            <button type="submit" disabled={loading} className="w-full py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors flex justify-center items-center gap-2">
              <Upload className="w-4 h-4" />
              {loading ? '上傳中...' : '確認上傳'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AdminUploader;

import React, { useState, useEffect } from 'react';
import { 
  Upload, 
  FileText, 
  Video, 
  Save,
  CheckCircle,
  AlertTriangle,
  X
} from 'lucide-react';
import { db } from '../firebase';
import { collection, addDoc, updateDoc, doc, getDoc } from 'firebase/firestore';

// 預設分類 (當 Firebase 沒設定時使用)
const DEFAULT_CATEGORIES = ['門診', '住院', '行政', '臨床', '急診', '教學'];

// 此元件現在支援「新增」與「編輯」
const AdminUploader = ({ 
  type = 'sop', // 'sop' or 'video'
  editData = null, // 若有傳入，代表是編輯模式
  onSuccess, 
  onCancel 
}) => {
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [status, setStatus] = useState({ type: '', message: '' });

  // 讀取動態分類設定
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const docRef = doc(db, "site_settings", "sop_config");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists() && docSnap.data().categories) {
          setCategories(docSnap.data().categories);
        }
      } catch (e) {
        console.error("讀取分類失敗", e);
      }
    };
    fetchSettings();
  }, []);

  const collectionName = type === 'sop' ? 'sop_articles' : 'training_videos';
  const isEdit = !!editData;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus({ type: '', message: '' });

    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());
    
    // 如果是 SOP，處理欄位清理
    if (type === 'sop') {
      data.type = 'mixed';
      if (!data.link) delete data.link;
      if (!data.content) delete data.content;
    }

    try {
      if (isEdit) {
        // 更新模式
        data.updatedAt = new Date().toISOString();
        const docRef = doc(db, collectionName, editData.id);
        await updateDoc(docRef, data);
        setStatus({ type: 'success', message: '更新成功！' });
      } else {
        // 新增模式
        data.createdAt = new Date().toISOString();
        await addDoc(collection(db, collectionName), data);
        setStatus({ type: 'success', message: '發布成功！' });
        e.target.reset();
      }
      
      // 通知父層重新整理或關閉視窗
      if (onSuccess) {
        setTimeout(() => onSuccess(), 1000);
      }
    } catch (error) {
      console.error("Error:", error);
      setStatus({ type: 'error', message: `操作失敗: ${error.message}` });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 relative">
      {/* 標題與取消按鈕 */}
      <div className="flex justify-between items-center mb-4">
        <div className={`flex items-center gap-2 ${type === 'sop' ? 'text-indigo-600' : 'text-pink-600'}`}>
          {type === 'sop' ? <FileText className="w-5 h-5" /> : <Video className="w-5 h-5" />}
          <h3 className="font-bold text-lg">
            {isEdit ? '編輯資源' : (type === 'sop' ? '發布 SOP 公告' : '新增教學影片')}
          </h3>
        </div>
        {onCancel && (
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {status.message && (
        <div className={`mb-4 p-3 rounded-lg flex items-center gap-2 text-sm ${
          status.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
        }`}>
          {status.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          {status.message}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* 標題 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">標題 <span className="text-red-500">*</span></label>
          <input 
            name="title" 
            defaultValue={editData?.title || ''}
            required 
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-2" 
            placeholder={type === 'sop' ? "例如：門診退藥作業流程" : "影片標題"} 
          />
        </div>
        
        {/* SOP 分類選單 */}
        {type === 'sop' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">分類</label>
            <select 
              name="category" 
              defaultValue={editData?.category || categories[0]}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-2"
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        )}

        {/* 連結欄位 (Video 必填 / SOP 選填) */}
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
                {type === 'sop' ? '檔案連結 (PDF/雲端)' : 'YouTube 連結'} 
                {type === 'sop' && <span className="text-gray-400 text-xs font-normal ml-1">(選填)</span>}
            </label>
            <input 
                name={type === 'sop' ? 'link' : 'url'}
                defaultValue={editData?.link || editData?.url || ''}
                required={type === 'video'}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-2" 
                placeholder="https://..." 
            />
        </div>

        {/* 內容/描述欄位 */}
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
                {type === 'sop' ? '詳細內容文字' : '影片描述'}
                {type === 'sop' && <span className="text-gray-400 text-xs font-normal ml-1">(選填，若填寫則點擊彈窗顯示)</span>}
            </label>
            <textarea 
                name={type === 'sop' ? 'content' : 'description'}
                defaultValue={editData?.content || editData?.description || ''}
                rows="6" 
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-2" 
                placeholder={type === 'sop' ? "請在此直接輸入 SOP 的文字內容..." : "影片簡介..."}
            />
        </div>

        {/* 送出按鈕 */}
        <div className="flex gap-3 pt-2">
            {onCancel && (
                <button 
                    type="button" 
                    onClick={onCancel}
                    className="flex-1 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                    取消
                </button>
            )}
            <button 
                type="submit" 
                disabled={loading} 
                className={`flex-1 py-2 text-white rounded-lg transition-colors flex justify-center items-center gap-2 ${
                    type === 'sop' ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-pink-600 hover:bg-pink-700'
                }`}
            >
                {isEdit ? <Save className="w-4 h-4" /> : <Upload className="w-4 h-4" />}
                {loading ? '處理中...' : (isEdit ? '儲存修改' : '確認發布')}
            </button>
        </div>
      </form>
    </div>
  );
};

export default AdminUploader;

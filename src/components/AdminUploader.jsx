import React, { useState, useEffect } from 'react';
import { collection, addDoc, updateDoc, doc, serverTimestamp, getDoc } from 'firebase/firestore';
// 加入 .js 副檔名以確保路徑解析正確
import { db } from '../firebase.js';

// 此元件同時處理 SOP 與 Video 的新增/編輯
const AdminUploader = ({ editData = null, onCancelEdit, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [resourceType, setResourceType] = useState('sop'); // 'sop' or 'video'
  
  // 表單資料
  const [formData, setFormData] = useState({
    title: '',
    category: '',
    content: '', // SOP 用
    url: '', // Video 用
    keywords: [], // 陣列
    description: ''
  });

  // 設定選項 (從 Firebase 讀取)
  const [availableKeywords, setAvailableKeywords] = useState([]);
  const [availableCategories, setAvailableCategories] = useState([]);

  // 初始化或當編輯資料改變時更新表單
  useEffect(() => {
    if (editData) {
      setResourceType(editData.type || 'sop');
      setFormData({
        title: editData.title || '',
        category: editData.category || '',
        content: editData.content || '',
        url: editData.url || '',
        keywords: editData.keywords || [],
        description: editData.description || ''
      });
    } else {
      // 重置為預設值
      setFormData({
        title: '',
        category: '',
        content: '',
        url: '',
        keywords: [],
        description: ''
      });
    }
  }, [editData]);

  // 讀取設定檔 (關鍵字與分類)
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const docRef = doc(db, 'site_settings', 'sop_config');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setAvailableKeywords(data.keywords || []);
          setAvailableCategories(data.categories || []);
        }
      } catch (error) {
        console.error("Error fetching settings:", error);
      }
    };
    fetchSettings();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleKeywordToggle = (keyword) => {
    setFormData(prev => {
      const currentKeywords = prev.keywords || [];
      if (currentKeywords.includes(keyword)) {
        return { ...prev, keywords: currentKeywords.filter(k => k !== keyword) };
      } else {
        return { ...prev, keywords: [...currentKeywords, keyword] };
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 驗證
      if (!formData.title || !formData.category) {
        alert('請填寫標題與分類');
        setLoading(false);
        return;
      }
      if (resourceType === 'video' && !formData.url) {
        alert('請填寫影片連結');
        setLoading(false);
        return;
      }

      // 準備寫入資料庫的物件
      const docData = {
        title: formData.title,
        category: formData.category,
        keywords: formData.keywords,
        description: formData.description,
        updatedAt: serverTimestamp(),
      };

      if (resourceType === 'sop') {
        docData.content = formData.content;
      } else {
        docData.url = formData.url;
      }

      const collectionName = resourceType === 'sop' ? 'sops' : 'videos';

      if (editData) {
        // --- 更新模式 ---
        await updateDoc(doc(db, collectionName, editData.id), docData);
        alert(`${resourceType === 'sop' ? 'SOP' : '影片'} 更新成功！`);
      } else {
        // --- 新增模式 ---
        docData.createdAt = serverTimestamp(); // 新增時才加創建時間
        await addDoc(collection(db, collectionName), docData);
        alert(`${resourceType === 'sop' ? 'SOP' : '影片'} 新增成功！`);
      }

      // 重置表單
      setFormData({
        title: '',
        category: '',
        content: '',
        url: '',
        keywords: [],
        description: ''
      });
      
      // 觸發回調
      if (onSuccess) onSuccess();

    } catch (error) {
      console.error("Error saving document: ", error);
      alert('儲存失敗，請稍後再試');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-800 flex items-center">
          {editData ? (
            <>
              <span className="text-indigo-600 mr-2">✏️</span> 
              編輯 {resourceType === 'sop' ? 'SOP 文件' : '教學影片'}
            </>
          ) : (
            <>
              <span className="text-green-600 mr-2">➕</span> 
              新增資源
            </>
          )}
        </h2>
        
        {editData && (
          <button 
            onClick={onCancelEdit}
            className="text-gray-500 hover:text-gray-700 font-medium text-sm px-3 py-1 bg-gray-100 rounded-md"
          >
            取消編輯
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 資源類型選擇 (僅在新增模式下可選，編輯模式鎖定) */}
        <div>
          <label className="block text-gray-700 font-bold mb-2">資源類型</label>
          <div className="flex space-x-4">
            <label className={`flex-1 flex items-center justify-center p-3 rounded-lg border-2 cursor-pointer transition-all ${
              resourceType === 'sop' 
                ? 'border-blue-500 bg-blue-50 text-blue-700 font-bold' 
                : 'border-gray-200 hover:bg-gray-50 text-gray-600'
            } ${editData ? 'opacity-50 cursor-not-allowed' : ''}`}>
              <input 
                type="radio" 
                name="resourceType" 
                value="sop" 
                checked={resourceType === 'sop'} 
                onChange={() => setResourceType('sop')}
                disabled={!!editData}
                className="hidden"
              />
              📄 SOP 文件
            </label>
            <label className={`flex-1 flex items-center justify-center p-3 rounded-lg border-2 cursor-pointer transition-all ${
              resourceType === 'video' 
                ? 'border-purple-500 bg-purple-50 text-purple-700 font-bold' 
                : 'border-gray-200 hover:bg-gray-50 text-gray-600'
            } ${editData ? 'opacity-50 cursor-not-allowed' : ''}`}>
              <input 
                type="radio" 
                name="resourceType" 
                value="video" 
                checked={resourceType === 'video'} 
                onChange={() => setResourceType('video')}
                disabled={!!editData}
                className="hidden"
              />
              🎥 教學影片
            </label>
          </div>
        </div>

        {/* 基本欄位 */}
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label className="block text-gray-700 font-bold mb-2">標題名稱</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder={resourceType === 'sop' ? "例如：管制藥點收流程" : "例如：化療藥品調配示範"}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-gray-700 font-bold mb-2">分類標籤</label>
            <div className="relative">
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none appearance-none bg-white"
                required
              >
                <option value="" disabled>請選擇分類</option>
                {availableCategories.length > 0 ? (
                  availableCategories.map((cat, idx) => (
                    <option key={idx} value={cat}>{cat}</option>
                  ))
                ) : (
                  <option value="未分類">未分類 (請至參數設定新增)</option>
                )}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
              </div>
            </div>
          </div>
        </div>

        {/* 條件欄位：Content vs URL */}
        {resourceType === 'sop' ? (
          <div>
            <label className="block text-gray-700 font-bold mb-2">SOP 內容 (支援 Markdown)</label>
            <textarea
              name="content"
              value={formData.content}
              onChange={handleChange}
              rows="6"
              placeholder="請輸入SOP詳細步驟..."
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm"
            ></textarea>
          </div>
        ) : (
          <div>
            <label className="block text-gray-700 font-bold mb-2">影片連結 (YouTube/Google Drive)</label>
            <input
              type="url"
              name="url"
              value={formData.url}
              onChange={handleChange}
              placeholder="https://..."
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
              required
            />
          </div>
        )}

        {/* 關鍵字多選 */}
        <div>
          <label className="block text-gray-700 font-bold mb-2">關鍵字 (多選)</label>
          <div className="flex flex-wrap gap-2 p-3 bg-gray-50 rounded-lg border border-gray-100">
            {availableKeywords.length > 0 ? (
              availableKeywords.map((kw, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleKeywordToggle(kw)}
                  className={`px-3 py-1 rounded-full text-sm transition-colors border ${
                    formData.keywords.includes(kw)
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'
                  }`}
                >
                  {kw}
                </button>
              ))
            ) : (
              <span className="text-gray-400 text-sm">請先至「參數設定」頁籤新增關鍵字</span>
            )}
          </div>
        </div>

        <div>
          <label className="block text-gray-700 font-bold mb-2">簡短描述 (選填)</label>
          <input
            type="text"
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="關於此資源的補充說明..."
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className={`w-full py-3 rounded-lg font-bold text-lg text-white transition-transform transform active:scale-95 ${
            resourceType === 'sop' 
              ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-200' 
              : 'bg-purple-600 hover:bg-purple-700 shadow-purple-200'
          } shadow-lg disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {loading ? '處理中...' : editData ? '確認更新' : '確認上傳'}
        </button>
      </form>
    </div>
  );
};

export default AdminUploader;

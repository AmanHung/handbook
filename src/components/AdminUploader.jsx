import React, { useState, useEffect } from 'react';
import { collection, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase.js';

// 修正重點：新增接收 settings prop，並處理 attachmentUrl
const AdminUploader = ({ editData = null, onCancelEdit, onSuccess, settings = { quickKeywords: [], categories: [] } }) => {
  const [loading, setLoading] = useState(false);
  const [resourceType, setResourceType] = useState('sop'); 
  
  const [formData, setFormData] = useState({
    title: '',
    category: '',
    content: '',
    url: '',
    attachmentUrl: '', // 新增附件欄位
    keywords: [],
    description: ''
  });

  // 從 props 取得設定 (不再需要自己 fetch)
  const availableKeywords = settings.quickKeywords || [];
  const availableCategories = settings.categories || [];

  // 初始化或當編輯資料改變時更新表單
  useEffect(() => {
    if (editData) {
      setResourceType(editData.type || 'sop');
      setFormData({
        title: editData.title || '',
        category: editData.category || '',
        content: editData.content || '',
        url: editData.url || '',
        attachmentUrl: editData.attachmentUrl || '', // 載入附件連結
        keywords: editData.keywords || [],
        description: editData.description || ''
      });
    } else {
      setFormData({
        title: '',
        category: '',
        content: '',
        url: '',
        attachmentUrl: '',
        keywords: [],
        description: ''
      });
    }
  }, [editData]);

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

      const docData = {
        title: formData.title,
        category: formData.category,
        keywords: formData.keywords,
        description: formData.description,
        updatedAt: serverTimestamp(),
      };

      if (resourceType === 'sop') {
        docData.content = formData.content;
        docData.attachmentUrl = formData.attachmentUrl; // 儲存附件連結
      } else {
        docData.url = formData.url;
      }

      const collectionName = resourceType === 'sop' ? 'sop_articles' : 'training_videos';

      if (editData) {
        await updateDoc(doc(db, collectionName, editData.id), docData);
        alert(`${resourceType === 'sop' ? 'SOP' : '影片'} 更新成功！`);
      } else {
        docData.createdAt = serverTimestamp();
        await addDoc(collection(db, collectionName), docData);
        alert(`${resourceType === 'sop' ? 'SOP' : '影片'} 新增成功！`);
      }

      setFormData({
        title: '',
        category: '',
        content: '',
        url: '',
        attachmentUrl: '',
        keywords: [],
        description: ''
      });
      
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
        {/* 資源類型選擇 */}
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
            </div>
          </div>
        </div>

        {/* SOP 專屬欄位：內容與附件 */}
        {resourceType === 'sop' && (
          <>
            <div>
              <label className="block text-gray-700 font-bold mb-2">SOP 內容摘要</label>
              <textarea
                name="content"
                value={formData.content}
                onChange={handleChange}
                rows="5"
                placeholder="請輸入SOP詳細步驟..."
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm"
              ></textarea>
            </div>
            <div>
              <label className="block text-gray-700 font-bold mb-2">
                SOP 附件連結 <span className="text-gray-400 font-normal text-sm">(選填)</span>
              </label>
              <input
                type="url"
                name="attachmentUrl"
                value={formData.attachmentUrl}
                onChange={handleChange}
                placeholder="例如：Google Drive 連結、PDF 網址..."
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm text-gray-600"
              />
            </div>
          </>
        )}

        {/* 影片專屬欄位 */}
        {resourceType === 'video' && (
          <div>
            <label className="block text-gray-700 font-bold mb-2">影片連結</label>
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
          <label className="block text-gray-700 font-bold mb-2">簡短描述</label>
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
          className={`w-full py-3 rounded-lg font-bold text-lg text-white shadow-lg ${
            resourceType === 'sop' 
              ? 'bg-blue-600 hover:bg-blue-700' 
              : 'bg-purple-600 hover:bg-purple-700'
          }`}
        >
          {loading ? '處理中...' : editData ? '確認更新' : '確認上傳'}
        </button>
      </form>
    </div>
  );
};

export default AdminUploader;

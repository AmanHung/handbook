import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { Trash2, Plus, Save, X, Loader2, Youtube, ExternalLink, Video, Tag } from 'lucide-react';

export default function VideoManager() {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  // 編輯中的資料
  const [currentVideo, setCurrentVideo] = useState(null);

  // 1. 讀取影片列表
  const fetchVideos = async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, "training_videos"));
      const videoData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // 依建立時間排序 (新的在上面)
      setVideos(videoData.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));
    } catch (error) {
      console.error("讀取失敗:", error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchVideos();
  }, []);

  // 取得目前所有不重複的分類 (供下拉選單使用)
  const existingCategories = [...new Set(videos.map(v => v.category || '未分類'))].filter(c => c !== '未分類');

  // 2. 開啟編輯器
  const openEditor = (video = null) => {
    if (video) {
      setCurrentVideo({ 
        ...video,
        category: video.category || '未分類'
      });
    } else {
      // 預設帶入第一個已存在的分類，如果都沒有則為'系統操作'
      setCurrentVideo({ 
        title: '', 
        url: '', 
        description: '',
        category: existingCategories[0] || '系統操作'
      });
    }
    setIsEditing(true);
  };

  // 3. 儲存影片
  const handleSave = async () => {
    if (!currentVideo.title || !currentVideo.url) return alert("標題與網址為必填！");
    
    setLoading(true);
    try {
      const dataToSave = {
        title: currentVideo.title,
        url: currentVideo.url,
        description: currentVideo.description || '',
        category: currentVideo.category || '未分類', // 新增分類欄位
        updatedAt: new Date()
      };

      if (currentVideo.id) {
        await updateDoc(doc(db, "training_videos", currentVideo.id), dataToSave);
      } else {
        await addDoc(collection(db, "training_videos"), { ...dataToSave, createdAt: new Date() });
      }
      setIsEditing(false);
      fetchVideos();
    } catch (e) {
      alert("儲存失敗: " + e.message);
    }
    setLoading(false);
  };

  // 4. 刪除影片
  const handleDelete = async (id) => {
    if (!confirm("確定要刪除這部影片嗎？")) return;
    await deleteDoc(doc(db, "training_videos", id));
    fetchVideos();
  };

  return (
    <div className="space-y-4">
      {/* 頂部按鈕 */}
      <div className="flex justify-between items-center bg-white p-3 rounded-xl shadow-sm border border-slate-100">
        <h3 className="font-bold text-slate-700 flex items-center gap-2">
          <Video className="w-5 h-5"/> 影片庫存管理
        </h3>
        <button 
          onClick={() => openEditor()} 
          className="bg-blue-600 text-white px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1 shadow-md hover:bg-blue-500"
        >
          <Plus className="w-4 h-4" /> 新增影片
        </button>
      </div>

      {/* 列表 */}
      <div className="grid gap-3 max-h-[600px] overflow-y-auto pr-2">
        {loading && !isEditing ? (
          <div className="text-center py-4"><Loader2 className="animate-spin inline"/></div>
        ) : (
          videos.map(video => (
            <div key={video.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full font-bold whitespace-nowrap">
                    {video.category || '未分類'}
                  </span>
                  <h4 className="font-bold text-slate-800 text-sm truncate">{video.title}</h4>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                   <Youtube className="w-3 h-3 text-red-500" />
                   <span className="truncate max-w-[200px]">{video.url}</span>
                </div>
              </div>
              <div className="flex gap-2 w-full sm:w-auto justify-end">
                <button onClick={() => openEditor(video)} className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-200">編輯</button>
                <button onClick={() => handleDelete(video.id)} className="p-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100"><Trash2 className="w-4 h-4"/></button>
              </div>
            </div>
          ))
        )}
        {videos.length === 0 && !loading && (
          <p className="text-center text-slate-400 py-8 text-sm">目前沒有影片，請點擊上方按鈕新增。</p>
        )}
      </div>

      {/* 編輯 Modal */}
      {isEditing && (
        <div className="fixed inset-0 z-[200] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-5 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-bold text-lg">{currentVideo.id ? '編輯影片' : '新增影片'}</h3>
              <button onClick={() => setIsEditing(false)}><X className="w-6 h-6 text-slate-400"/></button>
            </div>
            
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-500 mb-1 block">影片分類</label>
                <div className="relative">
                    <input 
                      list="category-suggestions"
                      value={currentVideo.category}
                      onChange={e => setCurrentVideo({...currentVideo, category: e.target.value})}
                      className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none pl-8"
                      placeholder="輸入或選擇分類..."
                    />
                    <Tag className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5"/>
                    {/* 瀏覽器原生的自動完成清單 */}
                    <datalist id="category-suggestions">
                        <option value="系統操作" />
                        <option value="調劑流程" />
                        <option value="臨床課程" />
                        {existingCategories.map(c => <option key={c} value={c} />)}
                    </datalist>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 mb-1 block">影片標題</label>
                <input 
                  value={currentVideo.title}
                  onChange={e => setCurrentVideo({...currentVideo, title: e.target.value})}
                  className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="例如：處方系統操作教學"
                />
              </div>
              
              <div>
                <label className="text-xs font-bold text-slate-500 mb-1 block">影片連結 (YouTube 或 Drive)</label>
                <input 
                  value={currentVideo.url}
                  onChange={e => setCurrentVideo({...currentVideo, url: e.target.value})}
                  className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="https://..."
                />
              </div>
              
              <div>
                <label className="text-xs font-bold text-slate-500 mb-1 block">備註說明 (選填)</label>
                <textarea 
                  value={currentVideo.description}
                  onChange={e => setCurrentVideo({...currentVideo, description: e.target.value})}
                  className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none h-20"
                />
              </div>
            </div>

            <button onClick={handleSave} className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-lg flex justify-center gap-2">
               {loading ? <Loader2 className="animate-spin w-5 h-5"/> : <Save className="w-5 h-5"/>} 儲存
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
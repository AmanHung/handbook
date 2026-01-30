import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase.js';
import { Search, Play, Film, ExternalLink, Video } from 'lucide-react';

const VideoGallery = () => {
  const [activeCategory, setActiveCategory] = useState('All');
  
  // Firebase 狀態
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);

  // 1. 讀取影片資料 (training_videos)
  useEffect(() => {
    const q = query(collection(db, 'training_videos'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setVideos(list);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching videos:", error);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // 2. 轉換 YouTube 網址為 Embed 格式的輔助函式
  const getEmbedUrl = (url) => {
    if (!url) return null;
    
    let videoId = '';
    
    try {
      // 處理常見 YouTube 格式
      if (url.includes('youtube.com/watch?v=')) {
        videoId = url.split('v=')[1]?.split('&')[0];
      } else if (url.includes('youtu.be/')) {
        videoId = url.split('youtu.be/')[1]?.split('?')[0];
      } else if (url.includes('youtube.com/embed/')) {
        return url; // 已經是 embed 格式，直接回傳
      } else if (url.includes('m.youtube.com/watch?v=')) {
        videoId = url.split('v=')[1]?.split('&')[0];
      }
    } catch (e) {
      console.error("URL parsing error:", e);
      return null;
    }

    if (videoId) {
      return `https://www.youtube.com/embed/${videoId}`;
    }

    return null; // 非 YouTube 連結或無法解析
  };

  // 取得所有分類
  const categories = ['All', ...new Set(videos.map(v => v.category).filter(Boolean))];

  // 篩選影片
  const filteredVideos = activeCategory === 'All' 
    ? videos 
    : videos.filter(video => video.category === activeCategory);

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
        <span className="bg-purple-100 text-purple-600 p-2 rounded-lg mr-3">
          <Film className="w-6 h-6" />
        </span>
        影音教學專區
      </h2>

      {/* 分類標籤列 */}
      <div className="flex gap-2 overflow-x-auto pb-4 mb-6 scrollbar-hide">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              activeCategory === cat
                ? 'bg-purple-600 text-white shadow-md'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500 flex flex-col items-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mb-2"></div>
          影片載入中...
        </div>
      ) : filteredVideos.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredVideos.map((video) => {
            const embedUrl = getEmbedUrl(video.url);
            
            return (
              <div key={video.id} className="group bg-white border border-gray-100 rounded-xl overflow-hidden hover:shadow-lg transition-all duration-300 flex flex-col">
                
                {/* 影片播放區塊 */}
                <div className="relative w-full aspect-video bg-gray-900">
                   {embedUrl ? (
                     <iframe 
                       src={embedUrl} 
                       title={video.title}
                       className="w-full h-full"
                       allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                       allowFullScreen
                     />
                   ) : (
                     // 非 YouTube 影片顯示替代畫面
                     <div className="w-full h-full flex items-center justify-center bg-gray-800 text-white flex-col p-4 text-center">
                       <Video className="w-12 h-12 mb-3 text-gray-400" />
                       <p className="mb-3 font-medium text-sm">此影片為外部連結</p>
                       <a 
                         href={video.url} 
                         target="_blank" 
                         rel="noopener noreferrer" 
                         className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm flex items-center gap-2 transition-colors"
                       >
                         <ExternalLink className="w-4 h-4" /> 點擊前往觀看
                       </a>
                     </div>
                   )}
                </div>
                
                {/* 影片資訊區塊 */}
                <div className="p-4 flex flex-col flex-grow">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-gray-800 line-clamp-2 group-hover:text-purple-600 transition-colors text-lg leading-snug">
                      {video.title}
                    </h3>
                  </div>
                  
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-md font-medium">
                      {video.category || '未分類'}
                    </span>
                  </div>

                  {video.description && (
                    <p className="text-sm text-gray-500 line-clamp-3 mb-4 flex-grow">
                      {video.description}
                    </p>
                  )}
                  
                  {/* 如果有外部連結但同時也有內嵌，提供原始連結選項 */}
                  {embedUrl && (
                    <div className="pt-3 mt-auto border-t border-gray-50 flex justify-end">
                       <a href={video.url} target="_blank" rel="noopener noreferrer" className="text-xs text-gray-400 hover:text-purple-600 flex items-center gap-1">
                         <ExternalLink className="w-3 h-3" /> 開啟原始連結
                       </a>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-16 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
          <p className="text-gray-500 font-medium">此分類目前沒有影片</p>
        </div>
      )}
    </div>
  );
};

export default VideoGallery;

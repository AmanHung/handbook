import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';

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

  const categories = ['All', ...new Set(videos.map(v => v.category).filter(Boolean))];

  const filteredVideos = activeCategory === 'All' 
    ? videos 
    : videos.filter(video => video.category === activeCategory);

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
        <span className="bg-purple-100 text-purple-600 p-2 rounded-lg mr-3">🎥</span>
        藥局影音教學專區
      </h2>

      <div className="flex gap-2 overflow-x-auto pb-4 mb-4 scrollbar-hide">
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => setActiveCategory(category)}
            className={`px-5 py-2 rounded-full text-sm font-bold transition-all whitespace-nowrap ${
              activeCategory === category
                ? 'bg-purple-600 text-white shadow-lg transform scale-105'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {category}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">影片載入中...</div>
      ) : filteredVideos.length > 0 ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredVideos.map((video) => (
            <div key={video.id} className="group bg-gray-50 rounded-xl overflow-hidden hover:shadow-lg transition-all border border-gray-100">
              <div className="aspect-video bg-black relative">
                 {video.url.includes('embed') ? (
                   <iframe 
                     src={video.url} 
                     className="w-full h-full" 
                     title={video.title}
                     allowFullScreen
                   ></iframe>
                 ) : (
                   <div className="w-full h-full flex items-center justify-center bg-gray-800 text-white flex-col p-4 text-center">
                     <p className="mb-2">📺</p>
                     <a href={video.url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline text-sm break-all">
                       點擊前往觀看影片
                     </a>
                     <p className="text-xs text-gray-500 mt-2">(非內嵌格式)</p>
                   </div>
                 )}
              </div>
              
              <div className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-gray-800 line-clamp-2 group-hover:text-purple-600 transition-colors">
                    {video.title}
                  </h3>
                  <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-md whitespace-nowrap ml-2">
                    {video.category}
                  </span>
                </div>
                {video.description && (
                  <p className="text-sm text-gray-500 line-clamp-2">{video.description}</p>
                )}
              </div>
            </div>
          ))}
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

import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { PlayCircle, ExternalLink, Film, Hash } from 'lucide-react';

export default function VideoGallery() {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);

  // 讀取資料
  useEffect(() => {
    const q = query(collection(db, 'training_videos'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // 排序: 先按分類排，再按建立時間排
      data.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setVideos(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // 輔助函式：取得 YouTube ID
  const getYouTubeId = (url) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  // 核心邏輯：將影片依分類分組
  const groupedVideos = videos.reduce((groups, video) => {
    const category = video.category || '未分類影片';
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(video);
    return groups;
  }, {});

  // 取得所有分類名稱 (可在此處自訂排序邏輯，目前暫時依出現順序)
  const categories = Object.keys(groupedVideos).sort();

  if (loading) return <div className="text-center py-20 text-slate-400 animate-pulse font-bold">載入影片庫中...</div>;

  if (videos.length === 0) {
    return (
      <div className="text-center py-20 text-slate-400">
        <Film className="w-16 h-16 mx-auto mb-4 opacity-20"/>
        <p className="font-bold">目前還沒有教學影片 🎬</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-10">
      
      {/* 頂部介紹 */}
      <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl flex items-start gap-3">
        <PlayCircle className="w-6 h-6 text-indigo-600 mt-0.5 flex-shrink-0" />
        <div>
          <h3 className="font-bold text-indigo-900 text-sm">影音學習區</h3>
          <p className="text-xs text-indigo-700 mt-1">
            這裡收集了重要的系統操作與調劑流程影片，建議連上 Wi-Fi 觀看。
          </p>
        </div>
      </div>

      {/* 依分類渲染區塊 */}
      {categories.map(category => (
        <div key={category}>
            {/* 分類標題 */}
            <div className="flex items-center gap-2 mb-4 px-1">
                <Hash className="w-5 h-5 text-blue-500" />
                <h3 className="text-lg font-black text-slate-800">{category}</h3>
                <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                    {groupedVideos[category].length}
                </span>
            </div>

            {/* 該分類下的影片 Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {groupedVideos[category].map(video => {
                const youtubeId = getYouTubeId(video.url);
                
                return (
                    <div key={video.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden group hover:shadow-md transition-shadow">
                        {youtubeId ? (
                            // YouTube 嵌入模式
                            <div className="aspect-video w-full bg-black">
                            <iframe
                                className="w-full h-full"
                                src={`https://www.youtube.com/embed/${youtubeId}`}
                                title={video.title}
                                frameBorder="0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                            ></iframe>
                            </div>
                        ) : (
                            // 非 YouTube 連結模式
                            <div className="aspect-video w-full bg-slate-50 flex flex-col items-center justify-center p-6 text-center border-b border-slate-100">
                                <Film className="w-12 h-12 text-slate-300 mb-2"/>
                                <span className="text-xs text-slate-400 font-bold">外部影片連結</span>
                            </div>
                        )}
                        
                        <div className="p-4">
                            <h3 className="font-bold text-slate-800 mb-1 line-clamp-2 leading-tight">{video.title}</h3>
                            {video.description && (
                            <p className="text-xs text-slate-500 mb-3 line-clamp-2">{video.description}</p>
                            )}
                            
                            <a 
                            href={video.url} 
                            target="_blank" 
                            rel="noreferrer"
                            className="inline-flex items-center justify-center gap-1.5 text-xs font-bold text-blue-600 bg-blue-50 px-3 py-2.5 rounded-lg hover:bg-blue-100 transition-colors w-full mt-1"
                            >
                            <ExternalLink className="w-3.5 h-3.5"/> {youtubeId ? '在 YouTube 開啟' : '點擊觀看影片'}
                            </a>
                        </div>
                    </div>
                );
                })}
            </div>
        </div>
      ))}
    </div>
  );
}
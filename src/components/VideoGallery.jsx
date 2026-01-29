import React, { useState, useEffect } from 'react';
import { Video, Play, ExternalLink, Loader } from 'lucide-react';
import { db } from '../firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';

const VideoGallery = () => {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // ★★★ 關鍵修正：集合名稱改為 'training_videos' ★★★
    const q = query(collection(db, 'training_videos'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const videoList = [];
      snapshot.forEach((doc) => {
        videoList.push({ id: doc.id, ...doc.data() });
      });
      setVideos(videoList);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader className="w-8 h-8 animate-spin text-pink-600" />
        <span className="ml-2 text-gray-500">正在載入教學影片...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <Video className="w-6 h-6 text-pink-600" />
          影音教學專區
        </h2>
        <p className="text-gray-500 mt-1">共 {videos.length} 部教學影片</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {videos.map((video) => (
          <div key={video.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
            {/* 影片縮圖或嵌入 */}
            <div className="aspect-video bg-gray-900 relative group">
              {video.url?.includes('youtube.com') || video.url?.includes('youtu.be') ? (
                <iframe 
                  src={video.url.replace('watch?v=', 'embed/').replace('youtu.be/', 'www.youtube.com/embed/')}
                  title={video.title}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                ></iframe>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white">
                  <Play className="w-12 h-12 opacity-50" />
                </div>
              )}
            </div>
            
            <div className="p-4">
              <h3 className="font-bold text-gray-800 mb-2 line-clamp-1">{video.title}</h3>
              <p className="text-sm text-gray-500 mb-4 line-clamp-2">{video.description || '無描述'}</p>
              
              <a 
                href={video.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-pink-600 hover:text-pink-700 font-medium"
              >
                <ExternalLink className="w-4 h-4" />
                前往觀看
              </a>
            </div>
          </div>
        ))}

        {videos.length === 0 && (
          <div className="col-span-full py-12 text-center text-gray-500 bg-gray-50 rounded-lg border border-dashed border-gray-300">
            目前沒有教學影片資料 (training_videos)
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoGallery;

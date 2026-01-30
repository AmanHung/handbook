import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';

const SOPManager = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  
  const [sops, setSops] = useState([]);
  const [loading, setLoading] = useState(true);

  // 1. 從 Firebase 讀取資料 (sop_articles)
  useEffect(() => {
    const q = query(collection(db, 'sop_articles'), orderBy('updatedAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSops(list);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching SOPs:", error);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const categories = ['All', ...new Set(sops.map(sop => sop.category).filter(Boolean))];

  const filteredSOPs = sops.filter(sop => {
    const matchesSearch = 
      (sop.title?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (sop.content?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (sop.keywords?.some(k => k.toLowerCase().includes(searchTerm.toLowerCase())));
    
    const matchesCategory = selectedCategory === 'All' || sop.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
        <span className="bg-blue-100 text-blue-600 p-2 rounded-lg mr-3">📄</span>
        SOP 標準作業程序速查
      </h2>

      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <div className="flex-1 relative">
          <input
            type="text"
            placeholder="搜尋 SOP (標題、內容或關鍵字)..."
            className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <span className="absolute left-3 top-3.5 text-gray-400">🔍</span>
        </div>
        
        <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                selectedCategory === cat
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">
          資料載入中...
        </div>
      ) : filteredSOPs.length > 0 ? (
        <div className="grid gap-4">
          {filteredSOPs.map(sop => (
            <div key={sop.id} className="border border-gray-100 rounded-xl p-5 hover:shadow-md transition-shadow bg-white group">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded">
                      {sop.category}
                    </span>
                    {sop.updatedAt && (
                      <span className="text-xs text-gray-400">
                        更新於 {new Date(sop.updatedAt.seconds * 1000).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  <h3 className="text-lg font-bold text-gray-800 group-hover:text-blue-600 transition-colors">
                    {sop.title}
                  </h3>
                </div>
              </div>
              
              <div className="text-gray-600 text-sm leading-relaxed mb-4 line-clamp-3">
                {sop.content}
              </div>

              <div className="flex justify-between items-center pt-3 border-t border-gray-50">
                <div className="flex gap-2 flex-wrap">
                  {sop.keywords?.map((k, idx) => (
                    <span key={idx} className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">#{k}</span>
                  ))}
                </div>
                <button 
                  className="text-blue-500 text-sm font-medium hover:underline"
                  onClick={() => alert(sop.content)}
                >
                  閱讀全文
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-300">
          <p className="text-gray-500 font-medium">找不到符合的 SOP 資料</p>
        </div>
      )}
    </div>
  );
};

export default SOPManager;

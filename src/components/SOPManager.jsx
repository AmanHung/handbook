import React, { useState, useEffect } from 'react';
import { 
  BookOpen, 
  Search, 
  FileText, 
  ExternalLink,
  Tag,
  Filter,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { db } from '../firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
// 這裡使用具名匯入，並取別名為 localSopData
import { sopData as localSopData } from '../data/sopData';

const SOPManager = () => {
  const [sops, setSops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [error, setError] = useState(null);

  // 從 Firebase 監聽資料更新
  useEffect(() => {
    setLoading(true);
    
    // 指向正確的集合名稱 'sop_articles'
    const q = query(collection(db, 'sop_articles'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const firebaseData = [];
      snapshot.forEach((doc) => {
        firebaseData.push({ id: doc.id, ...doc.data(), source: 'cloud' });
      });

      // 如果雲端有資料，優先顯示雲端資料
      // 如果雲端完全沒資料，才顯示本地備份 (避免空白)
      if (firebaseData.length === 0 && localSopData && localSopData.length > 0) {
         const localWithSource = localSopData.map(item => ({ 
           ...item, 
           source: 'local', 
           id: `local_${item.id || Math.random()}` 
         }));
         setSops(localWithSource);
      } else {
         setSops(firebaseData);
      }

      setLoading(false);
      setError(null);
    }, (err) => {
      console.error("讀取 SOP 失敗:", err);
      setError("無法讀取雲端資料 (sop_articles)，已切換為離線模式。");
      // 發生錯誤時，回退到本地資料
      if (localSopData) {
        setSops(localSopData.map(item => ({ ...item, source: 'local', id: `local_${item.id}` })));
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // 篩選邏輯
  const filteredSops = sops.filter(sop => {
    const matchesSearch = sop.title?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          sop.category?.includes(searchTerm);
    const matchesCategory = categoryFilter === 'All' || sop.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  // 取得所有不重複的類別
  const categories = ['All', ...new Set(sops.map(sop => sop.category || '未分類'))];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-indigo-600" />
            SOP 標準作業程序
          </h2>
          <p className="text-gray-500 text-sm mt-1">
            共 {filteredSops.length} 份文件 
            {loading && <span className="ml-2 text-indigo-500 animate-pulse">(同步中...)</span>}
          </p>
        </div>
        
        {/* Search & Filter */}
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="搜尋 SOP..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none w-full sm:w-64"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="pl-9 pr-8 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none appearance-none bg-white cursor-pointer"
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg flex items-center gap-2 text-sm border border-red-200">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}

      {/* Content Grid */}
      {loading && sops.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-gray-400">
          <RefreshCw className="w-8 h-8 animate-spin mb-2" />
          <p>正在載入資料庫...</p>
        </div>
      ) : filteredSops.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-100 text-gray-500">
          <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p>找不到符合的 SOP 文件</p>
          <button 
            onClick={() => {setSearchTerm(''); setCategoryFilter('All');}}
            className="mt-2 text-indigo-600 hover:underline text-sm"
          >
            清除搜尋條件
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSops.map((sop) => (
            <a
              key={sop.id}
              href={sop.link}
              target="_blank"
              rel="noopener noreferrer"
              className="group block bg-white p-5 rounded-xl border border-gray-200 hover:border-indigo-500 hover:shadow-md transition-all duration-200 relative overflow-hidden"
            >
              <div className={`absolute top-0 right-0 px-2 py-1 text-[10px] font-bold text-white rounded-bl-lg ${
                sop.source === 'cloud' ? 'bg-indigo-500' : 'bg-gray-400'
              }`}>
                {sop.source === 'cloud' ? 'CLOUD' : 'LOCAL'}
              </div>

              <div className="flex items-start justify-between mb-3">
                <div className={`p-2 rounded-lg ${
                  sop.category === '門診' ? 'bg-blue-50 text-blue-600' :
                  sop.category === '住院' ? 'bg-green-50 text-green-600' :
                  sop.category === '臨床' ? 'bg-purple-50 text-purple-600' :
                  'bg-gray-100 text-gray-600'
                }`}>
                  <FileText className="w-6 h-6" />
                </div>
                <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-indigo-500 transition-colors" />
              </div>
              
              <h3 className="font-bold text-gray-800 mb-1 group-hover:text-indigo-600 line-clamp-2">
                {sop.title}
              </h3>
              
              <div className="flex items-center gap-2 mt-3">
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-gray-50 text-xs text-gray-600 border border-gray-100">
                  <Tag className="w-3 h-3" />
                  {sop.category || '未分類'}
                </span>
                {sop.updatedAt && (
                  <span className="text-xs text-gray-400">
                    {new Date(sop.updatedAt).toLocaleDateString()}
                  </span>
                )}
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
};

export default SOPManager;

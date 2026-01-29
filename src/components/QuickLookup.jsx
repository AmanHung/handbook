import React, { useState, useEffect } from 'react';
import { 
  Search, 
  FileText, 
  Phone, 
  ExternalLink,
  BookOpen,
  Tag
} from 'lucide-react';
import { db } from '../firebase';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { EXTENSION_DATA } from '../data/sopData';

const QuickLookup = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sops, setSops] = useState([]);
  const [loading, setLoading] = useState(true);

  // 讀取 Firebase SOP 資料
  useEffect(() => {
    const q = query(collection(db, 'sop_articles'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const sopList = [];
      snapshot.forEach((doc) => {
        sopList.push({ id: doc.id, ...doc.data() });
      });
      setSops(sopList);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // 搜尋過濾邏輯
  const filteredExtensions = EXTENSION_DATA.filter(item => 
    item.area.includes(searchTerm) || 
    item.ext.includes(searchTerm) ||
    item.note.includes(searchTerm)
  );

  const filteredSops = sops.filter(sop => 
    sop.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sop.category?.includes(searchTerm)
  );

  // 判斷是否有搜尋結果
  const hasResults = filteredExtensions.length > 0 || filteredSops.length > 0;

  return (
    <div className="space-y-8">
      {/* 搜尋區塊 */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
          <Search className="w-6 h-6 text-indigo-600" />
          藥師業務速查
        </h2>
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="請輸入關鍵字：分機、SOP 名稱..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-lg shadow-inner"
          />
        </div>
        <p className="text-xs text-gray-400 mt-2 ml-1">
          支援搜尋：分機號碼 (如 1151)、SOP 標題
        </p>
      </div>

      {/* 搜尋結果區塊 */}
      {!hasResults && searchTerm !== '' ? (
        <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-lg">
          查無相關資料，請嘗試其他關鍵字。
        </div>
      ) : (
        <div className="space-y-8">
          
          {/* 1. SOP 文件列表 (優先顯示) */}
          {(searchTerm === '' || filteredSops.length > 0) && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-gray-700 flex items-center gap-2 border-l-4 border-indigo-500 pl-3">
                <BookOpen className="w-5 h-5 text-indigo-500" /> SOP 標準作業程序
              </h3>
              
              {loading ? (
                <p className="text-gray-500">載入中...</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredSops.map((sop) => (
                    <a
                      key={sop.id}
                      href={sop.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group block bg-white p-4 rounded-xl border border-gray-200 hover:border-indigo-500 hover:shadow-md transition-all relative"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className={`p-2 rounded-lg ${
                          sop.category === '門診' ? 'bg-blue-50 text-blue-600' :
                          sop.category === '住院' ? 'bg-green-50 text-green-600' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          <FileText className="w-5 h-5" />
                        </div>
                        <ExternalLink className="w-4 h-4 text-gray-300 group-hover:text-indigo-500" />
                      </div>
                      <h4 className="font-bold text-gray-800 group-hover:text-indigo-600 line-clamp-2 mb-2">
                        {sop.title}
                      </h4>
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-gray-50 text-xs text-gray-500">
                        <Tag className="w-3 h-3" /> {sop.category || '未分類'}
                      </span>
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 3. 常用分機查詢 */}
          {(searchTerm === '' || filteredExtensions.length > 0) && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-gray-700 flex items-center gap-2 border-l-4 border-green-500 pl-3">
                <Phone className="w-5 h-5 text-green-500" /> 常用分機
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {filteredExtensions.map((item, idx) => (
                  <div key={idx} className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm flex flex-col items-center text-center hover:border-green-400 transition-colors">
                    <span className="text-gray-500 text-xs mb-1">{item.area}</span>
                    <span className="text-xl font-mono font-bold text-green-700">{item.ext}</span>
                    {item.note && <span className="text-xs text-gray-400 mt-1">{item.note}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
};

export default QuickLookup;

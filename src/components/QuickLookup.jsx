import React, { useState, useEffect } from 'react';
import { 
  Search, 
  FileText, 
  Phone, 
  ExternalLink,
  BookOpen,
  Tag,
  X,
  Link as LinkIcon
} from 'lucide-react';
import { db } from '../firebase';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { EXTENSION_DATA, sopData as localSopData } from '../data/sopData';

const QuickLookup = () => {
  const [searchTerm, setSearchTerm] = useState('');
  // 預設先顯示本地資料
  const [sops, setSops] = useState(localSopData.map(item => ({ ...item, source: 'local', id: `local_${item.id}` })));
  const [loading, setLoading] = useState(true);
  
  // 用於顯示文字型 SOP 的彈出視窗狀態
  const [selectedSop, setSelectedSop] = useState(null);

  // 讀取 Firebase SOP 資料
  useEffect(() => {
    const q = query(collection(db, 'sop_articles'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const firebaseData = [];
      snapshot.forEach((doc) => {
        firebaseData.push({ id: doc.id, ...doc.data(), source: 'cloud' });
      });

      if (firebaseData.length > 0) {
        setSops(firebaseData);
      } else {
        // 若雲端無資料，維持顯示本地資料，不需做任何事
        console.log("Firebase 尚無 SOP 資料，顯示預設值");
      }
      
      setLoading(false);
    }, (error) => {
      console.error("讀取失敗，維持本地模式:", error);
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
          
          {/* 1. SOP 文件列表 */}
          {(searchTerm === '' || filteredSops.length > 0) && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-gray-700 flex items-center gap-2 border-l-4 border-indigo-500 pl-3">
                <BookOpen className="w-5 h-5 text-indigo-500" /> SOP 標準作業程序
              </h3>
              
              {loading ? (
                <p className="text-gray-500">同步資料中...</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredSops.map((sop) => (
                    <div
                      key={sop.id}
                      onClick={() => {
                        // 邏輯：有內文 -> 開彈窗；沒內文但有連結 -> 直接開連結
                        if (sop.content && sop.content.trim() !== '') {
                          setSelectedSop(sop);
                        } else if (sop.link && sop.link !== '#') {
                          window.open(sop.link, '_blank');
                        } else {
                          // 兩者皆無 (或是預設空資料)
                          alert("此項目暫無詳細內容或連結");
                        }
                      }}
                      className="group block bg-white p-4 rounded-xl border border-gray-200 hover:border-indigo-500 hover:shadow-md transition-all relative cursor-pointer"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className={`p-2 rounded-lg ${
                          sop.category === '門診' ? 'bg-blue-50 text-blue-600' :
                          sop.category === '住院' ? 'bg-green-50 text-green-600' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          <FileText className="w-5 h-5" />
                        </div>
                        {/* 根據是否有內文顯示不同圖示 */}
                        {sop.content ? (
                           <BookOpen className="w-4 h-4 text-gray-300 group-hover:text-indigo-500" />
                        ) : (
                           <ExternalLink className="w-4 h-4 text-gray-300 group-hover:text-indigo-500" />
                        )}
                      </div>
                      <h4 className="font-bold text-gray-800 group-hover:text-indigo-600 line-clamp-2 mb-2">
                        {sop.title}
                      </h4>
                      <div className="flex justify-between items-center mt-2">
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-gray-50 text-xs text-gray-500">
                            <Tag className="w-3 h-3" /> {sop.category || '未分類'}
                        </span>
                        {/* 如果同時有連結，顯示小圖示提示 */}
                        {sop.link && sop.link !== '#' && (
                            <LinkIcon className="w-3 h-3 text-gray-400" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 2. 常用分機查詢 */}
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

      {/* SOP 閱讀彈窗 (Modal) */}
      {selectedSop && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setSelectedSop(null)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col animate-fade-in" onClick={e => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="text-lg font-bold text-gray-800">{selectedSop.title}</h3>
              <button 
                onClick={() => setSelectedSop(null)}
                className="p-1 rounded-full hover:bg-gray-200 text-gray-500 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Modal Content */}
            <div className="p-6 overflow-y-auto whitespace-pre-wrap leading-relaxed text-gray-700 text-lg">
              {selectedSop.content || "暫無詳細文字內容。"}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-between items-center">
                <span className="text-xs text-gray-400 flex items-center">
                    分類：{selectedSop.category}
                </span>
                
                <div className="flex gap-2">
                    {/* 如果有連結，顯示前往按鈕 */}
                    {selectedSop.link && selectedSop.link !== '#' && (
                        <a 
                            href={selectedSop.link} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50 transition-colors flex items-center gap-1"
                        >
                            <ExternalLink className="w-4 h-4" /> 開啟附件連結
                        </a>
                    )}
                    
                    <button 
                        onClick={() => setSelectedSop(null)}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 transition-colors"
                    >
                        關閉
                    </button>
                </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuickLookup;

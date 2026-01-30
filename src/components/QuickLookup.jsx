import React, { useState, useEffect } from 'react';
import { 
  Search, 
  FileText, 
  Phone, 
  ExternalLink,
  BookOpen,
  X,
  Paperclip
} from 'lucide-react';
import { db } from '../firebase';
import { collection, onSnapshot, query, doc, getDoc } from 'firebase/firestore';
import { EXTENSION_DATA, sopData as localSopData } from '../data/sopData';

// 預設常用關鍵字
const DEFAULT_KEYWORDS = ['門診', '住院', '行政', '臨床', '管制藥', '盤點', '急診'];

const QuickLookup = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('sop'); 
  
  const [sops, setSops] = useState(
    Array.isArray(localSopData) 
      ? localSopData.map(item => ({ ...item, source: 'local', id: `local_${item.id}` })) 
      : []
  );
  const [keywords, setKeywords] = useState(DEFAULT_KEYWORDS);
  const [loading, setLoading] = useState(true);
  
  const [selectedSop, setSelectedSop] = useState(null);

  useEffect(() => {
    const q = query(collection(db, 'sop_articles'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const firebaseData = [];
      snapshot.forEach((doc) => {
        firebaseData.push({ id: doc.id, ...doc.data() });
      });

      if (firebaseData.length > 0) setSops(firebaseData);
      setLoading(false);
    }, (error) => {
      console.error("讀取失敗，維持本地模式:", error);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const docRef = doc(db, "site_settings", "sop_config");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.quickKeywords && Array.isArray(data.quickKeywords)) setKeywords(data.quickKeywords);
        }
      } catch (e) { console.error("讀取關鍵字失敗:", e); }
    };
    fetchSettings();
  }, []);

  const getCategoryStyle = (category) => {
    if (!category) return 'bg-gray-100 text-gray-600';
    const fixedColors = {
      '門診': 'bg-orange-100 text-orange-800',
      '住院': 'bg-rose-100 text-rose-800',
      '急診': 'bg-red-100 text-red-800',
      '行政流程': 'bg-stone-100 text-stone-800',
      '臨床藥學': 'bg-amber-100 text-amber-800',
      '教學': 'bg-yellow-100 text-yellow-800',
      '管制藥': 'bg-pink-100 text-pink-800',
      '藥品諮詢': 'bg-lime-100 text-lime-800',
      '調劑規範': 'bg-emerald-100 text-emerald-800',
      '公文': 'bg-warmGray-100 text-warmGray-800',
    };
    if (fixedColors[category]) return fixedColors[category];
    const dynamicColors = [
      'bg-orange-200 text-orange-900', 'bg-amber-200 text-amber-900',
      'bg-yellow-200 text-yellow-900', 'bg-rose-200 text-rose-900',
      'bg-pink-200 text-pink-900', 'bg-red-200 text-red-900',
      'bg-stone-200 text-stone-900', 'bg-lime-200 text-lime-900',
      'bg-fuchsia-100 text-fuchsia-800', 'bg-violet-100 text-violet-800',
      'bg-indigo-100 text-indigo-800', 'bg-teal-100 text-teal-800', 
    ];
    let hash = 0;
    for (let i = 0; i < category.length; i++) hash = category.charCodeAt(i) + ((hash << 5) - hash);
    const index = Math.abs(hash) % dynamicColors.length;
    return dynamicColors[index];
  };

  const filteredExtensions = EXTENSION_DATA.filter(item => 
    item.area.includes(searchTerm) || item.ext.includes(searchTerm) || item.note.includes(searchTerm)
  );

  const filteredSops = sops
    .filter(sop => sop.title?.toLowerCase().includes(searchTerm.toLowerCase()) || sop.category?.includes(searchTerm))
    .sort((a, b) => (a.category || '').localeCompare(b.category || ''));

  return (
    <div className="space-y-0 sm:space-y-6"> {/* 手機版無間距 */}
      
      {/* 修正：手機版無圓角無邊框，p-4 */}
      <div className="bg-white p-4 md:p-6 md:rounded-xl md:shadow-sm md:border border-gray-100">
        <h2 className="text-xl md:text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
          <Search className="w-5 h-5 md:w-6 md:h-6 text-orange-500" />
          關鍵字查詢
        </h2>
        <div className="relative mb-4">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="請輸入關鍵字：分機、SOP 名稱..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-400 focus:border-orange-400 outline-none text-base md:text-lg shadow-inner bg-gray-50 md:bg-white"
          />
        </div>
        
        <div className="flex flex-wrap gap-2">
          <span className="text-sm text-gray-500 flex items-center mr-1">常用：</span>
          {keywords.map((keyword, idx) => (
            <button
              key={`${keyword}-${idx}`}
              onClick={() => setSearchTerm(keyword)}
              className="px-3 py-1 bg-orange-50 hover:bg-orange-100 text-orange-700 hover:text-orange-900 rounded-full text-xs transition-colors border border-orange-100"
            >
              {keyword}
            </button>
          ))}
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm('')}
              className="px-3 py-1 bg-gray-100 text-gray-500 hover:bg-gray-200 rounded-full text-xs transition-colors border border-gray-200 ml-auto"
            >
              清除
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 bg-white md:rounded-t-xl px-0 md:px-2 pt-2 sticky top-16 z-40 shadow-sm md:shadow-none">
        <button
          onClick={() => setActiveTab('sop')}
          className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 transition-all relative top-[1px] md:rounded-t-lg ${
            activeTab === 'sop' 
              ? 'text-orange-600 bg-orange-50 border-b-2 border-orange-500 md:border-b-0 md:border-x md:border-t md:border-orange-100' 
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
          }`}
        >
          <BookOpen className="w-4 h-4" /> SOP 文件 ({filteredSops.length})
        </button>
        <button
          onClick={() => setActiveTab('extension')}
          className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 transition-all relative top-[1px] md:rounded-t-lg ${
            activeTab === 'extension' 
              ? 'text-green-600 bg-green-50 border-b-2 border-green-500 md:border-b-0 md:border-x md:border-t md:border-green-100' 
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
          }`}
        >
          <Phone className="w-4 h-4" /> 常用分機 ({filteredExtensions.length})
        </button>
      </div>

      {/* Content Area */}
      <div className="min-h-[300px] bg-gray-50 p-2 md:bg-transparent md:p-0">
        {activeTab === 'sop' && (
          <div className="space-y-4 animate-fade-in">
            {loading ? (
              <p className="text-gray-500 text-center py-4">資料同步中...</p>
            ) : filteredSops.length === 0 ? (
              <div className="text-center py-12 text-gray-400 bg-white rounded-lg border border-dashed border-gray-200">
                無符合文件
              </div>
            ) : (
              // 修正：手機版 gap-2
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 md:gap-4">
                {filteredSops.map((sop) => (
                  <div
                    key={sop.id}
                    onClick={() => {
                      if (sop.content && sop.content.trim() !== '') {
                        setSelectedSop(sop);
                      } else if (sop.attachmentUrl) {
                        window.open(sop.attachmentUrl, '_blank');
                      } else {
                        alert("此 SOP 僅有標題，暫無詳細內容。");
                      }
                    }}
                    // 修正：手機版無邊框，陰影更小
                    className="group relative bg-white p-4 md:p-5 rounded-lg md:rounded-xl shadow-sm md:border border-gray-100 hover:border-orange-300 hover:shadow-md transition-all cursor-pointer overflow-hidden text-left"
                  >
                    <div className={`absolute top-0 left-0 px-3 py-1 text-xs font-bold rounded-br-lg ${getCategoryStyle(sop.category)}`}>
                      {sop.category || '未分類'}
                    </div>

                    <div className="mt-6 flex items-start justify-between">
                      <h4 className="font-bold text-gray-800 text-lg group-hover:text-orange-600 leading-snug line-clamp-2">
                        {sop.title}
                      </h4>
                      <div className="flex-shrink-0 ml-3 text-gray-400 group-hover:text-orange-500">
                        {sop.content ? <BookOpen className="w-5 h-5" /> : <ExternalLink className="w-5 h-5" />}
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-end text-xs text-gray-400 h-5">
                      {sop.attachmentUrl && (
                        <span className="flex items-center gap-1 text-orange-600 font-medium bg-orange-50 px-2 py-0.5 rounded-full border border-orange-100">
                          <Paperclip className="w-3 h-3" /> 包含附件
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'extension' && (
          <div className="space-y-4 animate-fade-in">
            {filteredExtensions.length === 0 ? (
              <div className="text-center py-12 text-gray-400 bg-white rounded-lg border border-dashed border-gray-200">
                無符合分機
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 md:gap-3">
                {filteredExtensions.map((item, idx) => (
                  <div key={idx} className="bg-white p-3 rounded-lg border border-gray-100 shadow-sm flex flex-col justify-center text-center hover:border-green-400 transition-colors">
                    <span className="text-gray-500 text-xs mb-1 font-medium">{item.area}</span>
                    <span className="text-xl font-mono font-bold text-green-700 tracking-wider">{item.ext}</span>
                    {item.note && <span className="text-[10px] text-gray-400 mt-1 bg-gray-50 px-1 rounded inline-block mx-auto">{item.note}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {selectedSop && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setSelectedSop(null)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col animate-fade-in text-left" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="text-lg font-bold text-gray-800">{selectedSop.title}</h3>
              <button onClick={() => setSelectedSop(null)} className="p-1 rounded-full hover:bg-gray-200 text-gray-500 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto whitespace-pre-wrap leading-relaxed text-gray-700 text-lg">
              {selectedSop.content || "暫無詳細文字內容。"}
            </div>

            <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-between items-center">
                <span className={`text-xs px-2 py-1 rounded ${getCategoryStyle(selectedSop.category)}`}>
                    {selectedSop.category}
                </span>
                
                <div className="flex gap-2">
                    {selectedSop.attachmentUrl && (
                        <a href={selectedSop.attachmentUrl} target="_blank" rel="noopener noreferrer" className="px-4 py-2 bg-orange-50 border border-orange-200 text-orange-700 rounded-lg text-sm hover:bg-orange-100 transition-colors flex items-center gap-1 font-medium">
                            <ExternalLink className="w-4 h-4" /> 下載/開啟附件
                        </a>
                    )}
                    <button onClick={() => setSelectedSop(null)} className="px-4 py-2 bg-gray-600 text-white rounded-lg text-sm hover:bg-gray-700 transition-colors">
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

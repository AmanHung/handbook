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
  
  // 初始化資料 (支援本地+Firebase)
  const [sops, setSops] = useState(
    Array.isArray(localSopData) 
      ? localSopData.map(item => ({ ...item, source: 'local', id: `local_${item.id}` })) 
      : []
  );
  const [keywords, setKeywords] = useState(DEFAULT_KEYWORDS);
  const [loading, setLoading] = useState(true);
  
  const [selectedSop, setSelectedSop] = useState(null);

  // 1. 讀取 Firebase SOP 資料
  useEffect(() => {
    const q = query(collection(db, 'sop_articles'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const firebaseData = [];
      snapshot.forEach((doc) => {
        firebaseData.push({ id: doc.id, ...doc.data() });
      });

      if (firebaseData.length > 0) {
        setSops(firebaseData);
      }
      setLoading(false);
    }, (error) => {
      console.error("讀取失敗，維持本地模式:", error);
      setLoading(false);
    });
    
    return () => unsubscribe();
  }, []);

  // 2. 讀取常用關鍵字
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const docRef = doc(db, "site_settings", "sop_config");
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.quickKeywords && Array.isArray(data.quickKeywords)) {
            setKeywords(data.quickKeywords);
          }
        }
      } catch (e) {
        console.error("讀取關鍵字失敗，使用預設值:", e);
      }
    };
    fetchSettings();
  }, []);

  // 取得分類對應的顏色樣式
  const getCategoryStyle = (category) => {
    const map = {
      '門診': 'bg-blue-500 text-white',
      '住院': 'bg-emerald-500 text-white',
      '行政': 'bg-slate-500 text-white',
      '臨床': 'bg-rose-500 text-white',
      '急診': 'bg-orange-500 text-white',
      '教學': 'bg-purple-500 text-white',
    };
    return map[category] || 'bg-indigo-500 text-white';
  };

  // 搜尋與排序邏輯
  const filteredExtensions = EXTENSION_DATA.filter(item => 
    item.area.includes(searchTerm) || 
    item.ext.includes(searchTerm) ||
    item.note.includes(searchTerm)
  );

  const filteredSops = sops
    .filter(sop => 
      sop.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sop.category?.includes(searchTerm)
    )
    .sort((a, b) => (a.category || '').localeCompare(b.category || ''));

  return (
    <div className="space-y-6">
      {/* 搜尋區塊 */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
          <Search className="w-6 h-6 text-indigo-600" />
          關鍵字查詢
        </h2>
        <div className="relative mb-4">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="請輸入關鍵字：分機、SOP 名稱..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-lg shadow-inner"
          />
        </div>
        
        {/* 常用關鍵字按鈕區 */}
        <div className="flex flex-wrap gap-2">
          <span className="text-sm text-gray-500 flex items-center mr-1">常用：</span>
          {keywords.map((keyword, idx) => (
            <button
              key={`${keyword}-${idx}`}
              onClick={() => setSearchTerm(keyword)}
              className="px-3 py-1 bg-gray-100 hover:bg-indigo-100 text-gray-600 hover:text-indigo-600 rounded-full text-xs transition-colors border border-gray-200"
            >
              {keyword}
            </button>
          ))}
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm('')}
              className="px-3 py-1 bg-red-50 text-red-500 hover:bg-red-100 rounded-full text-xs transition-colors border border-red-100 ml-auto"
            >
              清除
            </button>
          )}
        </div>
      </div>

      {/* 分頁切換 Tabs */}
      <div className="flex border-b border-gray-200 bg-white rounded-t-xl px-2 pt-2">
        <button
          onClick={() => setActiveTab('sop')}
          className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 transition-all relative top-[1px] rounded-t-lg ${
            activeTab === 'sop' 
              ? 'text-indigo-600 bg-indigo-50 border-x border-t border-indigo-100' 
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
          }`}
        >
          <BookOpen className="w-4 h-4" /> SOP 文件 ({filteredSops.length})
        </button>
        <button
          onClick={() => setActiveTab('extension')}
          className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 transition-all relative top-[1px] rounded-t-lg ${
            activeTab === 'extension' 
              ? 'text-green-600 bg-green-50 border-x border-t border-green-100' 
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
          }`}
        >
          <Phone className="w-4 h-4" /> 常用分機 ({filteredExtensions.length})
        </button>
      </div>

      {/* 內容顯示區塊 */}
      <div className="min-h-[300px]">
        
        {/* Tab 1: SOP 文件列表 */}
        {activeTab === 'sop' && (
          <div className="space-y-4 animate-fade-in">
            {loading ? (
              <p className="text-gray-500 text-center py-4">資料同步中...</p>
            ) : filteredSops.length === 0 ? (
              <div className="text-center py-12 text-gray-400 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                無符合文件
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredSops.map((sop) => (
                  <div
                    key={sop.id}
                    onClick={() => {
                      // 修正：使用 attachmentUrl 判斷
                      if (sop.content && sop.content.trim() !== '') {
                        setSelectedSop(sop);
                      } else if (sop.attachmentUrl) {
                        window.open(sop.attachmentUrl, '_blank');
                      } else {
                        alert("此 SOP 僅有標題，暫無詳細內容。");
                      }
                    }}
                    className="group relative bg-white p-5 rounded-xl border border-gray-200 hover:border-indigo-500 hover:shadow-md transition-all cursor-pointer overflow-hidden text-left"
                  >
                    {/* 左上角分類標籤 */}
                    <div className={`absolute top-0 left-0 px-3 py-1 text-xs font-bold rounded-br-lg ${getCategoryStyle(sop.category)}`}>
                      {sop.category || '未分類'}
                    </div>

                    <div className="mt-6 flex items-start justify-between">
                      <h4 className="font-bold text-gray-800 text-lg group-hover:text-indigo-600 leading-snug line-clamp-2">
                        {sop.title}
                      </h4>
                      
                      {/* 狀態圖示 */}
                      <div className="flex-shrink-0 ml-3 text-gray-400 group-hover:text-indigo-500">
                        {sop.content ? <BookOpen className="w-5 h-5" /> : <ExternalLink className="w-5 h-5" />}
                      </div>
                    </div>

                    {/* 底部資訊列：顯示附件圖示 */}
                    <div className="mt-3 flex items-center justify-end text-xs text-gray-400 h-5">
                      {sop.attachmentUrl && (
                        <span className="flex items-center gap-1 text-indigo-500 font-medium bg-indigo-50 px-2 py-0.5 rounded-full">
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

        {/* Tab 2: 常用分機 */}
        {activeTab === 'extension' && (
          <div className="space-y-4 animate-fade-in">
            {filteredExtensions.length === 0 ? (
              <div className="text-center py-12 text-gray-400 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                無符合分機
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {filteredExtensions.map((item, idx) => (
                  <div key={idx} className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm flex flex-col justify-center text-center hover:border-green-400 transition-colors">
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

      {/* SOP 閱讀彈窗 (Modal) */}
      {selectedSop && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setSelectedSop(null)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col animate-fade-in text-left" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="text-lg font-bold text-gray-800">{selectedSop.title}</h3>
              <button 
                onClick={() => setSelectedSop(null)}
                className="p-1 rounded-full hover:bg-gray-200 text-gray-500 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto whitespace-pre-wrap leading-relaxed text-gray-700 text-lg">
              {selectedSop.content || "暫無詳細文字內容。"}
            </div>

            <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-between items-center">
                <span className={`text-xs px-2 py-1 rounded text-white ${getCategoryStyle(selectedSop.category)}`}>
                    {selectedSop.category}
                </span>
                
                <div className="flex gap-2">
                    {/* 下載連結按鈕 (修正：使用 attachmentUrl) */}
                    {selectedSop.attachmentUrl && (
                        <a 
                            href={selectedSop.attachmentUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="px-4 py-2 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-lg text-sm hover:bg-indigo-100 transition-colors flex items-center gap-1 font-medium"
                        >
                            <ExternalLink className="w-4 h-4" /> 下載/開啟附件
                        </a>
                    )}
                    
                    <button 
                        onClick={() => setSelectedSop(null)}
                        className="px-4 py-2 bg-gray-600 text-white rounded-lg text-sm hover:bg-gray-700 transition-colors"
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

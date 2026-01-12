// src/components/QuickLookup.jsx
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Search, Phone, BookOpen, Loader2, X, ChevronRight, Tag, Link as LinkIcon, ExternalLink, FileText } from 'lucide-react'; 
import { EXTENSION_DATA } from '../data/sopData';
import { db } from '../firebase';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';

// 定義顏色池
const COLOR_PALETTE = [
  { bg: 'bg-blue-50', text: 'text-blue-700' },
  { bg: 'bg-emerald-50', text: 'text-emerald-700' },
  { bg: 'bg-orange-50', text: 'text-orange-700' },
  { bg: 'bg-purple-50', text: 'text-purple-700' },
  { bg: 'bg-rose-50', text: 'text-rose-700' },
  { bg: 'bg-indigo-50', text: 'text-indigo-700' },
  { bg: 'bg-cyan-50', text: 'text-cyan-700' },
  { bg: 'bg-slate-100', text: 'text-slate-700' },
];

// 輔助函式：處理正則表達式特殊字元
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); 
}

export default function QuickLookup() {
  const [activeTab, setActiveTab] = useState('qa');
  const [searchTerm, setSearchTerm] = useState('');
  
  // 資料與設定
  const [sopArticles, setSopArticles] = useState([]);
  const [config, setConfig] = useState({ categories: [], quickKeywords: [] });
  const [loading, setLoading] = useState(false);

  // 用戶互動狀態
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);

  // 閱讀模式
  const [selectedSop, setSelectedSop] = useState(null);
  const firstMatchRef = useRef(null);

  // 初始化
  useEffect(() => {
    const initData = async () => {
      setLoading(true);
      try {
        const sopSnap = await getDocs(collection(db, "sop_articles"));
        const docs = sopSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        const configRef = doc(db, "site_settings", "sop_config");
        const configSnap = await getDoc(configRef);
        let configData = { categories: [], quickKeywords: [] };
        
        if (configSnap.exists()) {
          configData = configSnap.data();
        } else {
          const uniqueCats = [...new Set(docs.map(d => d.category))];
          configData.categories = uniqueCats;
        }

        setSopArticles(docs);
        setConfig(configData);

      } catch (error) {
        console.error("讀取失敗:", error);
      }
      setLoading(false);
    };
    initData();
  }, []);

  // 搜尋互動觸發
  useEffect(() => {
    if (searchTerm) setHasSearched(true);
    if (selectedCategory) setHasSearched(true);
  }, [searchTerm, selectedCategory]);

  // 自動捲動到關鍵字
  useEffect(() => {
    if (selectedSop && searchTerm && firstMatchRef.current) {
      setTimeout(() => {
        firstMatchRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 300);
    }
  }, [selectedSop, searchTerm]);

  const getCategoryColor = (catName) => {
    if (!catName) return COLOR_PALETTE[7];
    const index = catName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return COLOR_PALETTE[index % COLOR_PALETTE.length];
  };

  // 核心篩選邏輯
  const filteredData = useMemo(() => {
    const rawTerms = searchTerm.toLowerCase().trim().split(/\s+/).filter(t => t);
    
    // 1. 篩選
    let matches = sopArticles.filter(article => {
      if (rawTerms.length > 0) {
        const isMatch = rawTerms.every(term => 
          article.title.toLowerCase().includes(term) ||
          article.content.toLowerCase().includes(term) ||
          (article.keywords && article.keywords.some(k => k.toLowerCase().includes(term)))
        );
        if (!isMatch) return false;
      }
      if (selectedCategory && selectedCategory !== '全部' && article.category !== selectedCategory) {
        return false;
      }
      return true;
    });

    // 2. 處理預覽
    const processedMatches = matches.map(article => {
      let snippet = '';
      if (rawTerms.length === 0) {
        snippet = article.content.slice(0, 60) + '...';
      } else {
        const mainTerm = rawTerms[0];
        const contentIndex = article.content.toLowerCase().indexOf(mainTerm);
        if (contentIndex !== -1) {
          const start = Math.max(0, contentIndex - 20);
          const end = Math.min(article.content.length, contentIndex + 60);
          snippet = '...' + article.content.substring(start, end) + '...';
        } else {
          snippet = article.content.slice(0, 80) + '...';
        }
      }
      return { ...article, snippet };
    });

    // 3. 分組
    if (selectedCategory === '全部') {
        const grouped = processedMatches.reduce((acc, curr) => {
            const cat = curr.category || '未分類';
            if (!acc[cat]) acc[cat] = [];
            acc[cat].push(curr);
            return acc;
        }, {});
        return { type: 'grouped', data: grouped };
    }
    return { type: 'list', data: processedMatches };

  }, [searchTerm, sopArticles, selectedCategory]);

  const ExtensionList = () => (
    <div className="space-y-4">
        {EXTENSION_DATA.filter(item => item.area.includes(searchTerm) || item.ext.includes(searchTerm)).map(item => (
            <div key={item.id} className="bg-white p-5 rounded-2xl border border-slate-100 flex items-center justify-between group">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                        <Phone className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-800 text-lg">{item.area}</h3>
                        {item.note && <p className="text-sm text-slate-500">{item.note}</p>}
                    </div>
                </div>
                <span className="text-xl font-black text-emerald-600 tracking-wider">{item.ext}</span>
            </div>
        ))}
    </div>
  );

  return (
    <div className="space-y-4 pb-24">
      {/* 區塊 1: 搜尋與常用關鍵字 */}
      <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 space-y-5">
        {/* 搜尋框 */}
        <div>
            <h2 className="text-2xl font-black text-slate-800 mb-2 pl-1">SOP 速查工具</h2>
            <div className="relative mt-2">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
                type="text"
                placeholder="輸入關鍵字搜尋..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-11 pr-4 py-4 rounded-2xl bg-slate-50 border border-slate-200 text-base font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
            />
            {searchTerm && (
                <button onClick={() => setSearchTerm('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    <X className="w-5 h-5" />
                </button>
            )}
            </div>
        </div>

        {/* 常用關鍵字 */}
        {activeTab === 'qa' && config.quickKeywords && config.quickKeywords.length > 0 && (
            <div className="flex flex-wrap gap-2">
                <span className="text-xs text-slate-400 font-bold flex items-center gap-1 self-center"><Tag className="w-4 h-4"/> 常用:</span>
                {config.quickKeywords.map(k => (
                    <button 
                        key={k}
                        onClick={() => setSearchTerm(k)}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-sm font-bold transition-colors"
                    >
                        {k}
                    </button>
                ))}
            </div>
        )}
      </div>

      {/* 區塊 2: 分頁切換 */}
      <div className="flex bg-slate-200/50 p-1.5 rounded-2xl">
         <button onClick={() => setActiveTab('qa')} className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-black transition-all ${activeTab === 'qa' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
          <BookOpen className="w-5 h-5" /> SOP 手冊
        </button>
        <button onClick={() => setActiveTab('extension')} className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-black transition-all ${activeTab === 'extension' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
          <Phone className="w-5 h-5" /> 常用分機
        </button>
      </div>

      {/* 區塊 3: 分類篩選 */}
      {activeTab === 'qa' && (
        <div className="flex flex-wrap gap-2 pt-1">
          <button
            onClick={() => setSelectedCategory('全部')}
            className={`px-5 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all border ${
              selectedCategory === '全部'
                ? 'bg-slate-800 text-white border-slate-800 shadow-md transform scale-105'
                : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
            }`}
          >
            全部顯示
          </button>
          {config.categories.map(cat => {
            const colorStyle = getCategoryColor(cat);
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-5 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all border ${
                  isSelected
                    ? `${colorStyle.bg} ${colorStyle.text} border-transparent shadow-md transform scale-105`
                    : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {cat}
              </button>
            )
          })}
        </div>
      )}

      {/* 區塊 4: 內容顯示區 */}
      {activeTab === 'qa' ? (
          <div className="space-y-4">
            {loading ? (
               <div className="flex justify-center py-12 text-slate-400 text-lg font-bold"><Loader2 className="animate-spin mr-3 w-6 h-6" /> 資料讀取中...</div>
            ) : !hasSearched ? (
               <div className="text-center py-16 px-4 opacity-60">
                  <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-400">
                      <Search className="w-10 h-10"/>
                  </div>
                  <p className="text-slate-600 font-bold text-lg">請點選上方分類或輸入關鍵字</p>
                  <p className="text-sm text-slate-400 mt-2">系統將篩選出您需要的 SOP</p>
               </div>
            ) : filteredData.type === 'grouped' ? (
                Object.keys(filteredData.data).length === 0 ? (
                    <div className="text-center py-10 text-slate-400 text-base font-bold">沒有符合的資料</div>
                ) : (
                    Object.entries(filteredData.data).map(([catName, articles]) => {
                        const colorStyle = getCategoryColor(catName);
                        return (
                            <div key={catName} className="space-y-3">
                                <div className={`px-4 py-2 rounded-lg inline-block text-sm font-black ${colorStyle.bg} ${colorStyle.text}`}>
                                    {catName}
                                </div>
                                <div className="space-y-4">
                                    {articles.map(article => (
                                        <SopCard 
                                            key={article.id} 
                                            item={article} 
                                            searchTerm={searchTerm} 
                                            colorStyle={colorStyle}
                                            onClick={() => setSelectedSop(article)} 
                                        />
                                    ))}
                                </div>
                            </div>
                        );
                    })
                )
            ) : (
                filteredData.data.length > 0 ? (
                    <div className="space-y-4">
                        {filteredData.data.map(item => (
                             <SopCard 
                                key={item.id} 
                                item={item} 
                                searchTerm={searchTerm} 
                                colorStyle={getCategoryColor(item.category)}
                                onClick={() => setSelectedSop(item)} 
                             />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-12 text-slate-400">
                        <p className="text-lg font-bold">找不到符合條件的 SOP 📭</p>
                    </div>
                )
            )}
          </div>
      ) : (
          <ExtensionList />
      )}

      {/* 閱讀模式 Modal */}
      {selectedSop && (
        <div className="fixed inset-0 z-[100] flex flex-col bg-white animate-in slide-in-from-bottom-10 duration-200">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-white/95 backdrop-blur-md sticky top-0 z-10 shadow-sm">
                <h2 className="font-black text-2xl text-slate-800 truncate pr-4 leading-tight">{selectedSop.title}</h2>
                <button onClick={() => setSelectedSop(null)} className="p-2.5 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-500 transition-colors">
                    <X className="w-8 h-8" />
                </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
                <div className="max-w-3xl mx-auto space-y-6 pb-24">
                    <div className="flex flex-wrap items-center gap-3">
                        <span className={`text-sm font-bold px-3 py-1.5 rounded-lg shadow-sm ${getCategoryColor(selectedSop.category).bg} ${getCategoryColor(selectedSop.category).text}`}>
                            {selectedSop.category}
                        </span>
                        {/* 如果有關鍵字，顯示關鍵字標籤 */}
                        {selectedSop.keywords && selectedSop.keywords.map(k => (
                             <span key={k} className="text-xs font-medium text-slate-500 bg-slate-200 px-2 py-1 rounded">#{k}</span>
                        ))}
                    </div>

                    {/* 連結/附件區塊 */}
                    {selectedSop.links && selectedSop.links.length > 0 && (
                        <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-4">
                            <h4 className="text-sm font-bold text-blue-800 mb-3 flex items-center gap-2">
                                <LinkIcon className="w-4 h-4"/> 相關附件/連結
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {selectedSop.links.map((link, idx) => (
                                    <a 
                                        key={idx}
                                        href={link.url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="flex items-center gap-3 bg-white p-3 rounded-xl border border-blue-100 hover:border-blue-300 hover:shadow-md transition-all group"
                                    >
                                        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                            <FileText className="w-5 h-5"/>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="font-bold text-slate-700 text-sm truncate">{link.name}</div>
                                            <div className="text-[10px] text-slate-400 truncate">{link.url}</div>
                                        </div>
                                        <ExternalLink className="w-4 h-4 text-slate-300 group-hover:text-blue-400"/>
                                    </a>
                                ))}
                            </div>
                        </div>
                    )}
                    
                    {/* 內文區域 - 字體加大、靠左對齊、行高增加 */}
                    <article className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 min-h-[50vh]">
                        <div className="whitespace-pre-wrap leading-loose text-slate-700 font-medium text-lg text-left">
                           <HighlightText content={selectedSop.content} searchTerm={searchTerm} firstMatchRef={firstMatchRef} />
                        </div>
                    </article>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}

// 獨立的高亮文字元件
const HighlightText = ({ content, searchTerm, firstMatchRef = null }) => {
    if (!searchTerm || !searchTerm.trim()) return content;

    const terms = searchTerm.toLowerCase().trim().split(/\s+/).filter(t => t);
    if (terms.length === 0) return content;

    const pattern = new RegExp(`(${terms.map(escapeRegExp).join('|')})`, 'gi');
    const parts = content.split(pattern);
    const firstMatchIndex = parts.findIndex(p => terms.includes(p.toLowerCase()));

    return (
        <span>
            {parts.map((part, i) => {
                const isMatch = terms.includes(part.toLowerCase());
                return isMatch ? (
                    <span 
                        key={i} 
                        ref={firstMatchRef && i === firstMatchIndex ? firstMatchRef : null}
                        className="bg-yellow-300 text-slate-900 font-bold px-1 rounded mx-0.5 inline-block shadow-sm animate-pulse"
                    >
                        {part}
                    </span>
                ) : part;
            })}
        </span>
    );
};

// 獨立的 SOP 卡片 (列表用)
const SopCard = ({ item, searchTerm, colorStyle, onClick }) => (
    <div onClick={onClick} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:border-blue-300 transition-all cursor-pointer active:scale-[0.98] group relative overflow-hidden">
        {/* 如果有連結，顯示小圖示 */}
        {item.links && item.links.length > 0 && (
            <div className="absolute top-0 right-0 bg-blue-100 text-blue-600 px-3 py-1 rounded-bl-xl">
                <LinkIcon className="w-3.5 h-3.5" />
            </div>
        )}

        <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1 min-w-0 mr-4">
                <span className={`text-xs px-2.5 py-1 rounded-lg font-bold whitespace-nowrap ${colorStyle.bg} ${colorStyle.text}`}>{item.category}</span>
                <h3 className="text-lg font-bold text-slate-800 truncate">{item.title}</h3>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-blue-500 transition-colors" />
        </div>
        
        {/* 內文預覽 - 靠左對齊、字體加大 */}
        <div className="text-base text-slate-600 bg-slate-50 p-4 rounded-2xl border border-slate-100 leading-relaxed whitespace-pre-wrap line-clamp-3 text-left">
            <HighlightText content={item.snippet} searchTerm={searchTerm} />
        </div>
    </div>
);
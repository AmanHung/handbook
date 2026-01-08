import React, { useState, useEffect, useMemo } from 'react';
import { Search, Phone, Package, BookOpen, Loader2, X, ChevronRight } from 'lucide-react'; // ✨ 新增 X 和 ChevronRight icon
import { PREPACK_DATA, EXTENSION_DATA } from '../data/sopData';
import { db } from '../firebase';
import { collection, getDocs } from 'firebase/firestore';

export default function QuickLookup() {
  const [activeTab, setActiveTab] = useState('qa');
  const [searchTerm, setSearchTerm] = useState('');

  // 雲端資料狀態
  const [sopArticles, setSopArticles] = useState([]);
  const [loading, setLoading] = useState(false);

  // ✨ 新增：用來控制目前選中的 SOP (閱讀模式狀態)
  const [selectedSop, setSelectedSop] = useState(null);

  // 1. 載入時抓取雲端資料
  useEffect(() => {
    const fetchSOPs = async () => {
      setLoading(true);
      try {
        const querySnapshot = await getDocs(collection(db, "sop_articles"));
        const docs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setSopArticles(docs);
      } catch (error) {
        console.error("讀取失敗:", error);
      }
      setLoading(false);
    };
    fetchSOPs();
  }, []);

  // 2. 搜尋過濾邏輯
  const filteredSOPs = useMemo(() => {
    return sopArticles.filter(article => {
      if (!searchTerm) return true;
      const lowerTerm = searchTerm.toLowerCase();
      return (
        article.title.toLowerCase().includes(lowerTerm) ||
        article.content.toLowerCase().includes(lowerTerm) ||
        (article.keywords && article.keywords.some(k => k.toLowerCase().includes(lowerTerm)))
      );
    }).map(article => {
      // 製作預覽段落 (Snippet)
      if (!searchTerm) {
        return { ...article, snippet: article.content.slice(0, 50) + '...' };
      }
      const contentIndex = article.content.toLowerCase().indexOf(searchTerm.toLowerCase());
      let snippet = '';
      if (contentIndex !== -1) {
        const start = Math.max(0, contentIndex - 15);
        const end = Math.min(article.content.length, contentIndex + 45);
        snippet = '...' + article.content.substring(start, end) + '...';
      } else {
        snippet = article.content.slice(0, 60) + '...';
      }
      return { ...article, snippet };
    });
  }, [searchTerm, sopArticles]);

  // (保留) 預包量邏輯
  const groupedPrepacks = useMemo(() => {
    const filtered = PREPACK_DATA.filter(item => item.name.toLowerCase().includes(searchTerm.toLowerCase()) || item.id.toLowerCase().includes(searchTerm.toLowerCase()));
    const groups = filtered.reduce((acc, item) => {
      const key = item.qty; if (!acc[key]) acc[key] = { qty: item.qty, bag: item.bag, items: [] }; acc[key].items.push(item); return acc;
    }, {});
    return Object.values(groups).sort((a, b) => (parseInt(a.qty)||999) - (parseInt(b.qty)||999));
  }, [searchTerm]);

  // (保留) 分機表邏輯
  const filteredExtensions = EXTENSION_DATA.filter(item => item.area.includes(searchTerm) || item.ext.includes(searchTerm));

  // (保留) 顏色樣式
  const getQtyColorStyles = (qty) => {
      if (qty === '14') return 'bg-emerald-500 text-white border-emerald-600';
      if (qty === '21') return 'bg-rose-500 text-white border-rose-600';
      if (qty === '28') return 'bg-yellow-400 text-yellow-900 border-yellow-500';
      return 'bg-indigo-500 text-white border-indigo-600';
  };

  return (
    <div className="space-y-4 pb-20">
      {/* 搜尋框 */}
      <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
        <h2 className="text-xl font-black text-slate-800 mb-1">SOP 速查工具</h2>
        <div className="relative mt-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder={activeTab === 'qa' ? "搜尋 SOP 資料庫..." : "搜尋..."}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
          />
        </div>
      </div>

      {/* 分頁按鈕 */}
      <div className="flex bg-slate-200/50 p-1 rounded-2xl">
         <button onClick={() => setActiveTab('qa')} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black transition-all ${activeTab === 'qa' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}>
          <BookOpen className="w-4 h-4" /> SOP手冊
        </button>
        <button onClick={() => setActiveTab('prepack')} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black transition-all ${activeTab === 'prepack' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>
          <Package className="w-4 h-4" /> 預包量表
        </button>
        <button onClick={() => setActiveTab('extension')} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black transition-all ${activeTab === 'extension' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400'}`}>
          <Phone className="w-4 h-4" /> 常用分機
        </button>
      </div>

      {/* 列表內容 */}
      <div className="space-y-4">
        {activeTab === 'qa' && (
          <div className="space-y-3">
            {loading ? (
              <div className="flex justify-center py-10 text-slate-400"><Loader2 className="animate-spin mr-2" /> 資料讀取中...</div>
            ) : filteredSOPs.length > 0 ? (
              filteredSOPs.map(item => (
                // ✨ 修改：加入 onClick 觸發閱讀模式
                <div
                  key={item.id}
                  onClick={() => setSelectedSop(item)} // 👈 點擊設定狀態
                  className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:border-blue-200 transition-all cursor-pointer active:scale-95 group"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded font-bold whitespace-nowrap">{item.category}</span>
                        <h3 className="text-sm font-bold text-slate-800 truncate">{item.title}</h3>
                    </div>
                    {/* 箭頭提示可以點擊 */}
                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-400 transition-colors" />
                  </div>

                  <div className="text-sm text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100 leading-relaxed whitespace-pre-wrap line-clamp-2">
                     {/* 搜尋關鍵字高亮 */}
                     {searchTerm ? (
                        <span>
                          {item.snippet.split(new RegExp(`(${searchTerm})`, 'gi')).map((part, i) =>
                            part.toLowerCase() === searchTerm.toLowerCase()
                              ? <span key={i} className="bg-yellow-200 font-bold text-slate-900">{part}</span>
                              : part
                          )}
                        </span>
                     ) : item.snippet}
                  </div>
                </div>
              ))
            ) : (
               <div className="text-center py-8 text-slate-400 text-xs">找不到相關 SOP</div>
            )}
          </div>
        )}

        {/* ... (預包量與分機表渲染區塊保持不變) ... */}
        {activeTab === 'prepack' && (
             groupedPrepacks.length > 0 ? groupedPrepacks.map(group => (
                 <div key={group.qty} className="flex rounded-2xl overflow-hidden shadow-sm border border-slate-100 bg-white">
                <div className={`w-24 flex-shrink-0 flex flex-col items-center justify-center p-2 text-center ${getQtyColorStyles(group.qty)}`}>
                  <span className="text-3xl font-black leading-none">{group.qty}</span>
                  <span className="text-[10px] font-bold mt-1 opacity-90">{group.bag}</span>
                </div>
                <div className="flex-1 p-3 min-w-0">
                  <div className="divide-y divide-slate-100">
                    {group.items.map((item) => (
                      <div key={item.id} className="py-2 first:pt-0 last:pb-0">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="font-bold text-slate-800 text-sm truncate">{item.name}</h3>
                          {item.id && <span className="text-[10px] bg-slate-100 text-slate-400 px-1.5 rounded">{item.id}</span>}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                           {item.spec && <span className="text-xs text-slate-500">{item.spec}</span>}
                           {item.note && <span className="text-[10px] text-slate-400 border border-slate-100 px-1 rounded">{item.note}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
             )) : <div className="text-center py-8 text-slate-400">查無資料</div>
        )}
        {activeTab === 'extension' && (
             filteredExtensions.map(item => (
                <div key={item.id} className="bg-white p-4 rounded-2xl border border-slate-100 flex items-center justify-between group">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <Phone className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800">{item.area}</h3>
                    {item.note && <p className="text-[10px] text-slate-400">{item.note}</p>}
                  </div>
                </div>
                <span className="text-lg font-black text-emerald-600 tracking-wider">{item.ext}</span>
              </div>
             ))
        )}
      </div>

      {/* ✨ 新增：閱讀模式 Modal (全螢幕覆蓋層) */}
      {selectedSop && (
        <div className="fixed inset-0 z-[100] flex flex-col bg-white animate-in slide-in-from-bottom-10 duration-200">
            {/* 標題列 (固定在上方) */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white/90 backdrop-blur-md sticky top-0 z-10 shadow-sm">
                <h2 className="font-black text-lg text-slate-800 truncate pr-4">{selectedSop.title}</h2>
                <button
                    onClick={() => setSelectedSop(null)} // 點擊 X 關閉
                    className="p-2 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-500 transition-colors"
                >
                    <X className="w-6 h-6" />
                </button>
            </div>

            {/* 內文區域 (可捲動) */}
            <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
                <div className="max-w-2xl mx-auto space-y-4 pb-20">
                    {/* 分類標籤 */}
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white bg-blue-600 px-2.5 py-1 rounded-md shadow-sm shadow-blue-200">
                            {selectedSop.category}
                        </span>
                        {selectedSop.createdAt && (
                           <span className="text-[10px] text-slate-400 font-mono">
                             ID: {selectedSop.id.slice(0,4)}
                           </span>
                        )}
                    </div>

                    {/* 完整內文 */}
                    <article className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                        {/* whitespace-pre-wrap 確保你的 Word 換行會被保留 */}
                        <div className="whitespace-pre-wrap leading-8 text-slate-700 font-medium text-[15px]">
                            {selectedSop.content}
                        </div>
                    </article>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}
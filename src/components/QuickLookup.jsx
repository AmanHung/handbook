import React, { useState, useMemo } from 'react';
import { Search, Phone, Package } from 'lucide-react';
import { PREPACK_DATA, EXTENSION_DATA } from '../data/sopData';

export default function QuickLookup() {
  const [activeTab, setActiveTab] = useState('prepack'); 
  const [searchTerm, setSearchTerm] = useState('');

  // 1. 預包量分組與過濾邏輯
  const groupedPrepacks = useMemo(() => {
    // 先過濾
    const filtered = PREPACK_DATA.filter(item => 
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      item.id.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // 再分組 (Group by Qty)
    const groups = filtered.reduce((acc, item) => {
      const key = item.qty; 
      if (!acc[key]) {
        acc[key] = {
          qty: item.qty,
          bag: item.bag,
          items: []
        };
      }
      acc[key].items.push(item);
      return acc;
    }, {});

    // 排序：讓數字小的排前面 (14 -> 21 -> 28 -> 其他)
    return Object.values(groups).sort((a, b) => {
      const numA = parseInt(a.qty) || 999;
      const numB = parseInt(b.qty) || 999;
      return numA - numB;
    });
  }, [searchTerm]);

  // 2. 分機過濾邏輯
  const filteredExtensions = EXTENSION_DATA.filter(item => 
    item.area.includes(searchTerm) || 
    item.ext.includes(searchTerm)
  );

  // 輔助函式：取得數量對應的顏色樣式
  const getQtyColorStyles = (qty) => {
    if (qty === '14') return 'bg-emerald-500 text-white border-emerald-600'; // 綠底
    if (qty === '21') return 'bg-rose-500 text-white border-rose-600';       // 紅底
    if (qty === '28') return 'bg-yellow-400 text-yellow-900 border-yellow-500'; // 黃底
    return 'bg-indigo-500 text-white border-indigo-600'; // 其他預設
  };

  return (
    <div className="space-y-4 pb-20">
      {/* 標題與搜尋區 */}
      <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
        <h2 className="text-xl font-black text-slate-800 mb-1">SOP 速查工具</h2>
        <p className="text-xs text-slate-400 font-bold">QUICK LOOKUP</p>

        <div className="relative mt-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder={activeTab === 'prepack' ? "搜尋藥名、代碼..." : "搜尋分機..."}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
          />
        </div>
      </div>

      {/* 分頁切換 */}
      <div className="flex bg-slate-200/50 p-1 rounded-2xl">
        <button 
          onClick={() => setActiveTab('prepack')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black transition-all ${
            activeTab === 'prepack' 
              ? 'bg-white text-indigo-600 shadow-sm' 
              : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <Package className="w-4 h-4" /> 預包量表
        </button>
        <button 
          onClick={() => setActiveTab('extension')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black transition-all ${
            activeTab === 'extension' 
              ? 'bg-white text-emerald-600 shadow-sm' 
              : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <Phone className="w-4 h-4" /> 常用分機
        </button>
      </div>

      {/* 資料列表顯示 */}
      <div className="space-y-4">
        {activeTab === 'prepack' ? (
          // --- 預包量 (合併表格顯示模式) ---
          groupedPrepacks.length > 0 ? (
            groupedPrepacks.map((group) => (
              <div key={group.qty} className="flex rounded-2xl overflow-hidden shadow-sm border border-slate-100 bg-white">
                
                {/* 左側：數量與顏色 (合併顯示) */}
                <div className={`w-24 flex-shrink-0 flex flex-col items-center justify-center p-2 text-center ${getQtyColorStyles(group.qty)}`}>
                  <span className="text-3xl font-black leading-none">{group.qty}</span>
                  <span className="text-[10px] font-bold mt-1 opacity-90">{group.bag}</span>
                </div>

                {/* 右側：藥品清單 */}
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
            ))
          ) : (
            <div className="text-center py-8 text-slate-400 text-xs">查無相關藥品</div>
          )
        ) : (
          // --- 分機列表 (維持原樣) ---
          filteredExtensions.length > 0 ? (
            filteredExtensions.map((item) => (
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
                <div className="flex items-center gap-2">
                  <span className="text-lg font-black text-emerald-600 tracking-wider">{item.ext}</span>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-slate-400 text-xs">查無相關分機</div>
          )
        )}
      </div>
    </div>
  );
}
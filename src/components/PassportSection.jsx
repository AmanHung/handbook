import React, { useState, useEffect } from 'react';
import { 
  Calendar, CheckCircle2, Circle, Trophy, 
  ChevronDown, ChevronUp, BookOpen, User, Bed, AlertCircle, 
  Activity, Zap, ClipboardCheck, ArrowUpCircle, Users 
} from 'lucide-react';
// 引入新的雙軌制資料結構
import { SCHEDULE_NON_PGY, SCHEDULE_PGY, PASSPORT_CATEGORIES } from '../data/trainingData';

export default function PassportSection() {
  // --- State: 報到日期 ---
  const [startDate, setStartDate] = useState(() => {
    return localStorage.getItem('pharmacy_start_date') || '';
  });

  // --- State: PGY 身分 (預設 false: 一般藥師) ---
  const [isPGY, setIsPGY] = useState(() => {
    return localStorage.getItem('pharmacy_is_pgy') === 'true';
  });
  
  // --- State: 勾選狀態 (儲存格式: { itemId: 'YYYY-MM-DD' }) ---
  const [checkedItems, setCheckedItems] = useState(() => {
    const saved = localStorage.getItem('pharmacy_passport_checked');
    try {
      const parsed = saved ? JSON.parse(saved) : {};
      // 相容性處理：如果舊資料是 boolean，轉換為今天日期
      const today = new Date().toISOString().split('T')[0];
      Object.keys(parsed).forEach(key => {
        if (parsed[key] === true) parsed[key] = today;
      });
      return parsed;
    } catch (e) {
      return {};
    }
  });

  const [activeTab, setActiveTab] = useState('progress'); // 'progress' | 'passport'
  const [expandedCat, setExpandedCat] = useState('outpatient_basic'); // 預設展開第一項
  const [selectedWeek, setSelectedWeek] = useState(null); // 手動預覽週次

  // --- Effects: 資料持久化 ---
  useEffect(() => {
    localStorage.setItem('pharmacy_start_date', startDate);
    // 日期變更時，重置預覽狀態
    setSelectedWeek(null);
  }, [startDate]);

  useEffect(() => {
    localStorage.setItem('pharmacy_is_pgy', isPGY);
  }, [isPGY]);

  useEffect(() => {
    localStorage.setItem('pharmacy_passport_checked', JSON.stringify(checkedItems));
  }, [checkedItems]);

  // --- 核心邏輯：決定使用哪一份進度表 ---
  const CURRENT_SCHEDULE = isPGY ? SCHEDULE_PGY : SCHEDULE_NON_PGY;

  // --- 邏輯：計算目前實際週次 ---
  const calculateCurrentWeek = () => {
    if (!startDate) return 1;
    
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0); // 歸零時間避免時區誤差
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const diffTime = today - start;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)); 
    
    // 若還沒到報到日，視為第 1 週
    if (diffDays < 0) return 1;
    
    // 計算週次 (第0-6天是第1週)
    return Math.floor(diffDays / 7) + 1;
  };

  const currentRealWeek = calculateCurrentWeek();
  
  // 決定顯示哪一週 (預覽優先，否則顯示當前週)
  const displayWeek = selectedWeek || currentRealWeek;

  // 從當前軌道資料中找出對應週次的內容
  const displaySchedule = CURRENT_SCHEDULE.find(s => s.week === displayWeek) || 
                          (displayWeek > CURRENT_SCHEDULE.length ? CURRENT_SCHEDULE[CURRENT_SCHEDULE.length -1] : CURRENT_SCHEDULE[0]);

  // --- 邏輯：計算護照總完成度 ---
  const calculateTotalProgress = () => {
    let total = 0;
    let checked = 0;
    PASSPORT_CATEGORIES.forEach(cat => {
      cat.items.forEach(item => {
        total++;
        if (checkedItems[item.id]) checked++;
      });
    });
    return total === 0 ? 0 : Math.round((checked / total) * 100);
  };

  // --- 處理勾選 (Toggle) ---
  const toggleCheck = (id) => {
    setCheckedItems(prev => {
      const isChecked = !!prev[id];
      if (isChecked) {
        // 取消勾選
        const next = { ...prev };
        delete next[id];
        return next;
      } else {
        // 勾選 (預設填入今天日期)
        const today = new Date().toISOString().split('T')[0];
        return { ...prev, [id]: today };
      }
    });
  };

  // --- 更新特定項目的日期 ---
  const updateDate = (id, newDate) => {
    setCheckedItems(prev => ({
      ...prev,
      [id]: newDate
    }));
  };

  // --- Icon 對應表 ---
  const iconMap = {
    BookOpen: <BookOpen className="w-5 h-5" />,
    User: <User className="w-5 h-5" />,
    Bed: <Bed className="w-5 h-5" />,
    Zap: <Zap className="w-5 h-5" />,
    ClipboardCheck: <ClipboardCheck className="w-5 h-5" />,
    Activity: <Activity className="w-5 h-5" />,
  };

  return (
    <div className="space-y-6 pb-20">
      
      {/* =======================
          頂部：個人資訊卡片
      ======================= */}
      <div className="bg-gradient-to-br from-indigo-600 to-violet-700 p-6 rounded-[2rem] text-white shadow-xl relative overflow-hidden transition-all">
        <div className="relative z-10">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-xl font-bold">學習護照</h2>
              <p className="text-indigo-200 text-xs">Training Passport</p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full border border-white/10">
              <span className="text-sm font-black">{calculateTotalProgress()}% 完成</span>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            {/* Row 1: 報到日期設定 */}
            <div className="bg-black/20 p-3 rounded-xl backdrop-blur-md border border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-indigo-200" />
                <span className="text-xs font-medium text-indigo-100">報到日期</span>
              </div>
              <input 
                type="date" 
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-transparent text-sm font-bold text-white focus:outline-none text-right w-32 [color-scheme:dark]" 
              />
            </div>

            {/* Row 2: 身分軌道選擇 (PGY / 一般) */}
            <div className="bg-black/20 p-1 rounded-xl backdrop-blur-md border border-white/10 flex">
               <button 
                 onClick={() => setIsPGY(false)}
                 className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all ${!isPGY ? 'bg-white text-indigo-700 shadow-sm' : 'text-indigo-200 hover:text-white'}`}
               >
                 <Users className="w-3 h-3" />
                 一般藥師
               </button>
               <button 
                 onClick={() => setIsPGY(true)}
                 className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all ${isPGY ? 'bg-amber-400 text-amber-900 shadow-sm' : 'text-indigo-200 hover:text-white'}`}
               >
                 <Users className="w-3 h-3" />
                 PGY 藥師
               </button>
            </div>
          </div>
        </div>
        <Trophy className="absolute -right-6 -bottom-6 opacity-10 w-40 h-40 text-yellow-300" />
      </div>

      {/* 分頁切換 */}
      <div className="flex bg-slate-200/50 p-1 rounded-2xl">
        <button 
          onClick={() => setActiveTab('progress')}
          className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all ${
            activeTab === 'progress' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'
          }`}
        >
          每週進度表
        </button>
        <button 
          onClick={() => setActiveTab('passport')}
          className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all ${
            activeTab === 'passport' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'
          }`}
        >
          技能檢核表
        </button>
      </div>

      {/* =======================
          內容區域：每週進度表
      ======================= */}
      {activeTab === 'progress' && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
          {!startDate ? (
            <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-slate-200">
              <p className="text-slate-400 text-sm">請先設定上方「報到日期」<br/>以啟用智慧進度功能</p>
            </div>
          ) : (
            <>
              {/* 主卡片：顯示選定週次的詳細內容 */}
              <div className={`p-5 rounded-[2rem] border-2 shadow-sm relative overflow-hidden transition-all duration-300 ${
                  displayWeek === currentRealWeek 
                  ? 'bg-white border-indigo-100' 
                  : 'bg-indigo-50 border-indigo-200'
                }`}>
                
                {/* 狀態標籤 (預覽模式 / 當週) */}
                <div className={`absolute top-0 right-0 text-[10px] font-black px-3 py-1 rounded-bl-xl ${displayWeek === currentRealWeek ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-500'}`}>
                  {displayWeek === currentRealWeek ? 'CURRENT WEEK' : 'PREVIEW MODE'}
                </div>
                
                {/* 軌道標籤 (PGY / Normal) */}
                <div className="absolute top-0 left-0">
                    <span className={`text-[9px] font-bold px-3 py-1 rounded-br-xl ${isPGY ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
                        {isPGY ? 'PGY TRACK' : 'NORMAL TRACK'}
                    </span>
                </div>

                <div className="mb-4 mt-2">
                  <span className="text-4xl font-black text-indigo-600">{displayWeek}</span>
                  <span className="text-sm font-bold text-slate-400 ml-1">週</span>
                  <h3 className="text-lg font-bold text-slate-800 mt-1">
                    {displaySchedule ? displaySchedule.title : "訓練完成"}
                  </h3>
                </div>
                
                {displaySchedule && (
                  <ul className="space-y-3">
                    {displaySchedule.goals.map((goal, idx) => (
                      <li key={idx} className="flex items-start gap-3">
                        <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-indigo-400 flex-shrink-0"></div>
                        <span className="text-sm text-slate-600 leading-relaxed">{goal}</span>
                      </li>
                    ))}
                  </ul>
                )}
                
                {displaySchedule?.note && (
                  <div className="mt-4 p-3 bg-amber-50 rounded-xl border border-amber-100 flex gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-700">{displaySchedule.note}</p>
                  </div>
                )}

                {/* 預覽模式下的「返回」按鈕 */}
                {selectedWeek !== null && selectedWeek !== currentRealWeek && (
                  <button 
                    onClick={() => setSelectedWeek(null)}
                    className="mt-4 w-full py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 active:scale-95 transition-transform"
                  >
                    <ArrowUpCircle className="w-4 h-4" />
                    回到目前的進度 (第 {currentRealWeek} 週)
                  </button>
                )}
              </div>

              {/* 時間軸清單 (可點擊切換預覽) */}
              <div className="pl-4 border-l-2 border-slate-100 space-y-2 py-2">
                {CURRENT_SCHEDULE.map(sch => {
                  const isCurrent = sch.week === currentRealWeek;
                  const isSelected = sch.week === displayWeek;
                  
                  return (
                    <div 
                      key={sch.week} 
                      onClick={() => setSelectedWeek(sch.week)}
                      className={`relative group cursor-pointer p-2 rounded-xl transition-all ${
                        isSelected ? 'bg-white shadow-sm scale-105 -ml-2 pl-4' : 'hover:bg-slate-50'
                      }`}
                    >
                       {/* 時間軸圓點 */}
                       <div className={`absolute left-[-25px] top-5 w-3 h-3 rounded-full border-2 border-white transition-colors ${
                         isCurrent ? 'bg-indigo-500 ring-2 ring-indigo-100' : 
                         (sch.week < currentRealWeek ? 'bg-slate-300' : 'bg-slate-200')
                       }`}></div>
                       
                       <div className="flex items-center justify-between">
                          <h4 className={`font-bold text-sm ${isSelected ? 'text-indigo-600' : 'text-slate-600'}`}>
                            第 {sch.week} 週：{sch.title}
                          </h4>
                          {isCurrent && <span className="text-[10px] bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full font-bold">Now</span>}
                       </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* =======================
          內容區域：技能檢核表
      ======================= */}
      {activeTab === 'passport' && (
        <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
          {PASSPORT_CATEGORIES.map(category => {
            const isExpanded = expandedCat === category.id;
            const catTotal = category.items.length;
            const catChecked = category.items.filter(i => !!checkedItems[i.id]).length; // 計算完成數
            const progress = catTotal === 0 ? 0 : Math.round((catChecked / catTotal) * 100);

            return (
              <div key={category.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden transition-all">
                {/* 分類標題 (可展開/折疊) */}
                <button 
                  onClick={() => setExpandedCat(isExpanded ? null : category.id)}
                  className="w-full flex items-center justify-between p-4"
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl ${progress === 100 ? 'bg-green-100 text-green-600' : 'bg-slate-50 text-slate-500'}`}>
                      {iconMap[category.icon] || <BookOpen className="w-5 h-5"/>}
                    </div>
                    <div className="text-left">
                      <h4 className="font-bold text-slate-800 text-sm">{category.title}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all duration-500 ${progress === 100 ? 'bg-green-500' : 'bg-indigo-500'}`} style={{width: `${progress}%`}}></div>
                        </div>
                        <span className="text-[10px] text-slate-400 font-bold">{catChecked}/{catTotal}</span>
                      </div>
                    </div>
                  </div>
                  {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-300"/> : <ChevronDown className="w-4 h-4 text-slate-300"/>}
                </button>

                {/* 檢核項目清單 */}
                {isExpanded && (
                  <div className="px-4 pb-4 pt-0">
                    <div className="h-px bg-slate-50 mb-3"></div>
                    <div className="space-y-2">
                      {category.items.map(item => {
                        const isChecked = !!checkedItems[item.id];
                        // 取得儲存的日期，若無則為今天
                        const completedDate = typeof checkedItems[item.id] === 'string' ? checkedItems[item.id] : new Date().toISOString().split('T')[0];

                        return (
                          <div 
                            key={item.id} 
                            className={`group flex items-start gap-3 p-3 rounded-xl transition-all border ${
                              isChecked ? 'bg-slate-50/50 border-slate-100' : 'bg-white border-transparent hover:bg-slate-50'
                            }`}
                          >
                            {/* Checkbox Icon */}
                            <div 
                              onClick={() => toggleCheck(item.id)}
                              className={`mt-0.5 flex-shrink-0 cursor-pointer transition-colors ${isChecked ? 'text-green-500' : 'text-slate-200 group-hover:text-slate-300'}`}
                            >
                              {isChecked ? <CheckCircle2 className="w-5 h-5"/> : <Circle className="w-5 h-5"/>}
                            </div>
                            
                            <div className="flex-1">
                                <div 
                                  onClick={() => toggleCheck(item.id)}
                                  className={`text-sm cursor-pointer transition-all ${isChecked ? 'text-slate-500 line-through decoration-slate-300' : 'text-slate-700'}`}
                                >
                                  {item.text}
                                </div>
                                
                                {/* 完成日期選擇器 */}
                                {isChecked && (
                                  <div className="mt-2 flex items-center gap-2 animate-in fade-in slide-in-from-left-1 duration-200">
                                    <span className="text-[10px] font-bold bg-green-100 text-green-700 px-1.5 py-0.5 rounded">
                                      完成日
                                    </span>
                                    <input 
                                      type="date" 
                                      value={completedDate}
                                      onChange={(e) => updateDate(item.id, e.target.value)}
                                      onClick={(e) => e.stopPropagation()} 
                                      className="bg-transparent text-[11px] font-medium text-slate-500 border-b border-slate-300 focus:border-indigo-500 focus:outline-none w-28"
                                    />
                                  </div>
                                )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
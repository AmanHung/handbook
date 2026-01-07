import React, { useState, useEffect } from 'react';
import { 
  ChevronRight, ChevronDown, ChevronUp, Activity, CalendarDays, 
  Briefcase, AlertCircle, Clock 
} from 'lucide-react';
// 引入資料檔
import { SHIFTS_DATA, HOLIDAY_DATA, ADMIN_NOTICES } from '../data/shiftData';

export default function ShiftNavigator() {
  // --- State 定義 ---
  const [currentTime, setCurrentTime] = useState(new Date()); // 目前時間
  const [expandedNoticeId, setExpandedNoticeId] = useState(null); // 公告折疊狀態

  const [selectedShift, setSelectedShift] = useState(null);
  const [selectedHolidayShift, setSelectedHolidayShift] = useState(null);
  const [isShiftMenuOpen, setIsShiftMenuOpen] = useState(false);
  const [isHolidayMenuOpen, setIsHolidayMenuOpen] = useState(false);

  // --- Effect: 每分鐘更新一次時間 ---
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // --- 輔助函式: 判斷任務是否正在進行中 ---
  const isTaskActive = (timeStr) => {
    // 只處理 "08:00-12:00" 這種有起始結束的格式，略過 "17:30" 這種單一時間點
    if (!timeStr || !timeStr.includes('-')) return false; 
    
    const [start, end] = timeStr.split('-');
    const now = currentTime;
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    
    const getMinutes = (t) => {
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m;
    };

    const startMin = getMinutes(start);
    let endMin = getMinutes(end);
    
    // 處理跨日或跨時段 (例如結束時間小於開始時間，視為隔日或跨夜)
    if (endMin < startMin) endMin += 24 * 60; 

    return currentMinutes >= startMin && currentMinutes < endMin;
  };

  // 取得當前選擇的班別資料
  const shift = selectedShift ? SHIFTS_DATA[selectedShift] : null;
  const holidayShiftData = selectedHolidayShift ? HOLIDAY_DATA[selectedHolidayShift] : null;

  // 點擊一般班別處理函式
  const handleShiftClick = (s) => {
    setSelectedShift(prev => prev === s ? null : s);
  };

  // 點擊假日班別處理函式
  const handleHolidayShiftClick = (s) => {
    setSelectedHolidayShift(prev => prev === s ? null : s);
  };

  return (
    <div className="space-y-4">
      
      {/* =========================================================
          區塊一：全班別任務導航
      ========================================================= */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <button 
          onClick={() => setIsShiftMenuOpen(!isShiftMenuOpen)}
          className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600">
              <Briefcase className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-800 text-lg">全班別任務導航</h3>
          </div>
          {isShiftMenuOpen ? <ChevronDown className="w-5 h-5 text-slate-400" /> : <ChevronRight className="w-5 h-5 text-slate-400" />}
        </button>

        {/* 1.1 班別按鈕選單 (展開時顯示) */}
        {isShiftMenuOpen && (
          <div className="bg-slate-50/50 p-4 border-t border-slate-100 animate-in slide-in-from-top-2 duration-200">
            <div className="flex flex-wrap gap-2">
              {Object.keys(SHIFTS_DATA).map(s => (
                <button 
                  key={s} 
                  onClick={() => handleShiftClick(s)}
                  className={`px-3 py-2 rounded-xl text-[11px] font-black transition-all border ${
                    selectedShift === s 
                      ? 'bg-white border-indigo-200 text-indigo-600 shadow-sm scale-105 ring-2 ring-indigo-50' 
                      : 'bg-white border-transparent text-slate-500 hover:border-slate-200 hover:bg-white'
                  }`}
                >{s}</button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 1.2 班別詳細內容卡片 (選取後顯示) */}
      {shift && (
        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="flex items-center gap-3 mb-6">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center bg-indigo-50 text-indigo-600`}>
              <Activity className="w-6 h-6" />
            </div>
            <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Shift Duty</p>
                <h4 className="font-bold text-slate-800">{shift.title}</h4>
            </div>
          </div>
          <div className="relative pl-6 border-l-2 border-slate-100 space-y-8">
            {shift.timeline.map((item, idx) => {
              // 判斷是否為當前任務
              const isActive = isTaskActive(item.time);
              
              return (
                <div key={idx} className={`relative transition-all duration-500 ${isActive ? 'scale-105 origin-left' : ''}`}>
                  {/* 時間軸圓點：如果是當前任務，會變成呼吸燈效果 */}
                  <div 
                    className={`absolute -left-[31px] top-0 w-4 h-4 rounded-full border-4 border-white shadow-sm transition-all duration-300 ${isActive ? 'ring-4 ring-red-100 scale-110' : ''}`} 
                    style={{backgroundColor: isActive ? '#ef4444' : `var(--color-${shift.color}-500, #3b82f6)`}}
                  >
                    {isActive && <span className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-75"></span>}
                  </div>
                  
                  {/* 任務卡片 */}
                  <div className={`rounded-xl p-3 border transition-all duration-300 ${isActive ? 'bg-red-50/50 border-red-100 shadow-sm' : 'border-transparent'}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[10px] font-black px-1.5 py-0.5 rounded flex items-center gap-1 transition-colors ${isActive ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-500'}`}>
                        {isActive && <Clock className="w-3 h-3" />}
                        {item.time}
                      </span>
                      <h5 className={`text-sm font-bold transition-colors ${isActive ? 'text-red-900' : 'text-slate-700'}`}>{item.task}</h5>
                    </div>
                    <p className={`text-xs leading-relaxed pl-1 transition-colors ${isActive ? 'text-slate-700 font-medium' : 'text-slate-500'}`}>{item.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* =========================================================
          區塊二：國定假日值班調整
      ========================================================= */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <button 
          onClick={() => setIsHolidayMenuOpen(!isHolidayMenuOpen)}
          className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="bg-amber-100 p-2 rounded-lg text-amber-600">
              <CalendarDays className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-800 text-lg">國定假日值班調整</h3>
          </div>
          {isHolidayMenuOpen ? <ChevronDown className="w-5 h-5 text-slate-400" /> : <ChevronRight className="w-5 h-5 text-slate-400" />}
        </button>

        {isHolidayMenuOpen && (
          <div className="bg-slate-50/50 p-4 border-t border-slate-100 animate-in slide-in-from-top-2 duration-200">
            {/* 2.1 假日班別按鈕選單 */}
            <div className="flex flex-wrap gap-2 mb-4">
                {Object.keys(HOLIDAY_DATA).map((s) => (
                <button 
                  key={s} 
                  onClick={() => handleHolidayShiftClick(s)}
                  className={`px-3 py-2 rounded-xl text-[11px] font-black transition-all border ${
                    selectedHolidayShift === s 
                      ? 'bg-white border-amber-200 text-amber-600 shadow-sm scale-105 ring-2 ring-amber-50' 
                      : 'bg-white border-transparent text-slate-500 hover:border-slate-200 hover:bg-white'
                  }`}
                >{s}</button>
              ))}
            </div>

            {/* 2.2 假日工作細項展示 */}
            {holidayShiftData && (
                <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex items-center gap-3 mb-6">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center bg-amber-50 text-amber-600`}>
                    <CalendarDays className="w-6 h-6" />
                  </div>
                  <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Holiday Shift</p>
                      <h4 className="font-bold text-slate-800">{holidayShiftData.title}</h4>
                  </div>
                </div>
                <div className="relative pl-6 border-l-2 border-slate-100 space-y-8">
                  {holidayShiftData.timeline.map((item, idx) => (
                    <div key={idx} className="relative">
                      <div className={`absolute -left-[31px] top-0 w-4 h-4 rounded-full border-4 border-white shadow-sm`} style={{backgroundColor: `var(--color-${holidayShiftData.color}-500, #f59e0b)`}}></div>
                      
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-black text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">{item.time}</span>
                        <h5 className="text-sm font-bold text-slate-700">{item.task}</h5>
                      </div>
                      <p className="text-xs text-slate-500 leading-relaxed pl-1">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* =========================================================
          區塊三：行政注意事項 (折疊式卡片)
      ========================================================= */}
      <div className="border-t border-slate-100 pt-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-slate-400" />
            行政注意事項
          </h3>
        </div>
        <div className="grid grid-cols-1 gap-3">
          {ADMIN_NOTICES.map(notice => {
            const isOpen = expandedNoticeId === notice.id;
            
            return (
              <div 
                key={notice.id} 
                className={`rounded-2xl border transition-all duration-300 overflow-hidden ${
                  isOpen ? `bg-white shadow-md ${notice.color}` : 'bg-white border-slate-100'
                }`}
              >
                {/* 標題列 (點擊切換) */}
                <button 
                  onClick={() => setExpandedNoticeId(isOpen ? null : notice.id)}
                  className="w-full flex items-center justify-between p-4"
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl shadow-sm transition-colors ${isOpen ? 'bg-white' : 'bg-slate-50'}`}>
                      {notice.icon}
                    </div>
                    <h4 className={`font-bold text-sm ${isOpen ? 'text-slate-800' : 'text-slate-600'}`}>{notice.title}</h4>
                  </div>
                  {isOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-300" />}
                </button>
                
                {/* 內容區塊 (展開時顯示) */}
                {isOpen && (
                  <div className="px-4 pb-4 animate-in slide-in-from-top-1">
                    <div className="pt-2 border-t border-slate-100/50">
                      {notice.content}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
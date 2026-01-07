import React, { useState } from 'react';
import { 
  ChevronRight, ChevronDown, Activity, CalendarDays, 
  Briefcase, AlertCircle
} from 'lucide-react';
// 引入資料檔
import { SHIFTS_DATA, HOLIDAY_DATA, ADMIN_NOTICES } from '../data/shiftData';

export default function ShiftNavigator() {
  const [selectedShift, setSelectedShift] = useState(null);
  const [selectedHolidayShift, setSelectedHolidayShift] = useState(null);
  const [isShiftMenuOpen, setIsShiftMenuOpen] = useState(false);
  const [isHolidayMenuOpen, setIsHolidayMenuOpen] = useState(false);

  // 取得當前選擇的班別資料
  // 因為 HOLIDAY_DATA 現在也是物件結構，所以直接用 key (selectedHolidayShift) 取值
  const shift = selectedShift ? SHIFTS_DATA[selectedShift] : null;
  const holidayShiftData = selectedHolidayShift ? HOLIDAY_DATA[selectedHolidayShift] : null;

  // 點擊一般班別處理函式 (Toggle 功能：再次點擊即取消)
  const handleShiftClick = (s) => {
    setSelectedShift(prev => prev === s ? null : s);
  };

  // 點擊假日班別處理函式 (Toggle 功能：再次點擊即取消)
  const handleHolidayShiftClick = (s) => {
    setSelectedHolidayShift(prev => prev === s ? null : s);
  };

  return (
    <div className="space-y-4">
      
      {/* =========================================================
          區塊一：全班別任務導航
      ========================================================= */}
      <button 
        onClick={() => setIsShiftMenuOpen(!isShiftMenuOpen)}
        className="w-full flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:bg-slate-50 transition-colors"
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
        <div className="flex flex-wrap gap-1.5 bg-slate-200/40 p-2 rounded-2xl animate-in slide-in-from-top-2 duration-200">
          {Object.keys(SHIFTS_DATA).map(s => (
            <button 
              key={s} 
              onClick={() => handleShiftClick(s)}
              className={`px-3 py-2 rounded-xl text-[11px] font-black transition-all ${
                selectedShift === s 
                  ? 'bg-white text-indigo-600 shadow-sm scale-105 ring-2 ring-indigo-100' 
                  : 'text-slate-500 hover:bg-white/50'
              }`}
            >{s}</button>
          ))}
        </div>
      )}

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
            {shift.timeline.map((item, idx) => (
              <div key={idx} className="relative">
                <div className={`absolute -left-[31px] top-0 w-4 h-4 rounded-full border-4 border-white shadow-sm`} style={{backgroundColor: `var(--color-${shift.color}-500, #3b82f6)`}}></div>
                
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

      {/* =========================================================
          區塊二：國定假日值班調整
      ========================================================= */}
      <button 
        onClick={() => setIsHolidayMenuOpen(!isHolidayMenuOpen)}
        className="w-full flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:bg-slate-50 transition-colors"
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
        <div className="space-y-4 animate-in slide-in-from-top-2 duration-200">
          {/* 2.1 假日班別按鈕選單 */}
          <div className="flex flex-wrap gap-1.5 bg-slate-200/40 p-2 rounded-2xl">
              {Object.keys(HOLIDAY_DATA).map((s) => (
              <button 
                key={s} 
                onClick={() => handleHolidayShiftClick(s)}
                className={`px-3 py-2 rounded-xl text-[11px] font-black transition-all ${
                  selectedHolidayShift === s 
                    ? 'bg-white text-amber-600 shadow-sm scale-105 ring-2 ring-amber-100' 
                    : 'text-slate-500 hover:bg-white/50'
                }`}
              >{s}</button>
            ))}
          </div>

          {/* 2.2 假日工作細項展示 (現在使用與上方相同的 Timeline 樣式) */}
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

      {/* =========================================================
          區塊三：行政注意事項 (常駐顯示)
      ========================================================= */}
      <div className="border-t border-slate-100 pt-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-slate-400" />
            行政注意事項
          </h3>
        </div>
        <div className="grid grid-cols-1 gap-4">
          {ADMIN_NOTICES.map(notice => (
            <div key={notice.id} className={`p-4 rounded-2xl border ${notice.color}`}>
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-white rounded-xl shadow-sm">{notice.icon}</div>
                <h4 className="font-bold text-slate-800">{notice.title}</h4>
              </div>
              {notice.content}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
import React, { useState, useEffect } from 'react';
import { 
  ChevronRight, ChevronDown, ChevronUp, Activity, CalendarDays, 
  Briefcase, AlertCircle, Clock, Edit, Save, Trash2, Plus, X, Loader2, User 
} from 'lucide-react';
import { db, auth } from '../firebase';
import { doc, setDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { SHIFTS_DATA, HOLIDAY_DATA, ADMIN_NOTICES } from '../data/shiftData';

// 顏色對照表 (供自訂班別顏色使用)
const COLOR_MAP = {
  blue: { label: '藍色', hex: '#3b82f6' },
  indigo: { label: '靛藍', hex: '#6366f1' },
  purple: { label: '紫色', hex: '#a855f7' },
  pink: { label: '粉紅', hex: '#ec4899' },
  red: { label: '紅色', hex: '#ef4444' },
  orange: { label: '橘色', hex: '#f97316' },
  amber: { label: '琥珀', hex: '#f59e0b' },
  green: { label: '綠色', hex: '#10b981' },
  teal: { label: '藍綠', hex: '#14b8a6' }
};

export default function ShiftNavigator() {
  // --- State 定義 ---
  const [currentTime, setCurrentTime] = useState(new Date());
  const [expandedNoticeId, setExpandedNoticeId] = useState(null);

  const [selectedShift, setSelectedShift] = useState(null);
  const [selectedHolidayShift, setSelectedHolidayShift] = useState(null);
  const [isShiftMenuOpen, setIsShiftMenuOpen] = useState(false);
  const [isHolidayMenuOpen, setIsHolidayMenuOpen] = useState(false);

  // Firebase 狀態與 Wiki 共編相關 State
  const [dbData, setDbData] = useState(null);
  const [editMode, setEditMode] = useState(null); // { type: 'shift'|'holiday'|'notice', key: string }
  const [editForm, setEditForm] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- Effect: 每分鐘更新一次時間 ---
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // --- Effect: 監聽 Firebase 排班資料 ---
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'site_settings', 'shift_data_v1'), (docSnap) => {
      if (docSnap.exists()) {
        setDbData(docSnap.data());
      }
    });
    return () => unsub();
  }, []);

  // --- 資料來源聚合 (Firebase 優先，若無則使用本地端預設資料) ---
  const currentShifts = dbData?.SHIFTS_DATA || SHIFTS_DATA;
  const currentHolidays = dbData?.HOLIDAY_DATA || HOLIDAY_DATA;
  
  // 行政公告需要保留本地端的 Icon
  const currentNotices = ADMIN_NOTICES.map(localNotice => {
    const dbNotice = dbData?.ADMIN_NOTICES?.find(n => n.id === localNotice.id);
    return {
      ...localNotice,
      title: dbNotice?.title ?? localNotice.title,
      content: dbNotice?.content ?? localNotice.content
    };
  });

  const lastUpdatedBy = dbData?.updatedBy;
  const lastUpdatedAt = dbData?.updatedAt;

  // --- 輔助函式: 判斷任務是否正在進行中 ---
  const isTaskActive = (timeStr) => {
    if (!timeStr || !timeStr.match(/[-~]/)) return false; 
    
    const parts = timeStr.split(/[-~]/);
    const start = parts[0];
    const end = parts[1];
    
    const now = currentTime;
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    
    const getMinutes = (t) => {
      const [h, m] = t.split(':').map(Number);
      return (h || 0) * 60 + (m || 0);
    };

    const startMin = getMinutes(start);
    let endMin = getMinutes(end);
    
    if (endMin < startMin) endMin += 24 * 60; 

    return currentMinutes >= startMin && currentMinutes < endMin;
  };

  const shift = selectedShift ? currentShifts[selectedShift] : null;
  const holidayShiftData = selectedHolidayShift ? currentHolidays[selectedHolidayShift] : null;

  // =========================================================
  // ★★★ 共編與資料庫操作邏輯 ★★★
  // =========================================================

  // 封裝 Firebase 儲存邏輯
  const saveToFirebase = async (updates) => {
    const currentUser = auth?.currentUser;
    const editorName = currentUser?.displayName || currentUser?.email || '學員(未具名)';
    await setDoc(doc(db, 'site_settings', 'shift_data_v1'), {
      ...updates,
      updatedBy: editorName,
      updatedAt: serverTimestamp()
    }, { merge: true });
  };

  // 1. 開啟編輯模式
  const startEdit = (type, key, data) => {
    setEditMode({ type, key });
    if (type === 'shift' || type === 'holiday') {
      setEditForm({ 
        title: data.title || '',
        color: data.color || 'blue',
        timeline: JSON.parse(JSON.stringify(data.timeline || [])) 
      });
    } else if (type === 'notice') {
      setEditForm({ title: data.title, content: data.content });
    }
  };

  const cancelEdit = () => {
    setEditMode(null);
    setEditForm(null);
  };

  // 2. 儲存編輯內容
  const handleSave = async () => {
    setIsSubmitting(true);
    try {
      const newShifts = JSON.parse(JSON.stringify(currentShifts));
      const newHolidays = JSON.parse(JSON.stringify(currentHolidays));
      let newNotices = currentNotices.map(n => ({ id: n.id, title: n.title, content: n.content }));

      if (editMode.type === 'shift') {
        newShifts[editMode.key] = { ...newShifts[editMode.key], ...editForm };
      } else if (editMode.type === 'holiday') {
        newHolidays[editMode.key] = { ...newHolidays[editMode.key], ...editForm };
      } else if (editMode.type === 'notice') {
        const idx = newNotices.findIndex(n => n.id === editMode.key);
        if (idx !== -1) {
          newNotices[idx].title = editForm.title;
          newNotices[idx].content = editForm.content;
        }
      }

      await saveToFirebase({ SHIFTS_DATA: newShifts, HOLIDAY_DATA: newHolidays, ADMIN_NOTICES: newNotices });
      setEditMode(null);
    } catch (error) {
      alert('儲存失敗：' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 3. 新增班別 (Shift 或 Holiday)
  const handleAddShift = async (type) => {
    const shiftName = window.prompt(`請輸入新${type === 'shift' ? '班別' : '假日班'}的簡稱 (例如：小夜班、C班)：\n※ 此名稱將作為按鈕顯示名稱`);
    if (!shiftName || !shiftName.trim()) return;

    const cleanName = shiftName.trim();
    const targetData = type === 'shift' ? currentShifts : currentHolidays;

    if (targetData[cleanName]) {
      return alert("此班別名稱已存在，請使用其他名稱！");
    }

    setIsSubmitting(true);
    try {
      const newData = JSON.parse(JSON.stringify(targetData));
      const newShiftObject = { title: `${cleanName} 詳細任務`, color: 'blue', timeline: [] };
      newData[cleanName] = newShiftObject;

      if (type === 'shift') {
        await saveToFirebase({ SHIFTS_DATA: newData });
        setSelectedShift(cleanName);
      } else {
        await saveToFirebase({ HOLIDAY_DATA: newData });
        setSelectedHolidayShift(cleanName);
      }
      // 自動進入編輯模式
      startEdit(type, cleanName, newShiftObject);
    } catch (error) {
      alert("新增失敗：" + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 4. 刪除班別
  const handleDeleteShift = async () => {
    if (!window.confirm(`⚠️ 警告：確定要徹底刪除「${editMode.key}」嗎？\n此動作無法復原！`)) return;

    setIsSubmitting(true);
    try {
      if (editMode.type === 'shift') {
        const newShifts = JSON.parse(JSON.stringify(currentShifts));
        delete newShifts[editMode.key];
        await saveToFirebase({ SHIFTS_DATA: newShifts });
        setSelectedShift(null);
      } else if (editMode.type === 'holiday') {
        const newHolidays = JSON.parse(JSON.stringify(currentHolidays));
        delete newHolidays[editMode.key];
        await saveToFirebase({ HOLIDAY_DATA: newHolidays });
        setSelectedHolidayShift(null);
      }
      setEditMode(null);
      alert("已成功刪除班別！");
    } catch(err) {
      alert("刪除失敗：" + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 表單操作函式
  const handleTimelineChange = (index, field, value) => {
    const newTimeline = [...editForm.timeline];
    newTimeline[index][field] = value;
    setEditForm({ ...editForm, timeline: newTimeline });
  };
  const addTimelineItem = () => setEditForm({ ...editForm, timeline: [...editForm.timeline, { time: '', task: '', desc: '' }] });
  const removeTimelineItem = (index) => {
    const newTimeline = [...editForm.timeline];
    newTimeline.splice(index, 1);
    setEditForm({ ...editForm, timeline: newTimeline });
  };

  const formatTime = (ts) => {
    if (!ts) return '';
    try { return new Date(ts.seconds * 1000).toLocaleString('zh-TW', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }); } catch { return ''; }
  };

  return (
    <div className="space-y-4">
      
      {/* =========================================================
          全域更新提示
      ========================================================= */}
      {lastUpdatedBy && (
        <div className="flex items-center gap-2 text-xs font-medium text-gray-500 bg-white px-4 py-2 rounded-lg shadow-sm border border-gray-100">
          <User className="w-3.5 h-3.5 text-indigo-500" /> 排班表最新更新者：{lastUpdatedBy} 
          <span className="text-gray-300">|</span> 
          <Clock className="w-3.5 h-3.5 text-orange-400" /> {formatTime(lastUpdatedAt)}
        </div>
      )}

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

        {isShiftMenuOpen && (
          <div className="bg-slate-50/50 p-4 border-t border-slate-100 animate-in slide-in-from-top-2 duration-200">
            <div className="flex flex-wrap gap-2">
              {Object.keys(currentShifts).map(s => (
                <button 
                  key={s} 
                  onClick={() => { setSelectedShift(prev => prev === s ? null : s); setEditMode(null); }}
                  className={`px-3 py-2 rounded-xl text-[11px] font-black transition-all border ${
                    selectedShift === s 
                      ? 'bg-white border-indigo-200 text-indigo-600 shadow-sm scale-105 ring-2 ring-indigo-50' 
                      : 'bg-white border-transparent text-slate-500 hover:border-slate-200 hover:bg-white'
                  }`}
                >{s}</button>
              ))}
              
              {/* ★ 新增班別按鈕 */}
              <button 
                onClick={() => handleAddShift('shift')}
                className="px-3 py-2 rounded-xl text-[11px] font-bold border border-dashed border-indigo-300 text-indigo-500 hover:bg-indigo-50 hover:text-indigo-700 transition-colors flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> 新增班別
              </button>
            </div>
          </div>
        )}
      </div>

      {shift && (
        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="flex justify-between items-start mb-6">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center bg-indigo-50 text-indigo-600`}>
                <Activity className="w-6 h-6" />
              </div>
              <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Shift Duty</p>
                  {editMode?.key === selectedShift ? (
                    <input 
                      className="font-bold text-slate-800 text-lg border-b border-indigo-300 focus:border-indigo-600 outline-none bg-transparent px-1 mt-1" 
                      value={editForm.title} 
                      onChange={e => setEditForm({...editForm, title: e.target.value})} 
                      placeholder="請輸入詳細班別標題"
                    />
                  ) : (
                    <h4 className="font-bold text-slate-800">{shift.title}</h4>
                  )}
              </div>
            </div>
            
            {/* 編輯按鈕區 */}
            {editMode?.key === selectedShift ? (
              <div className="flex items-center gap-2">
                <button onClick={handleDeleteShift} disabled={isSubmitting} className="p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors" title="刪除此班別"><Trash2 className="w-5 h-5"/></button>
                <button onClick={cancelEdit} disabled={isSubmitting} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full transition-colors"><X className="w-5 h-5"/></button>
                <button onClick={handleSave} disabled={isSubmitting} className="px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 shadow-sm flex items-center gap-1">
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4"/>} 儲存
                </button>
              </div>
            ) : (
              <button onClick={() => startEdit('shift', selectedShift, shift)} className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg text-sm font-bold transition-colors">
                <Edit className="w-4 h-4"/> 編輯
              </button>
            )}
          </div>

          {/* 編輯表單 OR 預覽畫面 */}
          {editMode?.key === selectedShift ? (
            <div className="space-y-4 border-l-2 border-indigo-200 pl-4 py-2">
               {/* 主題顏色設定 */}
               <div className="flex items-center gap-2 mb-4 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <label className="text-xs font-bold text-slate-500">主題標籤顏色：</label>
                  <select 
                    value={editForm.color} 
                    onChange={e => setEditForm({...editForm, color: e.target.value})}
                    className="text-sm font-bold border border-slate-300 rounded p-1 outline-none focus:ring-2 focus:ring-indigo-300"
                  >
                    {Object.entries(COLOR_MAP).map(([key, data]) => (
                      <option key={key} value={key}>{data.label}</option>
                    ))}
                  </select>
               </div>

               {/* 時間軸任務清單 */}
               {editForm.timeline.map((item, idx) => (
                 <div key={idx} className="bg-slate-50 p-3 rounded-xl border border-slate-200 relative group">
                    <button onClick={() => removeTimelineItem(idx)} className="absolute top-2 right-2 text-red-400 hover:text-red-600 bg-white p-1 rounded-md shadow-sm border border-red-100"><Trash2 className="w-3.5 h-3.5"/></button>
                    <div className="grid grid-cols-3 gap-3 mb-2 pr-8">
                      <div className="col-span-1">
                        <label className="text-[10px] font-bold text-slate-400">時間 (例 08:00-12:00)</label>
                        <input className="w-full text-sm border-b border-slate-300 bg-transparent px-1 py-1 outline-none focus:border-indigo-500 font-bold text-indigo-700" value={item.time} onChange={(e)=>handleTimelineChange(idx, 'time', e.target.value)} />
                      </div>
                      <div className="col-span-2">
                        <label className="text-[10px] font-bold text-slate-400">任務標題</label>
                        <input className="w-full text-sm border-b border-slate-300 bg-transparent px-1 py-1 outline-none focus:border-indigo-500 font-bold text-slate-700" value={item.task} onChange={(e)=>handleTimelineChange(idx, 'task', e.target.value)} />
                      </div>
                    </div>
                    <textarea className="w-full text-sm border border-slate-200 bg-white rounded-lg p-2 outline-none focus:ring-2 focus:ring-indigo-100 text-slate-600 mt-1 leading-relaxed" rows={2} placeholder="輸入任務詳細說明..." value={item.desc} onChange={(e)=>handleTimelineChange(idx, 'desc', e.target.value)} />
                 </div>
               ))}
               <button onClick={addTimelineItem} className="w-full py-3 border-2 border-dashed border-indigo-200 text-indigo-500 hover:bg-indigo-50 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors">
                 <Plus className="w-4 h-4"/> 新增時段任務
               </button>
            </div>
          ) : (
            <div className="relative pl-6 border-l-2 border-slate-100 space-y-8">
              {shift.timeline.map((item, idx) => {
                const isActive = isTaskActive(item.time);
                const dotColor = COLOR_MAP[shift.color]?.hex || '#3b82f6';
                return (
                  <div key={idx} className={`relative transition-all duration-500 ${isActive ? 'scale-105 origin-left' : ''}`}>
                    <div 
                      className={`absolute -left-[31px] top-0 w-4 h-4 rounded-full border-4 border-white shadow-sm transition-all duration-300 ${isActive ? 'ring-4 ring-red-100 scale-110' : ''}`} 
                      style={{backgroundColor: isActive ? '#ef4444' : dotColor}}
                    >
                      {isActive && <span className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-75"></span>}
                    </div>
                    
                    <div className={`rounded-xl p-3 border transition-all duration-300 ${isActive ? 'bg-red-50/50 border-red-100 shadow-sm' : 'border-transparent'}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[10px] font-black px-1.5 py-0.5 rounded flex items-center gap-1 transition-colors ${isActive ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-500'}`}>
                          {isActive && <Clock className="w-3 h-3" />} {item.time}
                        </span>
                        <h5 className={`text-sm font-bold transition-colors ${isActive ? 'text-red-900' : 'text-slate-700'}`}>{item.task}</h5>
                      </div>
                      <p className={`text-xs leading-relaxed pl-1 whitespace-pre-wrap transition-colors ${isActive ? 'text-slate-700 font-medium' : 'text-slate-500'}`}>{item.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
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
            <div className="flex flex-wrap gap-2 mb-4">
                {Object.keys(currentHolidays).map((s) => (
                <button 
                  key={s} 
                  onClick={() => { setSelectedHolidayShift(prev => prev === s ? null : s); setEditMode(null); }}
                  className={`px-3 py-2 rounded-xl text-[11px] font-black transition-all border ${
                    selectedHolidayShift === s 
                      ? 'bg-white border-amber-200 text-amber-600 shadow-sm scale-105 ring-2 ring-amber-50' 
                      : 'bg-white border-transparent text-slate-500 hover:border-slate-200 hover:bg-white'
                  }`}
                >{s}</button>
              ))}

              {/* ★ 新增假日班別按鈕 */}
              <button 
                onClick={() => handleAddShift('holiday')}
                className="px-3 py-2 rounded-xl text-[11px] font-bold border border-dashed border-amber-300 text-amber-600 hover:bg-amber-50 hover:text-amber-700 transition-colors flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> 新增假日班別
              </button>
            </div>

            {holidayShiftData && (
                <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex justify-between items-start mb-6">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center bg-amber-50 text-amber-600`}>
                      <CalendarDays className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Holiday Shift</p>
                        {editMode?.key === selectedHolidayShift ? (
                          <input 
                            className="font-bold text-slate-800 text-lg border-b border-amber-300 focus:border-amber-600 outline-none bg-transparent px-1 mt-1" 
                            value={editForm.title} 
                            onChange={e => setEditForm({...editForm, title: e.target.value})} 
                            placeholder="請輸入詳細班別標題"
                          />
                        ) : (
                          <h4 className="font-bold text-slate-800">{holidayShiftData.title}</h4>
                        )}
                    </div>
                  </div>

                  {/* 編輯按鈕區 */}
                  {editMode?.key === selectedHolidayShift ? (
                    <div className="flex items-center gap-2">
                      <button onClick={handleDeleteShift} disabled={isSubmitting} className="p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors" title="刪除此班別"><Trash2 className="w-5 h-5"/></button>
                      <button onClick={cancelEdit} disabled={isSubmitting} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full transition-colors"><X className="w-5 h-5"/></button>
                      <button onClick={handleSave} disabled={isSubmitting} className="px-4 py-2 bg-amber-600 text-white text-sm font-bold rounded-xl hover:bg-amber-700 shadow-sm flex items-center gap-1">
                        {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4"/>} 儲存
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => startEdit('holiday', selectedHolidayShift, holidayShiftData)} className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-600 hover:bg-amber-100 rounded-lg text-sm font-bold transition-colors">
                      <Edit className="w-4 h-4"/> 編輯
                    </button>
                  )}
                </div>
                
                {editMode?.key === selectedHolidayShift ? (
                  <div className="space-y-4 border-l-2 border-amber-200 pl-4 py-2">
                     <div className="flex items-center gap-2 mb-4 bg-slate-50 p-3 rounded-xl border border-slate-200">
                        <label className="text-xs font-bold text-slate-500">主題標籤顏色：</label>
                        <select 
                          value={editForm.color} 
                          onChange={e => setEditForm({...editForm, color: e.target.value})}
                          className="text-sm font-bold border border-slate-300 rounded p-1 outline-none focus:ring-2 focus:ring-amber-300"
                        >
                          {Object.entries(COLOR_MAP).map(([key, data]) => (
                            <option key={key} value={key}>{data.label}</option>
                          ))}
                        </select>
                     </div>

                     {editForm.timeline.map((item, idx) => (
                       <div key={idx} className="bg-slate-50 p-3 rounded-xl border border-slate-200 relative group">
                          <button onClick={() => removeTimelineItem(idx)} className="absolute top-2 right-2 text-red-400 hover:text-red-600 bg-white p-1 rounded-md shadow-sm border border-red-100"><Trash2 className="w-3.5 h-3.5"/></button>
                          <div className="grid grid-cols-3 gap-3 mb-2 pr-8">
                            <div className="col-span-1">
                              <label className="text-[10px] font-bold text-slate-400">時間</label>
                              <input className="w-full text-sm border-b border-slate-300 bg-transparent px-1 py-1 outline-none focus:border-amber-500 font-bold text-amber-700" value={item.time} onChange={(e)=>handleTimelineChange(idx, 'time', e.target.value)} />
                            </div>
                            <div className="col-span-2">
                              <label className="text-[10px] font-bold text-slate-400">任務標題</label>
                              <input className="w-full text-sm border-b border-slate-300 bg-transparent px-1 py-1 outline-none focus:border-amber-500 font-bold text-slate-700" value={item.task} onChange={(e)=>handleTimelineChange(idx, 'task', e.target.value)} />
                            </div>
                          </div>
                          <textarea className="w-full text-sm border border-slate-200 bg-white rounded-lg p-2 outline-none focus:ring-2 focus:ring-amber-100 text-slate-600 mt-1 leading-relaxed" rows={2} placeholder="輸入任務詳細說明..." value={item.desc} onChange={(e)=>handleTimelineChange(idx, 'desc', e.target.value)} />
                       </div>
                     ))}
                     <button onClick={addTimelineItem} className="w-full py-3 border-2 border-dashed border-amber-200 text-amber-500 hover:bg-amber-50 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors">
                       <Plus className="w-4 h-4"/> 新增時段任務
                     </button>
                  </div>
                ) : (
                  <div className="relative pl-6 border-l-2 border-slate-100 space-y-8">
                    {holidayShiftData.timeline.map((item, idx) => {
                      const dotColor = COLOR_MAP[holidayShiftData.color]?.hex || '#f59e0b';
                      return (
                        <div key={idx} className="relative">
                          <div className={`absolute -left-[31px] top-0 w-4 h-4 rounded-full border-4 border-white shadow-sm`} style={{backgroundColor: dotColor}}></div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-black text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">{item.time}</span>
                            <h5 className="text-sm font-bold text-slate-700">{item.task}</h5>
                          </div>
                          <p className="text-xs text-slate-500 leading-relaxed pl-1 whitespace-pre-wrap">{item.desc}</p>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* =========================================================
          區塊三：行政注意事項
      ========================================================= */}
      <div className="border-t border-slate-100 pt-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-slate-400" />
            行政注意事項
          </h3>
        </div>
        <div className="grid grid-cols-1 gap-3">
          {currentNotices.map(notice => {
            const isOpen = expandedNoticeId === notice.id;
            const isEditing = editMode?.key === notice.id;
            
            return (
              <div 
                key={notice.id} 
                className={`rounded-2xl border transition-all duration-300 overflow-hidden relative ${
                  isOpen ? `bg-white shadow-md ${notice.color}` : 'bg-white border-slate-100'
                }`}
              >
                {!isEditing ? (
                  <>
                    <button 
                      onClick={() => { setExpandedNoticeId(isOpen ? null : notice.id); setEditMode(null); }}
                      className="w-full flex items-center justify-between p-4"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl shadow-sm transition-colors ${isOpen ? 'bg-white' : 'bg-slate-50'}`}>
                          {notice.icon}
                        </div>
                        <h4 className={`font-bold text-sm ${isOpen ? 'text-slate-800' : 'text-slate-600'}`}>{notice.title}</h4>
                      </div>
                      <div className="flex items-center gap-4">
                         {isOpen && (
                           <span 
                             onClick={(e) => { e.stopPropagation(); startEdit('notice', notice.id, notice); }} 
                             className="text-xs font-bold text-indigo-500 hover:text-indigo-700 flex items-center gap-1 bg-indigo-50 px-2 py-1 rounded"
                           >
                             <Edit className="w-3 h-3"/> 編輯
                           </span>
                         )}
                         {isOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-300" />}
                      </div>
                    </button>
                    
                    {isOpen && (
                      <div className="px-4 pb-4 animate-in slide-in-from-top-1">
                        <div className="pt-2 border-t border-slate-100/50 text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
                          {notice.content}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="p-4 bg-indigo-50/30">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="font-bold text-indigo-800 flex items-center gap-2"><Edit className="w-4 h-4"/> 編輯公告</h4>
                      <div className="flex gap-2">
                        <button onClick={cancelEdit} className="p-1 text-slate-400 hover:bg-slate-200 rounded"><X className="w-4 h-4"/></button>
                        <button onClick={handleSave} disabled={isSubmitting} className="px-3 py-1.5 bg-indigo-600 text-white rounded text-xs font-bold shadow flex items-center gap-1">
                           {isSubmitting ? <Loader2 className="w-3 h-3 animate-spin"/> : <Save className="w-3 h-3"/>} 儲存
                        </button>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs font-bold text-slate-500">公告標題</label>
                        <input className="w-full border border-slate-300 rounded p-2 text-sm focus:ring-2 focus:ring-indigo-300 outline-none font-bold" value={editForm.title} onChange={e => setEditForm({...editForm, title: e.target.value})} />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-500">詳細內容</label>
                        <textarea className="w-full border border-slate-300 rounded p-2 text-sm focus:ring-2 focus:ring-indigo-300 outline-none leading-relaxed h-32" value={editForm.content} onChange={e => setEditForm({...editForm, content: e.target.value})} />
                      </div>
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

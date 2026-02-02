import React, { useState, useEffect } from 'react';
import { 
  collection, 
  getDocs,
  query,
  where
} from 'firebase/firestore';
import { db } from '../firebase';
import { 
  CheckCircle2, 
  AlertCircle, 
  ChevronDown, 
  ChevronRight, 
  UserCheck, 
  BookOpen,
  Calendar,
  Loader2,
  User,
  Save,
  X,
  List,
  FileText, 
  Circle,
  Clock, 
  ArrowRight
} from 'lucide-react';

// ============================================================================
// ★★★ 已自動填入您的 Google Apps Script 網址 ★★★
// ============================================================================
const GAS_API_URL = "https://script.google.com/macros/s/AKfycbw3-nakNBi0t3W3_-XtQmztYqq9qAj0ZOaGpXKZG41eZfhYjNfIM5xuVXwzSLa1_X3hfA/exec"; 

const PassportSection = ({ user, userRole, userProfile }) => {
  const [students, setStudents] = useState([]);
  const [selectedStudentEmail, setSelectedStudentEmail] = useState(user?.email);
  const [selectedStudentName, setSelectedStudentName] = useState(user?.displayName);
  const [selectedStudentDate, setSelectedStudentDate] = useState('');

  // 資料狀態: items(題目), records(成績), periods(訓練期間)
  const [passportData, setPassportData] = useState({ items: [], records: {}, periods: {} });
  
  // 本地編輯狀態 (用於暫存老師修改的日期)
  const [editPeriods, setEditPeriods] = useState({}); 

  const [loading, setLoading] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState({});
  const [errorMsg, setErrorMsg] = useState(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentEval, setCurrentEval] = useState({ itemId: '', itemName: '', status: 'pass', date: '', note: '' });
  const [submitting, setSubmitting] = useState(false);
  const [savingPeriod, setSavingPeriod] = useState(null);

  // 1. 初始化學員名單 (僅限老師)
  useEffect(() => {
    if (userRole === 'teacher') {
      const fetchStudents = async () => {
        try {
          const q = query(collection(db, 'users'), where('role', '==', 'student'));
          const snap = await getDocs(q);
          const list = snap.docs.map(d => d.data());
          setStudents(list);
        } catch (error) {
          console.error("讀取學生名單失敗:", error);
        }
      };
      fetchStudents();
    }
  }, [userRole]);

  // 2. 自動同步「到職日期」與「學員姓名」
  useEffect(() => {
    if (userRole === 'teacher') {
      if (students.length > 0 && selectedStudentEmail) {
        const s = students.find(stud => stud.email === selectedStudentEmail);
        if (s) {
          setSelectedStudentName(s.displayName || s.email);
          setSelectedStudentDate(s.arrivalDate || '');
        }
      }
    } else {
      // 學生身分：直接讀取自己的 Profile
      setSelectedStudentName(userProfile?.displayName || user.displayName);
      setSelectedStudentDate(userProfile?.arrivalDate || '');
    }
  }, [selectedStudentEmail, students, userRole, userProfile, user]);

  // 3. 讀取護照資料 (API)
  const fetchPassportData = async (email) => {
    setErrorMsg(null);
    if (!GAS_API_URL || GAS_API_URL.includes("請貼上")) {
      setErrorMsg("尚未設定 Google Apps Script 網址。");
      return;
    }
    if (!email) return;

    setLoading(true);
    try {
      const response = await fetch(`${GAS_API_URL}?type=getData&studentEmail=${email}`);
      if (!response.ok) throw new Error(`伺服器回應錯誤: ${response.status}`);
      const data = await response.json();
      if (data.status === 'error') throw new Error(data.message || "讀取資料發生錯誤");

      setPassportData(data);
      setEditPeriods(data.periods || {});

      if (data.items && data.items.length > 0) {
        const firstCat = data.items[0].category_id;
        setExpandedGroups(prev => ({ ...prev, [firstCat]: true }));
      }
    } catch (error) {
      console.error("讀取失敗:", error);
      setErrorMsg("無法讀取護照資料，請確認網路或權限設定。");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchPassportData(selectedStudentEmail);
  }, [selectedStudentEmail]);

  // 資料分組處理
  const groupedItems = (passportData.items || []).reduce((acc, item) => {
    if (!acc[item.category_id]) {
      acc[item.category_id] = {
        id: item.category_id,
        title: item.category_name,
        items: []
      };
    }
    acc[item.category_id].items.push(item);
    return acc;
  }, {});

  const openEvaluateModal = (item) => {
    if (userRole !== 'teacher') return;
    const today = new Date().toISOString().split('T')[0];
    setCurrentEval({
      itemId: item.id,
      itemName: item.sub_item || item.title, 
      status: 'pass',
      date: today,
      note: ''
    });
    setIsModalOpen(true);
  };

  const handleSubmitEval = async () => {
    setSubmitting(true);
    const teacherDisplayName = userProfile?.displayName || user.displayName || user.email.split('@')[0];
    const payload = {
      type: 'saveEval',
      studentEmail: selectedStudentEmail,
      itemId: currentEval.itemId,
      status: currentEval.status,
      assessDate: currentEval.date,
      teacherName: teacherDisplayName,
      note: currentEval.note
    };

    try {
      await fetch(GAS_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload)
      });
      await fetchPassportData(selectedStudentEmail);
      setIsModalOpen(false);
      alert("評核已儲存！");
    } catch (error) {
      console.error(error);
      alert("儲存失敗");
    }
    setSubmitting(false);
  };

  const handlePeriodChange = (catId, field, value) => {
    setEditPeriods(prev => ({
      ...prev,
      [catId]: {
        ...prev[catId],
        [field]: value
      }
    }));
  };

  // 修正重點：儲存期間時，使用 selectedStudentEmail
  const handleSavePeriod = async (catId) => {
    setSavingPeriod(catId);
    const periodData = editPeriods[catId];
    const teacherDisplayName = userProfile?.displayName || user.displayName;

    const payload = {
      type: 'savePeriod',
      studentEmail: selectedStudentEmail, // 修正：這是目標學生的 email
      categoryId: catId,
      startDate: periodData?.startDate || '',
      endDate: periodData?.endDate || '',
      updatedBy: teacherDisplayName
    };

    try {
      await fetch(GAS_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload)
      });
      await fetchPassportData(selectedStudentEmail);
    } catch (error) {
      alert("日期儲存失敗");
    }
    setSavingPeriod(null);
  };

  const toggleGroup = (groupId) => {
    setExpandedGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  const renderItemRow = (item, isMainItem = false) => {
    const record = passportData.records[item.id] || {};
    const status = record.status; 
    
    return (
      <div 
        key={item.id} 
        className={`
          p-3 pl-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-gray-50 border-b border-gray-50 last:border-0
          ${isMainItem ? 'bg-white' : ''} 
        `}
      >
        <div className="flex-1">
          <p className={`text-sm flex items-start gap-2 ${isMainItem ? 'font-bold text-gray-700' : 'font-medium text-gray-800'}`}>
            <span className="mt-1">
              {isMainItem ? <FileText className="w-4 h-4 text-gray-500" /> : <Circle className="w-2 h-2 text-gray-300 fill-gray-300 mt-1" />}
            </span>
            {item.sub_item || item.title}
          </p>
          {record.teacher && (
            <p className="text-xs text-green-600 mt-1 ml-6 flex items-center gap-1">
              <UserCheck className="w-3 h-3" />
              {record.teacher} ({new Date(record.date).toLocaleDateString()})
              {record.note && <span className="text-gray-400"> - {record.note}</span>}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 ml-6 sm:ml-0">
          {status === 'pass' && (
            <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold flex items-center gap-1 whitespace-nowrap">
              <CheckCircle2 className="w-3 h-3" /> 合格
            </span>
          )}
          {status === 'improve' && (
            <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-bold flex items-center gap-1 whitespace-nowrap">
              <AlertCircle className="w-3 h-3" /> 再加強
            </span>
          )}
          
          {userRole === 'teacher' && (
            <button
              onClick={() => openEvaluateModal(item)}
              className="px-3 py-1 border border-indigo-200 text-indigo-600 hover:bg-indigo-50 rounded-md text-xs font-bold transition-colors whitespace-nowrap"
            >
              {status ? '重評' : '評核'}
            </button>
          )}
        </div>
      </div>
    );
  };

  const renderGroupContent = (items) => {
    const groups = {};
    const groupOrder = []; 
    items.forEach(item => {
      if (!groups[item.title]) {
        groups[item.title] = [];
        groupOrder.push(item.title);
      }
      groups[item.title].push(item);
    });

    return groupOrder.map((mainTitle, idx) => {
      const subItems = groups[mainTitle];
      const isGroup = subItems.length > 1 || (subItems[0] && subItems[0].sub_item);
      
      if (isGroup) {
        return (
          <div key={idx} className="mb-4 last:mb-0 border border-gray-100 rounded-lg overflow-hidden shadow-sm">
            <div className="bg-gray-100 px-4 py-2 font-bold text-gray-700 text-sm flex items-center gap-2">
              <List className="w-4 h-4 text-gray-500" />
              {mainTitle}
            </div>
            <div className="bg-white">
              {subItems.map(item => renderItemRow(item, false))}
            </div>
          </div>
        );
      } else {
        return (
           <div key={idx} className="mb-4 last:mb-0 border border-gray-100 rounded-lg overflow-hidden shadow-sm">
             {renderItemRow(subItems[0], true)}
           </div>
        );
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-4 md:p-6 md:rounded-xl shadow-sm border border-gray-100">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-100 p-2 rounded-lg">
               <BookOpen className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">新進人員學習護照</h2>
              <p className="text-xs text-gray-500">
                {userRole === 'teacher' ? '請選擇學員進行考核與安排進度' : '您的學習進度與排程'}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2 items-end">
            {userRole === 'teacher' && (
              <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg border border-gray-200">
                <User className="w-4 h-4 text-gray-400" />
                <select 
                  value={selectedStudentEmail}
                  onChange={(e) => setSelectedStudentEmail(e.target.value)}
                  className="bg-transparent text-sm font-bold text-gray-700 outline-none min-w-[150px]"
                >
                  {students.length > 0 ? (
                    students.map(s => (
                      <option key={s.email} value={s.email}>
                        {s.displayName || s.email}
                      </option>
                    ))
                  ) : (
                    <option disabled>無符合的學員資料</option>
                  )}
                </select>
              </div>
            )}
            
            {userRole !== 'teacher' && (
              <div className="px-4 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg text-sm font-bold flex items-center gap-2">
                <User className="w-4 h-4" />
                學員：{selectedStudentName}
              </div>
            )}

            {selectedStudentDate ? (
              <div className="px-4 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-xs font-medium flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5" />
                到職：{selectedStudentDate}
              </div>
            ) : (
              <div className="px-4 py-1.5 bg-gray-50 text-gray-400 rounded-lg text-xs font-medium flex items-center gap-2 border border-dashed border-gray-200">
                <Calendar className="w-3.5 h-3.5" />
                未設定到職日
              </div>
            )}
          </div>
        </div>

        {errorMsg && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4 rounded text-red-700 text-sm font-bold flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            {errorMsg}
          </div>
        )}

        {loading ? (
          <div className="text-center py-12 text-gray-400 flex flex-col items-center">
            <Loader2 className="w-8 h-8 animate-spin mb-2" />
            <p>正在同步雲端護照資料...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.values(groupedItems).map((group) => {
              const isExpanded = expandedGroups[group.id];
              const groupItems = group.items || [];
              const completedCount = groupItems.filter(item => passportData.records[item.id]?.status === 'pass').length;
              const totalCount = groupItems.length;
              const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
              
              // 分離顯示資料(serverPeriod) 與 編輯資料(editPeriod)
              const serverPeriod = passportData.periods[group.id] || { startDate: '', endDate: '' };
              const editPeriod = editPeriods[group.id] || serverPeriod;
              
              const isSaving = savingPeriod === group.id;
              
              // 檢查是否有變更
              const hasChanged = editPeriod.startDate !== serverPeriod.startDate || editPeriod.endDate !== serverPeriod.endDate;

              return (
                <div key={group.id} className="border border-gray-200 rounded-lg overflow-hidden bg-white">
                  {/* 組別 Header */}
                  <div className="p-4 bg-gray-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <button 
                      onClick={() => toggleGroup(group.id)}
                      className="flex items-center gap-3 hover:text-indigo-600 transition-colors text-left flex-1"
                    >
                      {isExpanded ? <ChevronDown className="w-5 h-5 text-gray-400" /> : <ChevronRight className="w-5 h-5 text-gray-400" />}
                      <div>
                        <span className="font-bold text-gray-700 block sm:inline">{group.title}</span>
                        <div className="sm:hidden mt-1">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${progress === 100 ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>
                            {progress}%
                          </span>
                        </div>
                      </div>
                      <div className="hidden sm:block">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${progress === 100 ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>
                            {progress}%
                          </span>
                      </div>
                    </button>

                    {/* 日期顯示區 */}
                    <div className="flex items-center gap-2 text-xs sm:text-sm bg-white p-1.5 rounded-lg border border-gray-200 shadow-sm self-start sm:self-auto">
                      <div className="flex items-center gap-1 text-gray-500 px-1">
                        <Clock className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">期間:</span>
                      </div>
                      
                      {userRole === 'teacher' ? (
                        <>
                          <input 
                            type="date" 
                            className="outline-none text-gray-600 font-medium bg-transparent w-24 sm:w-auto"
                            value={editPeriod.startDate || ''}
                            onChange={(e) => handlePeriodChange(group.id, 'startDate', e.target.value)}
                          />
                          <span className="text-gray-300">➜</span>
                          <input 
                            type="date" 
                            className="outline-none text-gray-600 font-medium bg-transparent w-24 sm:w-auto"
                            value={editPeriod.endDate || ''}
                            onChange={(e) => handlePeriodChange(group.id, 'endDate', e.target.value)}
                          />
                          
                          {(hasChanged || isSaving) && (
                             <button
                               onClick={() => handleSavePeriod(group.id)}
                               disabled={isSaving}
                               className="ml-1 p-1 rounded-full bg-indigo-100 text-indigo-600 hover:bg-indigo-200 transition-colors"
                               title="儲存日期"
                             >
                               {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                             </button>
                          )}
                        </>
                      ) : (
                        // 學生唯讀視角
                        <div className="flex items-center gap-2 text-gray-600 font-medium px-1">
                           <span>{serverPeriod.startDate || '--'}</span>
                           <ArrowRight className="w-3 h-3 text-gray-400" />
                           <span>{serverPeriod.endDate || '--'}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="bg-white p-3 border-t border-gray-100 animate-in slide-in-from-top-1">
                      {renderGroupContent(group.items)}
                    </div>
                  )}
                </div>
              );
            })}
            
            {!loading && Object.keys(groupedItems).length === 0 && (
              <div className="text-center py-8 text-gray-400 border border-dashed rounded-lg bg-gray-50">
                <p className="mb-2">📋 目前護照內容是空的</p>
                <p className="text-xs">請至 Google 試算表的 <b>PassportItems</b> 分頁新增項目</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Evaluate Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
              <h3 className="font-bold text-gray-800">考核評分</h3>
              <button onClick={() => setIsModalOpen(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">考核項目</label>
                <p className="text-sm font-bold text-gray-800 bg-gray-100 p-2 rounded">{currentEval.itemName}</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">評核日期</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                  <input 
                    type="date" 
                    value={currentEval.date}
                    onChange={e => setCurrentEval({...currentEval, date: e.target.value})}
                    className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">評核結果</label>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setCurrentEval({...currentEval, status: 'pass'})}
                    className={`flex-1 py-2 rounded-lg text-sm font-bold border transition-all ${
                      currentEval.status === 'pass' 
                        ? 'bg-green-100 text-green-700 border-green-300' 
                        : 'bg-white text-gray-500 border-gray-200'
                    }`}
                  >
                    合格
                  </button>
                  <button 
                    onClick={() => setCurrentEval({...currentEval, status: 'improve'})}
                    className={`flex-1 py-2 rounded-lg text-sm font-bold border transition-all ${
                      currentEval.status === 'improve' 
                        ? 'bg-orange-100 text-orange-700 border-orange-300' 
                        : 'bg-white text-gray-500 border-gray-200'
                    }`}
                  >
                    再加強
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">備註/建議 (選填)</label>
                <input 
                  type="text" 
                  value={currentEval.note}
                  onChange={e => setCurrentEval({...currentEval, note: e.target.value})}
                  placeholder="例如：操作流暢、需注意無菌..."
                  className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:border-indigo-500"
                />
              </div>

              <button 
                onClick={handleSubmitEval}
                disabled={submitting}
                className="w-full py-2.5 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 disabled:opacity-50 flex justify-center items-center gap-2"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                確認送出
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PassportSection;

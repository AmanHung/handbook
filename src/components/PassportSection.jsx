import React, { useState, useEffect } from 'react';
import { 
  collection, getDocs, query, where
} from 'firebase/firestore';
import { db } from '../firebase';
import { 
  CheckCircle2, AlertCircle, ChevronDown, ChevronRight, UserCheck, 
  BookOpen, Calendar, Loader2, User, Save, X, List, FileText, 
  Circle, Clock, ClipboardList, Activity, 
  GraduationCap, Layout, CheckSquare, ClipboardCheck, FileEdit, Stethoscope, 
  Award // [新] 學習成果圖示
} from 'lucide-react';

// 引入子元件
import PreTrainingAssessment from './PreTrainingAssessment';
import EPAAssessment from './EPAAssessment';
import DOPSAssessment from './DOPSAssessment'; 
import MiniCEXAssessment from './MiniCEXAssessment';
import KSAAssessment from './KSAAssessment';
import WrittenTestAssessment from './WrittenTestAssessment';
import FinalAssessment from './FinalAssessment'; // [新] 引入完訓評估

// Google Apps Script API 網址
const GAS_API_URL = "https://script.google.com/macros/s/AKfycbw3-nakNBi0t3W3_-XtQmztYqq9qAj0ZOaGpXKZG41eZfhYjNfIM5xuVXwzSLa1_X3hfA/exec"; 

const PassportSection = ({ user, userRole, userProfile }) => {
  const [students, setStudents] = useState([]);
  const isTeacherOrAdmin = ['teacher', 'admin'].includes(userRole);
  
  const [selectedStudentEmail, setSelectedStudentEmail] = useState(isTeacherOrAdmin ? '' : user?.email);
  const [selectedStudentName, setSelectedStudentName] = useState(user?.displayName);
  const [selectedStudentDate, setSelectedStudentDate] = useState('');

  // 導航狀態: records(訓練紀錄), assessment(學習評估), outcome(學習成果)
  const [activeMainTab, setActiveMainTab] = useState('records'); 
  const [assessmentType, setAssessmentType] = useState('pre_training'); 

  const [passportData, setPassportData] = useState({ items: [], records: {}, periods: {} });
  const [editPeriods, setEditPeriods] = useState({}); 
  const [loading, setLoading] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState({});
  const [errorMsg, setErrorMsg] = useState(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentEval, setCurrentEval] = useState({ itemId: '', itemName: '', status: 'pass', date: '', note: '' });
  const [submitting, setSubmitting] = useState(false);
  const [savingPeriod, setSavingPeriod] = useState(null);

  // 初始化學員名單
  useEffect(() => {
    if (isTeacherOrAdmin) {
      const fetchStudents = async () => {
        try {
          const q = query(collection(db, 'users'), where('role', '==', 'student'));
          const snap = await getDocs(q);
          const list = snap.docs.map(d => d.data());
          setStudents(list);

          if (list.length > 0) {
            const isCurrentEmailValid = list.some(s => s.email === selectedStudentEmail);
            if (!selectedStudentEmail || !isCurrentEmailValid) {
              setSelectedStudentEmail(list[0].email);
            }
          }
        } catch (error) {
          console.error("讀取學生名單失敗:", error);
        }
      };
      fetchStudents();
    }
  }, [userRole]);

  // 同步學員資訊
  useEffect(() => {
    if (isTeacherOrAdmin) {
      if (students.length > 0 && selectedStudentEmail) {
        const s = students.find(stud => stud.email === selectedStudentEmail);
        if (s) {
          setSelectedStudentName(s.displayName || s.email);
          setSelectedStudentDate(s.arrivalDate || '');
        }
      }
    } else {
      setSelectedStudentName(userProfile?.displayName || user.displayName);
      setSelectedStudentDate(userProfile?.arrivalDate || '');
    }
  }, [selectedStudentEmail, students, userRole, userProfile, user]);

  // 讀取護照資料
  useEffect(() => {
    if (selectedStudentEmail && activeMainTab === 'records') {
      fetchPassportData(selectedStudentEmail);
    }
  }, [selectedStudentEmail, activeMainTab]);

  const fetchPassportData = async (email) => {
    setErrorMsg(null);
    if (!email) return;

    setLoading(true);
    try {
      const response = await fetch(`${GAS_API_URL}?type=getData&studentEmail=${email}`);
      const data = await response.json();
      if (data.status === 'error') throw new Error(data.message);

      setPassportData(data);
      setEditPeriods(data.periods || {});

      if (data.items && data.items.length > 0) {
        const firstCat = data.items[0].category_id;
        if (Object.keys(expandedGroups).length === 0) {
            setExpandedGroups(prev => ({ ...prev, [firstCat]: true }));
        }
      }
    } catch (error) {
      console.error("讀取失敗:", error);
      setErrorMsg("無法讀取護照資料，請確認網路或權限設定。");
    }
    setLoading(false);
  };

  const openEvaluateModal = (item) => {
    if (!isTeacherOrAdmin) return;
    const today = new Date().toISOString().split('T')[0];
    setCurrentEval({ itemId: item.id, itemName: item.sub_item || item.title, status: 'pass', date: today, note: '' });
    setIsModalOpen(true);
  };

  const handleSubmitEval = async () => {
    setSubmitting(true);
    const teacherDisplayName = userProfile?.displayName || user.displayName || user.email.split('@')[0];
    try {
      await fetch(GAS_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          type: 'saveEval', studentEmail: selectedStudentEmail, itemId: currentEval.itemId,
          status: currentEval.status, assessDate: currentEval.date, teacherName: teacherDisplayName, note: currentEval.note
        })
      });
      await fetchPassportData(selectedStudentEmail);
      setIsModalOpen(false);
      alert("評核已儲存！");
    } catch (error) {
      alert("儲存失敗");
    }
    setSubmitting(false);
  };

  const handlePeriodChange = (catId, field, value) => {
    setEditPeriods(prev => ({ ...prev, [catId]: { ...prev[catId], [field]: value } }));
  };

  const handleSavePeriod = async (catId) => {
    setSavingPeriod(catId);
    const periodData = editPeriods[catId];
    try {
      await fetch(GAS_API_URL, {
        method: 'POST',
        body: JSON.stringify({
          type: 'savePeriod', studentEmail: selectedStudentEmail, categoryId: catId,
          startDate: periodData?.startDate || '', endDate: periodData?.endDate || '', updatedBy: userProfile?.displayName || user.displayName
        })
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

  const groupedItems = (passportData.items || []).reduce((acc, item) => {
    if (!acc[item.category_id]) acc[item.category_id] = { id: item.category_id, title: item.category_name, items: [] };
    acc[item.category_id].items.push(item);
    return acc;
  }, {});

  const renderItemRow = (item, isMainItem = false) => {
    const record = passportData.records[item.id] || {};
    const status = record.status; 
    return (
      <div key={item.id} className={`p-3 pl-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-gray-50 border-b border-gray-50 last:border-0 ${isMainItem ? 'bg-white' : ''}`}>
        <div className="flex-1">
          <p className={`text-sm flex items-start gap-2 ${isMainItem ? 'font-bold text-gray-700' : 'font-medium text-gray-800'}`}>
            <span className="mt-1">{isMainItem ? <FileText className="w-4 h-4 text-gray-500" /> : <Circle className="w-2 h-2 text-gray-300 fill-gray-300 mt-1" />}</span>
            {item.sub_item || item.title}
          </p>
          {record.teacher && (
            <p className="text-xs text-green-600 mt-1 ml-6 flex items-center gap-1">
              <UserCheck className="w-3 h-3" /> {record.teacher} ({new Date(record.date).toLocaleDateString()})
              {record.note && <span className="text-gray-400"> - {record.note}</span>}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 ml-6 sm:ml-0">
          {status === 'pass' && <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> 合格</span>}
          {status === 'improve' && <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-bold flex items-center gap-1"><AlertCircle className="w-3 h-3" /> 再加強</span>}
          {isTeacherOrAdmin && (
            <button onClick={() => openEvaluateModal(item)} className="px-3 py-1 border border-indigo-200 text-indigo-600 hover:bg-indigo-50 rounded-md text-xs font-bold transition-colors">
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
      if (!groups[item.title]) { groups[item.title] = []; groupOrder.push(item.title); }
      groups[item.title].push(item);
    });
    return groupOrder.map((mainTitle, idx) => {
      const subItems = groups[mainTitle];
      const isGroup = subItems.length > 1 || (subItems[0] && subItems[0].sub_item);
      return (
        <div key={idx} className="mb-4 last:mb-0 border border-gray-100 rounded-lg overflow-hidden shadow-sm">
          {isGroup && <div className="bg-gray-100 px-4 py-2 font-bold text-gray-700 text-sm flex items-center gap-2"><List className="w-4 h-4 text-gray-500" />{mainTitle}</div>}
          <div className="bg-white">{subItems.map(item => renderItemRow(item, !isGroup))}</div>
        </div>
      );
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
                {isTeacherOrAdmin ? '請選擇學員以檢視紀錄或評估' : '您的學習進度總覽'}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2 items-end">
            {isTeacherOrAdmin ? (
              <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg border border-gray-200">
                <User className="w-4 h-4 text-gray-400" />
                <select 
                  value={selectedStudentEmail}
                  onChange={(e) => setSelectedStudentEmail(e.target.value)} 
                  className="bg-transparent text-sm font-bold text-gray-700 outline-none min-w-[150px]"
                >
                  {students.length > 0 ? (
                    students.map(s => <option key={s.email} value={s.email}>{s.displayName || s.email}</option>)
                  ) : <option disabled>載入中...</option>}
                </select>
              </div>
            ) : (
              <div className="px-4 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg text-sm font-bold flex items-center gap-2">
                <User className="w-4 h-4" /> 學員：{selectedStudentName}
              </div>
            )}
            {selectedStudentDate && (
              <div className="px-4 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-xs font-medium flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5" /> 到職：{selectedStudentDate}
              </div>
            )}
          </div>
        </div>

        {/* 主選單 (Main Tabs) - [新增] 學習成果 */}
        <div className="flex border-b border-gray-200 mb-6 overflow-x-auto">
          <button
            onClick={() => setActiveMainTab('records')}
            className={`flex-1 py-3 text-center font-bold text-sm sm:text-base flex items-center justify-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
              activeMainTab === 'records' 
                ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50' 
                : 'border-transparent text-gray-500 hover:bg-gray-50'
            }`}
          >
            <ClipboardList className="w-5 h-5" />
            訓練紀錄
          </button>
          <button
            onClick={() => setActiveMainTab('assessment')}
            className={`flex-1 py-3 text-center font-bold text-sm sm:text-base flex items-center justify-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
              activeMainTab === 'assessment' 
                ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50' 
                : 'border-transparent text-gray-500 hover:bg-gray-50'
            }`}
          >
            <GraduationCap className="w-5 h-5" />
            學習評估
          </button>
          <button
            onClick={() => setActiveMainTab('outcome')}
            className={`flex-1 py-3 text-center font-bold text-sm sm:text-base flex items-center justify-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
              activeMainTab === 'outcome' 
                ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50' 
                : 'border-transparent text-gray-500 hover:bg-gray-50'
            }`}
          >
            <Award className="w-5 h-5" />
            學習成果
          </button>
        </div>

        {errorMsg && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4 rounded text-red-700 text-sm font-bold flex items-center gap-2">
            <AlertCircle className="w-5 h-5" /> {errorMsg}
          </div>
        )}

        {/* 1. 訓練紀錄 */}
        {activeMainTab === 'records' && (
          <div className="space-y-4 animate-in fade-in">
            {loading ? (
              <div className="text-center py-12 text-gray-400 flex flex-col items-center">
                <Loader2 className="w-8 h-8 animate-spin mb-2" />
                <p>正在同步雲端護照資料...</p>
              </div>
            ) : (
              Object.values(groupedItems).length > 0 ? (
                Object.values(groupedItems).map((group) => {
                  const isExpanded = expandedGroups[group.id];
                  const progress = group.items.length > 0 ? Math.round((group.items.filter(item => passportData.records[item.id]?.status === 'pass').length / group.items.length) * 100) : 0;
                  const serverPeriod = passportData.periods[group.id] || {};
                  const editPeriod = editPeriods[group.id] || serverPeriod;
                  const isSaving = savingPeriod === group.id;
                  const hasChanged = editPeriod.startDate !== serverPeriod.startDate || editPeriod.endDate !== serverPeriod.endDate;

                  return (
                    <div key={group.id} className="border border-gray-200 rounded-lg overflow-hidden bg-white">
                      <div className="p-4 bg-gray-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <button onClick={() => toggleGroup(group.id)} className="flex items-center gap-3 hover:text-indigo-600 transition-colors text-left flex-1">
                          {isExpanded ? <ChevronDown className="w-5 h-5 text-gray-400" /> : <ChevronRight className="w-5 h-5 text-gray-400" />}
                          <div>
                            <span className="font-bold text-gray-700 block sm:inline">{group.title}</span>
                          </div>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${progress === 100 ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>{progress}%</span>
                        </button>
                        
                        <div className="flex items-center gap-2 text-xs sm:text-sm bg-white p-1.5 rounded-lg border border-gray-200 shadow-sm self-start sm:self-auto">
                           <Clock className="w-3.5 h-3.5 text-gray-400" />
                           {isTeacherOrAdmin ? (
                              <>
                                <input type="date" className="bg-transparent w-24 sm:w-auto outline-none" value={editPeriod.startDate || ''} onChange={(e) => handlePeriodChange(group.id, 'startDate', e.target.value)} />
                                <span className="text-gray-300">➜</span>
                                <input type="date" className="bg-transparent w-24 sm:w-auto outline-none" value={editPeriod.endDate || ''} onChange={(e) => handlePeriodChange(group.id, 'endDate', e.target.value)} />
                                {(hasChanged || isSaving) && <button onClick={() => handleSavePeriod(group.id)} disabled={isSaving} className="ml-1 p-1 rounded-full bg-indigo-100 text-indigo-600">{isSaving ? <Loader2 className="w-3 h-3 animate-spin"/> : <Save className="w-3 h-3"/>}</button>}
                              </>
                           ) : (
                              <span>{serverPeriod.startDate || '--'} ➜ {serverPeriod.endDate || '--'}</span>
                           )}
                        </div>
                      </div>
                      {isExpanded && <div className="bg-white p-3 border-t border-gray-100">{renderGroupContent(group.items)}</div>}
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8 text-gray-400 border border-dashed rounded-lg bg-gray-50">📋 目前護照內容是空的</div>
              )
            )}
          </div>
        )}

        {/* 2. 學習評估 */}
        {activeMainTab === 'assessment' && (
          <div className="animate-in fade-in duration-300">
            {/* 子選單 */}
            <div className="mb-6 overflow-x-auto pb-2 scrollbar-hide">
              <div className="flex items-center gap-3">
                <button onClick={() => setAssessmentType('pre_training')} className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all border ${assessmentType === 'pre_training' ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
                  <Layout className="w-4 h-4" /> 新進藥師學前評估表
                </button>
                <button onClick={() => setAssessmentType('epa')} className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all border ${assessmentType === 'epa' ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
                  <Activity className="w-4 h-4" /> EPA 評估
                </button>
                <button onClick={() => setAssessmentType('dops')} className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all border ${assessmentType === 'dops' ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
                  <CheckSquare className="w-4 h-4" /> DOPS 評估
                </button>
                <button onClick={() => setAssessmentType('minicex')} className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all border ${assessmentType === 'minicex' ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
                  <Stethoscope className="w-4 h-4" /> Mini-CEX
                </button>
                <button onClick={() => setAssessmentType('ksa')} className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all border ${assessmentType === 'ksa' ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
                  <ClipboardCheck className="w-4 h-4" /> KSA 評估
                </button>
                <button onClick={() => setAssessmentType('written_test')} className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all border ${assessmentType === 'written_test' ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
                  <FileEdit className="w-4 h-4" /> 筆試測驗
                </button>
              </div>
            </div>

            {/* 內容 */}
            {assessmentType === 'pre_training' && <PreTrainingAssessment studentEmail={selectedStudentEmail} studentName={selectedStudentName} userRole={userRole} currentUserEmail={user?.email} currentUserName={userProfile?.displayName || user?.displayName} gasApiUrl={GAS_API_URL} />}
            {assessmentType === 'epa' && <EPAAssessment studentEmail={selectedStudentEmail} studentName={selectedStudentName} isTeacher={isTeacherOrAdmin} userProfile={userProfile} apiUrl={GAS_API_URL} />}
            {assessmentType === 'dops' && <DOPSAssessment studentEmail={selectedStudentEmail} studentName={selectedStudentName} userRole={userRole} currentUserEmail={user?.email} currentUserName={userProfile?.displayName || user?.displayName} gasApiUrl={GAS_API_URL} />}
            {assessmentType === 'minicex' && <MiniCEXAssessment studentEmail={selectedStudentEmail} studentName={selectedStudentName} isTeacher={isTeacherOrAdmin} userProfile={userProfile} apiUrl={GAS_API_URL} />}
            {assessmentType === 'ksa' && <KSAAssessment studentEmail={selectedStudentEmail} studentName={selectedStudentName} isTeacher={isTeacherOrAdmin} userProfile={userProfile} apiUrl={GAS_API_URL} />}
            {assessmentType === 'written_test' && <WrittenTestAssessment studentEmail={selectedStudentEmail} studentName={selectedStudentName} isTeacher={isTeacherOrAdmin} userProfile={userProfile} apiUrl={GAS_API_URL} />}
          </div>
        )}

        {/* 3. [新] 學習成果 */}
        {activeMainTab === 'outcome' && (
          <div className="animate-in fade-in duration-300">
             <div className="bg-purple-50 p-4 rounded-lg mb-6 border border-purple-100 flex items-start gap-3">
               <Award className="w-6 h-6 text-purple-600 shrink-0 mt-1" />
               <div>
                 <h3 className="font-bold text-purple-800 text-lg">學習成果總結</h3>
                 <p className="text-sm text-purple-600">在此檢核學員是否完成所有必修項目，並進行完訓資格審核。</p>
               </div>
             </div>
             
             <FinalAssessment 
               studentEmail={selectedStudentEmail} 
               studentName={selectedStudentName} 
               isTeacher={isTeacherOrAdmin} 
               userProfile={userProfile} 
               apiUrl={GAS_API_URL} 
             />
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
               <div><label className="block text-xs font-bold text-gray-500 mb-1">項目</label><p className="font-bold">{currentEval.itemName}</p></div>
               <div><label className="block text-xs font-bold text-gray-500 mb-1">日期</label><input type="date" value={currentEval.date} onChange={e => setCurrentEval({...currentEval, date: e.target.value})} className="w-full border rounded p-2"/></div>
               <div className="flex gap-2">
                 <button onClick={() => setCurrentEval({...currentEval, status: 'pass'})} className={`flex-1 py-2 rounded border font-bold ${currentEval.status==='pass'?'bg-green-100 text-green-700':'bg-white'}`}>合格</button>
                 <button onClick={() => setCurrentEval({...currentEval, status: 'improve'})} className={`flex-1 py-2 rounded border font-bold ${currentEval.status==='improve'?'bg-orange-100 text-orange-700':'bg-white'}`}>再加強</button>
               </div>
               <button onClick={handleSubmitEval} disabled={submitting} className="w-full py-2 bg-indigo-600 text-white rounded font-bold">{submitting ? '儲存中...' : '確認送出'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PassportSection;

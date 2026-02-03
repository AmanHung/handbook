import React, { useState, useEffect } from 'react';
import { 
  BookOpen, History, ChevronRight, Plus, 
  Calendar, User, CheckCircle2, AlertCircle, Search, Loader2 
} from 'lucide-react';
import { EPA_CONFIG, EPA_LEVEL_OPTIONS } from '../data/EPA_Config';
import EPAFormModal from './EPAFormModal'; // 引入 Step 3 的表單

const EPAAssessment = ({ studentEmail, studentName, isTeacher, userProfile, apiUrl }) => {
  const [selectedEPA, setSelectedEPA] = useState(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showFormModal, setShowFormModal] = useState(false);
  
  // 資料狀態
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 1. 讀取歷史紀錄 (API)
  const fetchEPARecords = async () => {
    if (!studentEmail) return;
    setLoading(true);
    try {
      const response = await fetch(`${apiUrl}?action=get_epa_records&student_email=${studentEmail}`);
      const data = await response.json();
      
      // 增加防呆：確認回傳的是陣列才設定，否則設為空陣列
      if (Array.isArray(data)) {
        setAssessments(data);
      } else {
        console.error("API 回傳格式錯誤 (非陣列):", data);
        setAssessments([]); 
      }
    } catch (error) {
      console.error("Failed to fetch EPA records:", error);
      // alert("讀取 EPA 紀錄失敗，請檢查網路"); // 建議先註解掉 alert 避免一直跳窗
      setAssessments([]);
    } finally {
      setLoading(false);
    }
  };

  // 初始載入或切換學員時重新讀取
  useEffect(() => {
    fetchEPARecords();
  }, [studentEmail]);

  // 2. 儲存新評估 (API)
  const handleSaveRecord = async (formData) => {
    setIsSubmitting(true);
    try {
      // 呼叫 GAS: action=save_epa_record
      await fetch(apiUrl, {
        method: 'POST',
        body: JSON.stringify({
          action: 'save_epa_record',
          student_email: studentEmail,
          ...formData
        })
      });
      
      alert("評估已儲存！");
      setShowFormModal(false); // 關閉表單
      setShowHistoryModal(true); // 回到歷史紀錄
      fetchEPARecords(); // 重新整理列表
      
    } catch (error) {
      console.error("Save failed:", error);
      alert("儲存失敗，請稍後再試");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 開啟歷史視窗
  const handleCardClick = (epa) => {
    setSelectedEPA(epa);
    setShowHistoryModal(true);
  };

  // 從歷史視窗切換到新增表單
  const handleOpenForm = () => {
    setShowHistoryModal(false);
    setShowFormModal(true);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* 標題區 */}
      <div className="flex justify-between items-center border-b pb-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-indigo-600" />
            EPA 可信任專業活動評估
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            學員：<span className="font-medium text-gray-700">{studentName || '未選擇'}</span>
          </p>
        </div>
        
        {loading && <span className="text-indigo-600 flex items-center gap-2 text-sm"><Loader2 className="w-4 h-4 animate-spin"/> 資料同步中...</span>}
      </div>

      {/* EPA 卡片列表 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {EPA_CONFIG.map((epa) => {
          const epaRecords = assessments.filter(r => r.epa_id === epa.id);
          const lastRecord = epaRecords.length > 0 ? epaRecords[0] : null; 
          const count = epaRecords.length;

          return (
            <div 
              key={epa.id}
              onClick={() => handleCardClick(epa)}
              className="bg-white border rounded-xl p-5 hover:shadow-lg transition-all cursor-pointer group relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="flex justify-between items-start mb-3">
                <span className="px-2 py-1 bg-indigo-50 text-indigo-700 text-xs font-bold rounded">{epa.id}</span>
                {count > 0 && (
                  <span className="flex items-center gap-1 text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                    <History className="w-3 h-3" /> {count} 次
                  </span>
                )}
              </div>
              <h3 className="font-bold text-gray-800 mb-2 group-hover:text-indigo-600">{epa.title.replace(`${epa.id}. `, '')}</h3>
              <p className="text-sm text-gray-500 line-clamp-2 mb-4 h-10">{epa.description}</p>
              <div className="pt-3 border-t flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-xs text-gray-400">目前信賴等級</span>
                  <span className={`text-sm font-bold ${lastRecord ? 'text-green-600' : 'text-gray-300'}`}>
                    {lastRecord ? lastRecord.evaluation.level : '尚未評估'}
                  </span>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-indigo-500 transition-all" />
              </div>
            </div>
          );
        })}
      </div>

      {/* 歷史紀錄 Modal */}
      {showHistoryModal && selectedEPA && (
        <HistoryModal 
          epa={selectedEPA} 
          // ★★★ 修改這裡：確保 assessments 是陣列才執行 filter ★★★
          records={Array.isArray(assessments) ? assessments.filter(r => r.epa_id === selectedEPA.id) : []}
          onClose={() => setShowHistoryModal(false)}
          onOpenForm={handleOpenForm}
          isTeacher={isTeacher}
          studentName={studentName}
        />
      )}

      {/* 新增評估表單 Modal */}
      {showFormModal && selectedEPA && (
        <EPAFormModal
          epa={selectedEPA}
          studentName={studentName}
          teacherName={userProfile?.displayName || 'Teacher'}
          onClose={() => setShowFormModal(false)}
          onSubmit={handleSaveRecord}
          isSubmitting={isSubmitting}
        />
      )}
    </div>
  );
};

// --- HistoryModal 子元件 (包含新增按鈕邏輯) ---
const HistoryModal = ({ epa, records, onClose, onOpenForm, isTeacher, studentName }) => {
  const [selectedRecordId, setSelectedRecordId] = useState(null);

  useEffect(() => {
    if (records.length > 0) setSelectedRecordId(records[0].record_id);
  }, [records]);

  const currentRecord = records.find(r => r.record_id === selectedRecordId);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-5xl h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50">
          <div>
            <h3 className="text-lg font-bold text-gray-800">{epa.title}</h3>
            <p className="text-sm text-gray-500">學員：{studentName}</p>
          </div>
          <div className="flex items-center gap-3">
            {isTeacher && (
              <button 
                onClick={onOpenForm} 
                className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm font-medium"
              >
                <Plus className="w-4 h-4" /> 新增評估
              </button>
            )}
            <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full text-gray-500">✕</button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* 左側清單 */}
          <div className="w-1/3 border-r bg-gray-50 overflow-y-auto p-4">
            <h4 className="text-xs font-bold text-gray-400 uppercase mb-3">歷史紀錄 ({records.length})</h4>
            <div className="space-y-3">
              {records.length === 0 ? <div className="text-center py-10 text-gray-400 text-sm">尚無紀錄</div> : 
                records.map((record) => (
                  <button
                    key={record.record_id}
                    onClick={() => setSelectedRecordId(record.record_id)}
                    className={`w-full text-left p-3 rounded-lg border transition-all ${selectedRecordId === record.record_id ? 'bg-white border-indigo-500 ring-1 ring-indigo-500' : 'bg-white border-gray-200 hover:border-indigo-300'}`}
                  >
                    <div className="flex justify-between font-bold text-gray-800 text-sm">
                      {record.evaluation.date}
                      <span className="text-indigo-600">Level {record.evaluation.level}</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1 flex items-center gap-1"><User className="w-3 h-3"/> {record.teacher_name}</div>
                  </button>
                ))
              }
            </div>
          </div>
          
          {/* 右側詳情 */}
          <div className="w-2/3 overflow-y-auto p-8 bg-white">
            {currentRecord ? (
              <div className="space-y-6">
                <section>
                  <h4 className="text-sm font-bold text-gray-900 border-l-4 border-indigo-500 pl-3 mb-4">評估結果</h4>
                  <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-100">
                    <span className="text-2xl font-bold text-indigo-700">Level {currentRecord.evaluation.level}</span>
                    <p className="text-sm text-indigo-600 mt-1">{EPA_LEVEL_OPTIONS.find(o => o.value === currentRecord.evaluation.level)?.label}</p>
                  </div>
                </section>
                <section>
                  <h4 className="text-sm font-bold text-gray-900 border-l-4 border-indigo-500 pl-3 mb-4">觀察細項</h4>
                  <div className="space-y-2">
                    {Object.entries(currentRecord.evaluation.checklist).map(([k, v], i) => (
                      <div key={i} className="flex gap-2 text-sm p-2 bg-gray-50 rounded">
                        {v === 'meet_expectation' || v === 'exceed_expectation' ? <CheckCircle2 className="w-4 h-4 text-green-500"/> : <AlertCircle className="w-4 h-4 text-orange-500"/>}
                        <span className="text-gray-700">{k}</span>
                      </div>
                    ))}
                  </div>
                </section>
                <section>
                  <h4 className="text-sm font-bold text-gray-900 border-l-4 border-indigo-500 pl-3 mb-4">教師回饋</h4>
                  <p className="text-sm text-gray-700 bg-gray-50 p-4 rounded border whitespace-pre-line">{currentRecord.evaluation.feedback_content || "無"}</p>
                </section>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-gray-400"><Search className="w-12 h-12 mb-3 opacity-20"/><p>請選擇一筆紀錄</p></div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EPAAssessment;

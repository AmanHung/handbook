import React, { useState, useEffect } from 'react';
import { 
  BookOpen, History, ChevronRight, Plus, 
  Calendar, User, CheckCircle2, AlertCircle, Search, Loader2, Send 
} from 'lucide-react';
import { EPA_CONFIG, EPA_LEVEL_OPTIONS, EPA_PERFORMANCE_OPTIONS } from '../data/EPA_Config';
import EPAFormModal from './EPAFormModal';

const EPAAssessment = ({ studentEmail, studentName, isTeacher, userProfile, apiUrl }) => {
  const [selectedEPA, setSelectedEPA] = useState(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showFormModal, setShowFormModal] = useState(false);
  
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // API: 讀取
  const fetchEPARecords = async () => {
    if (!studentEmail) return;
    setLoading(true);
    try {
      const response = await fetch(`${apiUrl}?action=get_epa_records&student_email=${studentEmail}`);
      const data = await response.json();
      if (Array.isArray(data)) {
        setAssessments(data);
      } else {
        setAssessments([]); 
      }
    } catch (error) {
      console.error("Failed to fetch EPA records:", error);
      setAssessments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEPARecords();
  }, [studentEmail]);

  // API: 教師儲存評估
  const handleSaveRecord = async (formData) => {
    setIsSubmitting(true);
    try {
      await fetch(apiUrl, {
        method: 'POST',
        body: JSON.stringify({
          action: 'save_epa_record',
          student_email: studentEmail,
          ...formData
        })
      });
      alert("評估已儲存，並已發送通知給學員！");
      setShowFormModal(false); 
      setShowHistoryModal(true); 
      fetchEPARecords(); 
    } catch (error) {
      alert("儲存失敗，請稍後再試");
    } finally {
      setIsSubmitting(false);
    }
  };

  // API: 學員儲存回饋
  const handleSaveFeedback = async (recordId, feedbackData) => {
    setIsSubmitting(true);
    try {
      // 呼叫 GAS: action=save_trainee_feedback
      const response = await fetch(apiUrl, {
        method: 'POST',
        body: JSON.stringify({
          action: 'save_trainee_feedback',
          record_id: recordId,
          reflection: feedbackData.reflection,
          satisfaction: feedbackData.satisfaction
        })
      });
      
      const result = await response.json();
      if (result.status === 'success') {
        alert("回饋已成功送出！");
        setShowHistoryModal(false); // 關閉視窗
        fetchEPARecords(); // 重新讀取資料，更新介面狀態
      } else {
        throw new Error(result.message || "儲存失敗");
      }
      
    } catch (error) {
      console.error(error);
      alert("儲存失敗，請檢查網路連線");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex justify-between items-center border-b pb-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-indigo-600" />
            EPA 可信任專業活動評估
          </h2>
          <p className="text-sm text-gray-500 mt-1">學員：<span className="font-medium text-gray-700">{studentName || '未選擇'}</span></p>
        </div>
        {loading && <span className="text-indigo-600 flex items-center gap-2 text-sm"><Loader2 className="w-4 h-4 animate-spin"/> 資料同步中...</span>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {EPA_CONFIG.map((epa) => {
          const epaRecords = Array.isArray(assessments) ? assessments.filter(r => r.epa_id === epa.id) : [];
          const lastRecord = epaRecords.length > 0 ? epaRecords[0] : null; 
          const count = epaRecords.length;
          
          // 檢查是否有待學員回饋的項目 (假設邏輯：有紀錄但 satisfaction_score 為空)
          // 這裡簡化判斷，只要有紀錄且最新一筆沒有滿意度，就顯示紅點
          const hasPendingFeedback = lastRecord && !lastRecord.evaluation.satisfaction_score && !isTeacher;

          return (
            <div 
              key={epa.id}
              onClick={() => { setSelectedEPA(epa); setShowHistoryModal(true); }}
              className="bg-white border rounded-xl p-5 hover:shadow-lg transition-all cursor-pointer group relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="flex justify-between items-start mb-3">
                <span className="px-2 py-1 bg-indigo-50 text-indigo-700 text-xs font-bold rounded">{epa.id}</span>
                {hasPendingFeedback && (
                  <span className="animate-pulse bg-red-100 text-red-600 text-xs font-bold px-2 py-1 rounded-full border border-red-200">
                    🔔 待回饋
                  </span>
                )}
              </div>
              <h3 className="font-bold text-gray-800 mb-2 group-hover:text-indigo-600">{epa.title.replace(`${epa.id}. `, '')}</h3>
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

      {showHistoryModal && selectedEPA && (
        <HistoryModal 
          epa={selectedEPA} 
          records={Array.isArray(assessments) ? assessments.filter(r => r.epa_id === selectedEPA.id) : []}
          onClose={() => setShowHistoryModal(false)}
          onOpenForm={() => { setShowHistoryModal(false); setShowFormModal(true); }}
          onSaveFeedback={handleSaveFeedback}
          isTeacher={isTeacher}
          studentName={studentName}
        />
      )}

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

// 子元件：歷史紀錄視窗 (含學員回饋表單)
const HistoryModal = ({ epa, records, onClose, onOpenForm, onSaveFeedback, isTeacher, studentName }) => {
  const [selectedRecordId, setSelectedRecordId] = useState(null);
  
  // 學員回饋 State
  const [reflection, setReflection] = useState('');
  const [satisfaction, setSatisfaction] = useState(0);

  useEffect(() => {
    if (records.length > 0) setSelectedRecordId(records[0].record_id);
  }, [records]);

  const currentRecord = records.find(r => r.record_id === selectedRecordId);

  // 取得評分代碼對應的中文標籤
  const getPerformanceLabel = (value) => {
    const opt = EPA_PERFORMANCE_OPTIONS.find(o => o.value === value);
    return opt ? opt.label : '未評分';
  };

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
                
                {/* 1. 評估結果 (Level) */}
                <section>
                  <h4 className="text-sm font-bold text-gray-900 border-l-4 border-indigo-500 pl-3 mb-4">評估結果</h4>
                  <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-100">
                    <span className="text-2xl font-bold text-indigo-700">Level {currentRecord.evaluation.level}</span>
                    <p className="text-sm text-indigo-600 mt-1">{EPA_LEVEL_OPTIONS.find(o => o.value === currentRecord.evaluation.level)?.label}</p>
                  </div>
                </section>

                {/* 2. 觀察細項 (加上文字說明) */}
                <section>
                  <h4 className="text-sm font-bold text-gray-900 border-l-4 border-indigo-500 pl-3 mb-4">觀察細項</h4>
                  <div className="space-y-2 border rounded-lg overflow-hidden">
                    {Object.entries(currentRecord.evaluation.checklist).map(([k, v], i) => (
                      <div key={i} className="flex items-center justify-between text-sm p-3 bg-white border-b last:border-0 hover:bg-gray-50">
                        <span className="text-gray-700 font-medium">{k}</span>
                        <div className="flex items-center gap-2">
                           {v === 'meet_expectation' || v === 'exceed_expectation' 
                             ? <CheckCircle2 className="w-4 h-4 text-green-500"/> 
                             : <AlertCircle className="w-4 h-4 text-orange-500"/>
                           }
                           <span className={`text-xs ${v.includes('meet') ? 'text-green-700' : 'text-gray-500'}`}>
                             {getPerformanceLabel(v)}
                           </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                {/* 3. 教師回饋 */}
                <section>
                  <h4 className="text-sm font-bold text-gray-900 border-l-4 border-indigo-500 pl-3 mb-4">教師回饋</h4>
                  <p className="text-sm text-gray-700 bg-gray-50 p-4 rounded border whitespace-pre-line">{currentRecord.evaluation.feedback_content || "無"}</p>
                </section>

                {/* 4. 學員雙向回饋區塊 */}
                <section className="pt-6 border-t mt-6">
                  <h4 className="text-sm font-bold text-gray-900 mb-4 flex items-center justify-between">
                    <span>學員回饋與滿意度</span>
                  </h4>

                  {/* 邏輯修正：
                     1. 如果已經有填寫滿意度 (satisfaction > 0) -> 不論是老師或學員，都顯示「結果」。
                     2. 如果還沒填寫 AND 是學員 -> 顯示「填寫表單」。
                     3. 如果還沒填寫 AND 是老師 -> 顯示「學員尚未填寫」提示。
                  */}
                  
                  {/* 情境 1: 已有資料 (顯示結果) */}
                  {(currentRecord.feedback_satisfaction > 0) ? (
                     <div className="bg-green-50 p-4 rounded-lg border border-green-100 space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-green-700 font-bold">教學滿意度：{currentRecord.feedback_satisfaction} / 9</span>
                        </div>
                        <div className="text-sm text-gray-700">
                           <span className="font-bold block mb-1">反思心得：</span>
                           {currentRecord.feedback_reflection || "（學員未填寫文字心得）"}
                        </div>
                     </div>
                  ) : (
                    /* 情境 2 & 3: 無資料 */
                    !isTeacher ? (
                      // 學員端：顯示填寫表單
                      <div className="bg-orange-50 p-5 rounded-xl border border-orange-100 space-y-4">
                         <h5 className="text-sm font-bold text-orange-800">✍️ 請填寫回饋以完成評估</h5>
                         
                         {/* 滿意度按鈕 */}
                         <div>
                           <label className="block text-xs font-bold text-gray-500 mb-2">本次教學滿意度 (1-9)</label>
                           <div className="flex gap-1 flex-wrap">
                             {[1,2,3,4,5,6,7,8,9].map(n => (
                               <button 
                                 key={n} 
                                 onClick={() => setSatisfaction(n)}
                                 className={`w-8 h-8 rounded-full text-sm font-bold border ${satisfaction === n ? 'bg-orange-500 text-white border-orange-600' : 'bg-white text-gray-500 border-gray-300'}`}
                               >
                                 {n}
                               </button>
                             ))}
                           </div>
                         </div>

                         {/* 反思輸入框 */}
                         <div>
                           <label className="block text-xs font-bold text-gray-500 mb-2">反思與回饋</label>
                           <textarea 
                             className="w-full h-20 p-3 text-sm border rounded-lg focus:ring-2 focus:ring-orange-300 outline-none"
                             placeholder="針對老師的建議，您的想法是..."
                             value={reflection}
                             onChange={(e) => setReflection(e.target.value)}
                           />
                         </div>

                         <button 
                           onClick={() => onSaveFeedback(currentRecord.record_id, { satisfaction, reflection })}
                           disabled={satisfaction === 0}
                           className="w-full py-2 bg-orange-600 text-white rounded-lg font-bold text-sm hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                         >
                           {satisfaction === 0 ? "請先選擇滿意度分數" : "送出回饋"}
                         </button>
                      </div>
                    ) : (
                      // 老師端：顯示提示
                      <div className="text-center py-6 bg-gray-50 rounded-lg border border-dashed border-gray-300 text-gray-400 text-sm italic">
                        學員尚未填寫回饋
                      </div>
                    )
                  )}
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

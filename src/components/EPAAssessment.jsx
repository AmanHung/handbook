import React, { useState, useEffect } from 'react';
import { 
  BookOpen, History, ChevronRight, Plus, 
  User, CheckCircle2, AlertCircle, Search, Loader2, Send, HelpCircle, Clock, Calendar 
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

  // API: 讀取 EPA 紀錄
  const fetchEPARecords = async () => {
    if (!studentEmail) return;
    setLoading(true);
    try {
      const response = await fetch(`${apiUrl}?action=get_epa_records&student_email=${studentEmail}`);
      const data = await response.json();
      
      if (Array.isArray(data)) {
        setAssessments(data);
      } else if (data && data.records) {
         setAssessments(data.records);
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
      const payload = {
        action: 'save_epa_record',
        student_email: studentEmail,
        
        epa_id: formData.epa_id,
        teacher_name: formData.teacher_name,
        date: formData.date,
        observation_time: formData.observation_time, 
        level: formData.level,
        
        evaluation: formData.checklist,       
        feedback: formData.feedback_content   
      };

      await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' }, 
        body: JSON.stringify(payload)
      });

      alert("評估已儲存，並已發送通知給學員！");
      setShowFormModal(false); 
      
      await fetchEPARecords(); 
      setShowHistoryModal(true); 

    } catch (error) {
      console.error(error);
      alert("儲存失敗，請稍後再試");
    } finally {
      setIsSubmitting(false);
    }
  };

  // API: 學員儲存回饋
  const handleSaveFeedback = async (recordId, feedbackData) => {
    setIsSubmitting(true);
    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
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
        fetchEPARecords(); 
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
          
          const hasPendingFeedback = lastRecord && !lastRecord.feedback_satisfaction && !isTeacher;

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
              <h3 className="font-bold text-gray-800 mb-2 group-hover:text-indigo-600">
                {String(epa.title).replace(`${epa.id}. `, '').replace(`${epa.id} `, '')}
              </h3>
              
              <div className="pt-3 border-t flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-xs text-gray-400">目前信賴等級</span>
                  {lastRecord ? (
                     <span className="text-sm font-bold text-green-600">
                        {/* ★ 修正防護：用 String() 強制轉型後比對，避免數字 4 與字串 "4" 比對失敗 */}
                        {EPA_LEVEL_OPTIONS.find(o => String(o.value) === String(lastRecord.level))?.label.split(':')[0] || lastRecord.level}
                     </span>
                  ) : (
                     <span className="text-sm font-bold text-gray-300">尚未評估</span>
                  )}
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
          isSubmitting={isSubmitting}
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

const HistoryModal = ({ epa, records, onClose, onOpenForm, onSaveFeedback, isTeacher, studentName, isSubmitting }) => {
  const [selectedRecordId, setSelectedRecordId] = useState(null);
  
  const [reflection, setReflection] = useState('');
  const [satisfaction, setSatisfaction] = useState(0);

  useEffect(() => {
    if (records.length > 0) {
        setSelectedRecordId(records[0].record_id);
    } else {
        setSelectedRecordId(null);
    }
  }, [records]);

  useEffect(() => {
      const record = records.find(r => r.record_id === selectedRecordId);
      if (record) {
          setReflection(record.feedback_reflection || '');
          setSatisfaction(record.feedback_satisfaction || 0);
      } else {
          setReflection('');
          setSatisfaction(0);
      }
  }, [selectedRecordId, records]);

  const currentRecord = records.find(r => r.record_id === selectedRecordId);

  const getPerformanceLabel = (value) => {
    if (!value) return { text: '未評分', color: 'text-gray-400', icon: HelpCircle };
    const opt = EPA_PERFORMANCE_OPTIONS.find(o => o.value === value);
    
    if (value === 'meet_expectation' || value === 'exceed_expectation') {
      return { text: opt?.label || value, color: 'text-green-600', icon: CheckCircle2 };
    }
    if (value === 'below_expectation') {
      return { text: opt?.label || value, color: 'text-red-600', icon: AlertCircle };
    }
    return { text: opt?.label || value, color: 'text-gray-500', icon: CheckCircle2 };
  };

  const getLevelLabel = (levelValue) => {
    if (!levelValue) return '未評分';
    // ★ 修正防護：用 String() 強制轉型後比對
    const opt = EPA_LEVEL_OPTIONS.find(o => String(o.value) === String(levelValue));
    return opt ? opt.label : levelValue;
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-5xl h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        
        <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50 flex-shrink-0">
          <div>
            <h3 className="text-lg font-bold text-gray-800">{epa.title}</h3>
            <p className="text-sm text-gray-500">學員：{studentName}</p>
          </div>
          <div className="flex items-center gap-3">
            {isTeacher && (
              <button 
                onClick={onOpenForm} 
                className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm font-medium text-sm"
              >
                <Plus className="w-4 h-4" /> 新增評估
              </button>
            )}
            <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full text-gray-500">✕</button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <div className="w-1/3 border-r bg-gray-50 overflow-y-auto p-4">
            <h4 className="text-xs font-bold text-gray-400 uppercase mb-3">歷史紀錄 ({records.length})</h4>
            <div className="space-y-3">
              {records.length === 0 ? <div className="text-center py-10 text-gray-400 text-sm">尚無紀錄</div> : 
                records.map((record) => (
                  <button
                    key={record.record_id}
                    onClick={() => setSelectedRecordId(record.record_id)}
                    className={`w-full text-left p-3 rounded-lg border transition-all ${
                        selectedRecordId === record.record_id 
                        ? 'bg-white border-indigo-500 ring-1 ring-indigo-500 shadow-sm' 
                        : 'bg-white border-gray-200 hover:border-indigo-300'
                    }`}
                  >
                    <div className="flex justify-between font-bold text-gray-800 text-sm">
                      {record.date}
                      <span className="text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded text-xs">
                         {/* ★ 修正防護：用 String() 強制轉型，避免 replace 報錯 */}
                         Level {String(record.level || '').replace('Level ', '') || '?'}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1 flex items-center flex-wrap gap-2">
                        <span className="flex items-center gap-1"><User className="w-3 h-3"/> {record.teacher_name}</span>
                        {record.observation_time && (
                          <span className="flex items-center gap-1 text-indigo-500 bg-indigo-50 px-1.5 rounded">
                            <Clock className="w-3 h-3"/> {record.observation_time}
                          </span>
                        )}
                    </div>
                  </button>
                ))
              }
            </div>
          </div>
          
          <div className="w-2/3 overflow-y-auto p-8 bg-white">
            {currentRecord ? (
              <div className="space-y-8">
                
                <div className="flex flex-wrap gap-4 p-4 bg-gray-50 border border-gray-100 rounded-lg text-sm text-gray-700 font-medium">
                  <span className="flex items-center gap-2"><Calendar className="w-4 h-4 text-gray-400"/> 評估日期：{currentRecord.date}</span>
                  {currentRecord.observation_time && (
                    <span className="flex items-center gap-2 text-indigo-700 bg-indigo-50 px-3 py-0.5 rounded-full border border-indigo-100">
                      <Clock className="w-4 h-4 text-indigo-500"/> 觀測時間：{currentRecord.observation_time}
                    </span>
                  )}
                </div>

                <section>
                  <h4 className="text-sm font-bold text-gray-900 border-l-4 border-indigo-500 pl-3 mb-4">評估結果 (Entrustment Level)</h4>
                  <div className="p-5 bg-indigo-50 rounded-lg border border-indigo-100 flex items-center gap-4">
                    <div className="bg-white p-3 rounded-full shadow-sm">
                        <span className="text-2xl font-bold text-indigo-700">{currentRecord.level || '-'}</span>
                    </div>
                    <div>
                        <p className="font-bold text-indigo-800 text-lg">{getLevelLabel(currentRecord.level)}</p>
                    </div>
                  </div>
                </section>

                <section>
                  <h4 className="text-sm font-bold text-gray-900 border-l-4 border-indigo-500 pl-3 mb-4">觀察細項評量</h4>
                  <div className="space-y-0 border rounded-lg overflow-hidden">
                    {epa.check_items && epa.check_items.map((itemText, idx) => {
                      const value = currentRecord.evaluation ? currentRecord.evaluation[itemText] : null;
                      const { text, color, icon: Icon } = getPerformanceLabel(value);

                      return (
                        <div key={idx} className="flex items-center justify-between text-sm p-3 bg-white border-b last:border-0 hover:bg-gray-50">
                          <span className="text-gray-700 font-medium flex-1 mr-4">{itemText}</span>
                          <div className={`flex items-center gap-1.5 shrink-0 ${color} font-bold bg-gray-50 px-2 py-1 rounded`}>
                             <Icon className="w-4 h-4"/>
                             <span className="text-xs">{text}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>

                <section>
                  <h4 className="text-sm font-bold text-gray-900 border-l-4 border-indigo-500 pl-3 mb-4">教師綜合回饋</h4>
                  <p className="text-sm text-gray-700 bg-gray-50 p-4 rounded border whitespace-pre-line leading-relaxed">
                      {currentRecord.feedback_content || "（無文字回饋）"}
                  </p>
                </section>

                <section className="pt-6 border-t mt-6">
                  <h4 className="text-sm font-bold text-gray-900 mb-4 flex items-center justify-between">
                    <span>學員回饋與滿意度</span>
                  </h4>
                  
                  {(currentRecord.feedback_satisfaction && currentRecord.feedback_satisfaction > 0) ? (
                     <div className="bg-green-50 p-4 rounded-lg border border-green-100 space-y-3">
                        <div className="flex items-center gap-2">
                          <span className="text-green-800 font-bold bg-green-200 px-3 py-1 rounded-full text-xs">
                              教學滿意度：{currentRecord.feedback_satisfaction} / 9
                          </span>
                        </div>
                        <div className="text-sm text-gray-800 bg-white p-3 rounded border border-green-200">
                           <span className="font-bold block mb-1 text-green-700">反思心得：</span>
                           {currentRecord.feedback_reflection || "（學員未填寫文字心得）"}
                        </div>
                     </div>
                  ) : (
                    !isTeacher ? (
                      <div className="bg-orange-50 p-5 rounded-xl border border-orange-100 space-y-4">
                         <h5 className="text-sm font-bold text-orange-800 flex items-center gap-2">
                             <Send className="w-4 h-4"/> 請填寫回饋以完成評估
                         </h5>
                         
                         <div>
                           <label className="block text-xs font-bold text-gray-500 mb-2">本次教學滿意度 (1-9)</label>
                           <div className="flex gap-1 flex-wrap">
                             {[1,2,3,4,5,6,7,8,9].map(n => (
                               <button 
                                 key={n} 
                                 onClick={() => setSatisfaction(n)}
                                 className={`w-8 h-8 rounded-full text-sm font-bold border transition-all ${
                                     satisfaction === n 
                                     ? 'bg-orange-500 text-white border-orange-600 scale-110 shadow-sm' 
                                     : 'bg-white text-gray-500 border-gray-300 hover:border-orange-300'
                                 }`}
                               >
                                 {n}
                               </button>
                             ))}
                           </div>
                         </div>

                         <div>
                           <label className="block text-xs font-bold text-gray-500 mb-2">反思與回饋</label>
                           <textarea 
                             className="w-full h-24 p-3 text-sm border rounded-lg focus:ring-2 focus:ring-orange-300 outline-none resize-none"
                             placeholder="針對老師的建議，您的想法是..."
                             value={reflection}
                             onChange={(e) => setReflection(e.target.value)}
                           />
                         </div>

                         <button 
                           onClick={() => onSaveFeedback(currentRecord.record_id, { satisfaction, reflection })}
                           disabled={satisfaction === 0 || isSubmitting}
                           className="w-full py-2.5 bg-orange-600 text-white rounded-lg font-bold text-sm hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                         >
                           {isSubmitting ? "傳送中..." : (satisfaction === 0 ? "請先選擇滿意度分數" : "送出回饋")}
                         </button>
                      </div>
                    ) : (
                      <div className="text-center py-8 bg-gray-50 rounded-lg border border-dashed border-gray-300 text-gray-400 text-sm flex flex-col items-center gap-2">
                        <AlertCircle className="w-8 h-8 opacity-50"/>
                        學員尚未填寫回饋
                      </div>
                    )
                  )}
                </section>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-gray-400">
                  <Search className="w-16 h-16 mb-4 opacity-10"/>
                  <p>請從左側選擇一筆紀錄查看詳情</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EPAAssessment;

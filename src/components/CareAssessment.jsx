import React, { useState, useEffect } from 'react';
import { 
  HeartHandshake, History, Plus, 
  User, CheckCircle2, AlertCircle, Search, Loader2, Calendar, FileText
} from 'lucide-react';

const PROGRESS_OPTIONS = ['優於同儕', '符合', '較落後'];
const ATTITUDE_OPTIONS = ['優', '普通', '待改進'];

const CareAssessment = ({ studentEmail, studentName, isTeacher, userProfile, apiUrl }) => {
  const [showFormModal, setShowFormModal] = useState(false);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedRecordId, setSelectedRecordId] = useState(null);

  // 讀取關懷紀錄
  const fetchCareRecords = async () => {
    if (!studentEmail) return;
    setLoading(true);
    try {
      const response = await fetch(`${apiUrl}?action=get_care_records&student_email=${studentEmail}`);
      const data = await response.json();
      
      if (Array.isArray(data)) {
        setRecords(data);
      } else if (data && data.records) {
        setRecords(data.records);
      } else {
        setRecords([]);
      }
    } catch (error) {
      console.error("讀取關懷紀錄失敗:", error);
      setRecords([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCareRecords();
  }, [studentEmail]);

  useEffect(() => {
    if (records.length > 0) {
      setSelectedRecordId(records[0].record_id);
    } else {
      setSelectedRecordId(null);
    }
  }, [records]);

  const currentRecord = records.find(r => r.record_id === selectedRecordId);

  // 儲存關懷紀錄
  const handleSaveRecord = async (formData) => {
    setIsSubmitting(true);
    try {
      const payload = {
        action: 'save_care_record',
        student_email: studentEmail,
        student_name: studentName,
        teacher_name: userProfile?.displayName || '指導藥師',
        date: formData.date,
        progress: formData.progress,
        attitude: formData.attitude,
        feedback: formData.feedback
      };

      await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' }, 
        body: JSON.stringify(payload)
      });

      alert("關懷輔導紀錄已成功儲存！");
      setShowFormModal(false); 
      await fetchCareRecords(); 

    } catch (error) {
      console.error(error);
      alert("儲存失敗，請稍後再試");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white border rounded-xl shadow-sm overflow-hidden animate-in fade-in duration-300 h-[600px] flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b flex justify-between items-center bg-pink-50 flex-shrink-0">
        <div>
          <h2 className="text-lg font-bold text-pink-800 flex items-center gap-2">
            <HeartHandshake className="w-5 h-5" />
            學員關懷輔導紀錄
          </h2>
          <p className="text-sm text-pink-600 mt-1">請指導教師每月第四週進行學員關懷輔導紀錄</p>
        </div>
        <div className="flex items-center gap-3">
          {loading && <Loader2 className="w-5 h-5 text-pink-500 animate-spin" />}
          {isTeacher && (
            <button 
              onClick={() => setShowFormModal(true)} 
              className="flex items-center gap-2 bg-pink-600 text-white px-4 py-2 rounded-lg hover:bg-pink-700 transition-colors shadow-sm font-medium text-sm"
            >
              <Plus className="w-4 h-4" /> 新增關懷紀錄
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* 左側：歷史紀錄清單 */}
        <div className="w-1/3 border-r bg-gray-50 overflow-y-auto p-4">
          <h4 className="text-xs font-bold text-gray-400 uppercase mb-3">歷史紀錄 ({records.length})</h4>
          <div className="space-y-3">
            {records.length === 0 ? <div className="text-center py-10 text-gray-400 text-sm">尚無關懷紀錄</div> : 
              records.map((record) => (
                <button
                  key={record.record_id}
                  onClick={() => setSelectedRecordId(record.record_id)}
                  className={`w-full text-left p-3 rounded-lg border transition-all ${
                      selectedRecordId === record.record_id 
                      ? 'bg-white border-pink-500 ring-1 ring-pink-500 shadow-sm' 
                      : 'bg-white border-gray-200 hover:border-pink-300'
                  }`}
                >
                  <div className="flex justify-between font-bold text-gray-800 text-sm">
                    {record.date}
                  </div>
                  <div className="text-xs text-gray-500 mt-2 flex items-center flex-wrap gap-2">
                      <span className="flex items-center gap-1"><User className="w-3 h-3"/> {record.teacher_name}</span>
                  </div>
                </button>
              ))
            }
          </div>
        </div>
        
        {/* 右側：紀錄詳情 */}
        <div className="w-2/3 overflow-y-auto p-8 bg-white">
          {currentRecord ? (
            <div className="space-y-8">
              <div className="flex flex-wrap gap-4 p-4 bg-gray-50 border border-gray-100 rounded-lg text-sm text-gray-700 font-medium">
                <span className="flex items-center gap-2"><Calendar className="w-4 h-4 text-gray-400"/> 輔導日期：{currentRecord.date}</span>
                <span className="flex items-center gap-2"><User className="w-4 h-4 text-gray-400"/> 指導教師：{currentRecord.teacher_name}</span>
              </div>

              <section>
                <h4 className="text-sm font-bold text-gray-900 border-l-4 border-pink-500 pl-3 mb-4">綜合評估</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-pink-50 rounded-lg border border-pink-100">
                    <p className="text-xs text-pink-600 font-bold mb-1">學習進度</p>
                    <p className="text-lg font-bold text-gray-800">{currentRecord.progress}</p>
                  </div>
                  <div className="p-4 bg-pink-50 rounded-lg border border-pink-100">
                    <p className="text-xs text-pink-600 font-bold mb-1">學習態度</p>
                    <p className="text-lg font-bold text-gray-800">{currentRecord.attitude}</p>
                  </div>
                </div>
              </section>

              <section>
                <h4 className="text-sm font-bold text-gray-900 border-l-4 border-pink-500 pl-3 mb-4">學員意見反應與回饋</h4>
                <p className="text-sm text-gray-700 bg-gray-50 p-4 rounded border whitespace-pre-line leading-relaxed min-h-[100px]">
                    {currentRecord.feedback || "（無文字回饋）"}
                </p>
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

      {/* 新增紀錄表單 Modal */}
      {showFormModal && (
        <CareFormModal 
          onClose={() => setShowFormModal(false)}
          onSubmit={handleSaveRecord}
          isSubmitting={isSubmitting}
        />
      )}
    </div>
  );
};

// 新增關懷紀錄的表單子元件
const CareFormModal = ({ onClose, onSubmit, isSubmitting }) => {
  const [evalDate, setEvalDate] = useState(new Date().toISOString().split('T')[0]);
  const [progress, setProgress] = useState('');
  const [attitude, setAttitude] = useState('');
  const [feedback, setFeedback] = useState('');

  const handleSubmit = () => {
    if (!progress) return alert('請選擇「學習進度」');
    if (!attitude) return alert('請選擇「學習態度」');
    
    onSubmit({
      date: evalDate,
      progress,
      attitude,
      feedback
    });
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b bg-gray-50 flex justify-between items-center flex-shrink-0">
          <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <span className="bg-pink-600 text-white text-xs px-2 py-1 rounded">新增</span>
            學員關懷輔導紀錄
          </h3>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-pink-600" /> 輔導日期
            </label>
            <input 
              type="date" 
              value={evalDate}
              onChange={(e) => setEvalDate(e.target.value)}
              className="w-full md:w-1/2 p-2.5 border rounded-lg focus:ring-2 focus:ring-pink-500 outline-none font-medium text-gray-700"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">學習進度</label>
              <div className="space-y-2">
                {PROGRESS_OPTIONS.map(opt => (
                  <label key={opt} className={`flex items-center p-3 rounded-lg border cursor-pointer transition-all ${progress === opt ? 'border-pink-500 bg-pink-50' : 'hover:bg-gray-50'}`}>
                    <input type="radio" name="progress" value={opt} checked={progress === opt} onChange={() => setProgress(opt)} className="w-4 h-4 text-pink-600" />
                    <span className="ml-2 text-sm font-bold text-gray-700">{opt}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">學習態度</label>
              <div className="space-y-2">
                {ATTITUDE_OPTIONS.map(opt => (
                  <label key={opt} className={`flex items-center p-3 rounded-lg border cursor-pointer transition-all ${attitude === opt ? 'border-pink-500 bg-pink-50' : 'hover:bg-gray-50'}`}>
                    <input type="radio" name="attitude" value={opt} checked={attitude === opt} onChange={() => setAttitude(opt)} className="w-4 h-4 text-pink-600" />
                    <span className="ml-2 text-sm font-bold text-gray-700">{opt}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div>
             <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
               <FileText className="w-4 h-4 text-pink-600" /> 學員意見反應與回饋
             </label>
             <textarea 
               className="w-full h-32 p-3 border rounded-lg focus:ring-2 focus:ring-pink-500 outline-none resize-none text-sm leading-relaxed"
               placeholder="請填寫面談或輔導內容..."
               value={feedback}
               onChange={(e) => setFeedback(e.target.value)}
             />
          </div>
        </div>

        <div className="p-4 border-t bg-gray-50 flex justify-end gap-3 flex-shrink-0">
          <button onClick={onClose} className="px-5 py-2 rounded-lg border bg-white text-gray-600 font-bold hover:bg-gray-100 transition-colors">取消</button>
          <button 
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-6 py-2 rounded-lg bg-pink-600 text-white font-bold hover:bg-pink-700 shadow-sm disabled:opacity-50 flex items-center gap-2"
          >
            {isSubmitting ? '儲存中...' : '確認儲存'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default CareAssessment;

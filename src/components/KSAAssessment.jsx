import React, { useState, useEffect } from 'react';
import { 
  ClipboardCheck, Save, Loader2, AlertCircle, 
  CheckCircle2, User, ChevronRight, Calendar // 新增 Calendar icon
} from 'lucide-react';
import { 
  KSA_PHASES, KSA_DOMAINS, getScoreStyle, SCORING_RANGES 
} from '../data/KSA_Config';

const KSAAssessment = ({ studentEmail, studentName, isTeacher, userProfile, apiUrl }) => {
  const [activePhase, setActivePhase] = useState(1);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // 表單狀態
  const [formData, setFormData] = useState({});
  const [comment, setComment] = useState('');
  
  // [新] 評估日期狀態 (預設今天)
  const [evalDate, setEvalDate] = useState(new Date().toISOString().split('T')[0]);

  // 1. 讀取資料
  const fetchRecords = async () => {
    if (!studentEmail) return;
    setLoading(true);
    try {
      const res = await fetch(`${apiUrl}?type=getKSA&studentEmail=${studentEmail}`);
      const data = await res.json();
      setRecords(data.records || []);
    } catch (e) {
      console.error("Fetch error:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, [studentEmail]);

  // 當切換階段時，載入該階段的資料到表單 (若有)
  useEffect(() => {
    const currentRecord = records.find(r => r.phaseId == activePhase);
    if (currentRecord) {
      setFormData(currentRecord.scores || {});
      setComment(currentRecord.comment || '');
      // [新] 載入儲存的日期，若無則顯示今天
      if (currentRecord.timestamp) {
        setEvalDate(currentRecord.timestamp.split('T')[0]);
      }
    } else {
      // 若無紀錄，重置表單
      setFormData({});
      setComment('');
      setEvalDate(new Date().toISOString().split('T')[0]);
    }
  }, [activePhase, records]);

  // 2. 儲存資料
  const handleSave = async () => {
    if (!isTeacher) return;
    
    let allFilled = true;
    KSA_DOMAINS.forEach(domain => {
      domain.items.forEach(item => {
        if (!formData[item.id]) allFilled = false;
      });
    });

    if (!allFilled) {
      alert("請完成所有項目的評分 (1-9分) 後再儲存");
      return;
    }

    setSaving(true);
    const payload = {
      type: 'saveKSA',
      studentEmail,
      studentName,
      phaseId: activePhase,
      scores: formData,
      comment: comment,
      evalDate: evalDate, // [新] 傳送選擇的日期
      teacherSign: userProfile?.displayName || 'Unknown Teacher',
      updatedBy: userProfile?.email
    };

    try {
      await fetch(apiUrl, {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      alert('KSA 評估已儲存！');
      fetchRecords();
    } catch (e) {
      alert('儲存失敗');
    } finally {
      setSaving(false);
    }
  };

  const handleScoreChange = (itemId, score) => {
    setFormData(prev => ({ ...prev, [itemId]: score }));
  };

  const currentRecord = records.find(r => r.phaseId == activePhase);
  const isReadOnly = !isTeacher || (currentRecord && !isTeacher); 

  return (
    <div className="animate-in fade-in space-y-6">
      {/* 標題 */}
      <div className="flex justify-between items-center border-b pb-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <ClipboardCheck className="w-6 h-6 text-purple-600" />
            KSA 學員考核表
          </h2>
          <p className="text-sm text-gray-500 mt-1">學員：{studentName}</p>
        </div>
        {loading && <Loader2 className="w-5 h-5 animate-spin text-purple-600"/>}
      </div>

      {/* 階段分頁 Tab */}
      <div className="flex overflow-x-auto gap-2 pb-2">
        {KSA_PHASES.map(phase => {
          const hasRecord = records.some(r => r.phaseId == phase.id);
          return (
            <button
              key={phase.id}
              onClick={() => setActivePhase(phase.id)}
              className={`px-4 py-2 rounded-lg font-bold text-sm whitespace-nowrap transition-all border ${
                activePhase === phase.id 
                  ? 'bg-purple-600 text-white border-purple-600 shadow-md' 
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-2">
                {phase.label}
                {hasRecord && <CheckCircle2 className={`w-3 h-3 ${activePhase === phase.id ? 'text-white' : 'text-green-500'}`}/>}
              </div>
            </button>
          )
        })}
      </div>

      {/* 內容區塊 */}
      <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
        
        {/* [新] 狀態列 & 日期選擇 */}
        <div className="p-4 bg-gray-50 border-b flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="font-bold text-gray-700 flex items-center gap-2">
            {KSA_PHASES.find(p => p.id === activePhase)?.label} 評估表
          </div>
          
          <div className="flex items-center gap-4 w-full sm:w-auto">
            {/* 日期選擇器 */}
            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-gray-200 shadow-sm w-full sm:w-auto">
              <Calendar className="w-4 h-4 text-purple-600" />
              <input 
                type="date" 
                value={evalDate}
                onChange={(e) => setEvalDate(e.target.value)}
                disabled={isReadOnly} // 學生或非編輯模式時鎖定
                className="text-sm font-medium text-gray-700 outline-none bg-transparent w-full sm:w-auto disabled:text-gray-400 disabled:cursor-not-allowed"
              />
            </div>

            {currentRecord && (
              <div className="text-xs text-gray-500 flex items-center gap-1 whitespace-nowrap">
                <User className="w-3 h-3"/> {currentRecord.teacherSign}
              </div>
            )}
          </div>
        </div>

        <div className="p-6 space-y-8">
          {KSA_DOMAINS.map(domain => (
            <section key={domain.id}>
              <h3 className="text-lg font-bold text-gray-800 mb-4 border-l-4 border-purple-500 pl-3">
                {domain.title}
              </h3>
              <div className="grid gap-4">
                {domain.items.map(item => {
                  const score = formData[item.id];
                  return (
                    <div key={item.id} className="bg-gray-50 p-4 rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="font-bold text-gray-700 w-32">{item.label}</div>
                      
                      <div className="flex-1 flex flex-wrap gap-1">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => {
                          const isSelected = score == num;
                          let colorClass = 'border-gray-300 hover:border-gray-400';
                          if (num <= 3) colorClass = isSelected ? 'bg-red-500 text-white border-red-600' : 'hover:bg-red-50';
                          else if (num <= 6) colorClass = isSelected ? 'bg-blue-500 text-white border-blue-600' : 'hover:bg-blue-50';
                          else colorClass = isSelected ? 'bg-green-500 text-white border-green-600' : 'hover:bg-green-50';

                          return (
                            <button
                              key={num}
                              onClick={() => !isReadOnly && handleScoreChange(item.id, num)}
                              disabled={isReadOnly && !isSelected}
                              className={`w-8 h-8 md:w-10 md:h-10 rounded text-sm font-bold border transition-all ${colorClass} ${
                                isReadOnly && !isSelected ? 'opacity-20 cursor-not-allowed' : ''
                              }`}
                            >
                              {num}
                            </button>
                          );
                        })}
                      </div>

                      <div className="w-32 text-right">
                         {score ? (
                           <span className={`px-2 py-1 rounded text-xs font-bold ${getScoreStyle(score)}`}>
                             {score <= 3 ? '有待加強' : score <= 6 ? '達到預期' : '表現優秀'}
                           </span>
                         ) : <span className="text-gray-400 text-xs">未評分</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}

          <section>
            <h3 className="text-lg font-bold text-gray-800 mb-2">教師總評</h3>
            {isTeacher ? (
              <textarea
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                rows="3"
                placeholder="請輸入評語..."
                value={comment}
                onChange={e => setComment(e.target.value)}
              />
            ) : (
              <div className="p-4 bg-gray-50 rounded-lg text-gray-700 min-h-[60px]">
                {comment || "無評語"}
              </div>
            )}
          </section>
        </div>

        {isTeacher && (
          <div className="p-4 bg-gray-50 border-t flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2 bg-purple-600 text-white rounded-lg font-bold hover:bg-purple-700 flex items-center gap-2 disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4"/>}
              儲存評估
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default KSAAssessment;

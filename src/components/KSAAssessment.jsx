import React, { useState, useEffect, useCallback } from 'react';
import { ClipboardCheck, Save, Loader2, CheckCircle2, User, Calendar } from 'lucide-react';
import {
  KSA_PHASES, KSA_DOMAINS, KSA_SCORE_OPTIONS, KSA_MILESTONE_VERSION,
  LEGACY_KSA_DOMAINS, isMilestoneRecord, toMilestonePhaseId
} from '../data/KSA_Config';

const KSAAssessment = ({ studentEmail, studentName, isTeacher, userProfile, apiUrl }) => {
  const [activePhase, setActivePhase] = useState(1);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  // 表單狀態
  const [formData, setFormData] = useState({});
  const [comment, setComment] = useState('');
  
  const [evalDate, setEvalDate] = useState(new Date().toISOString().split('T')[0]);
  const currentRecord = records.find(record => isMilestoneRecord(record) && Number(record.phaseId) === toMilestonePhaseId(activePhase));
  const legacyRecord = records.find(record => !isMilestoneRecord(record) && Number(record.phaseId) === activePhase);
  const isReadOnly = !isTeacher;

  // 1. 讀取資料
  const fetchRecords = useCallback(async () => {
    if (!studentEmail) return;
    setLoading(true);
    try {
      const res = await fetch(`${apiUrl}?type=getKSA&studentEmail=${encodeURIComponent(studentEmail)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setRecords(data.records || []);
      return data.records || [];
    } catch (e) {
      console.error("Fetch error:", e);
      return [];
    } finally {
      setLoading(false);
    }
  }, [apiUrl, studentEmail]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  // 當切換階段時，載入該階段的資料到表單 (若有)
  useEffect(() => {
    if (currentRecord) {
      setFormData(currentRecord.scores || {});
      setComment(currentRecord.comment || '');
      if (currentRecord.timestamp) {
        setEvalDate(currentRecord.timestamp.split('T')[0]);
      }
    } else {
      // 若無紀錄，重置表單
      setFormData({});
      setComment('');
      setEvalDate(new Date().toISOString().split('T')[0]);
    }
    setSaveError('');
  }, [activePhase, currentRecord]);

  // 2. 儲存資料
  const handleSave = async () => {
    if (!isTeacher) return;
    
    const allFilled = KSA_DOMAINS.every(domain => domain.items.every(item =>
      Object.hasOwn(formData, item.id) && KSA_SCORE_OPTIONS.includes(Number(formData[item.id]))
    ));

    if (!allFilled) {
      alert('請完成 15 個里程碑項目的評分（0–5 分，可使用半分）後再儲存。');
      return;
    }

    setSaving(true);
    setSaveError('');
    const payload = {
      type: 'saveKSA',
      studentEmail,
      studentName,
      phaseId: toMilestonePhaseId(activePhase),
      assessmentVersion: KSA_MILESTONE_VERSION,
      scores: Object.fromEntries(KSA_DOMAINS.flatMap(domain => domain.items.map(item => [item.id, Number(formData[item.id])]))),
      comment: comment,
      evalDate,
      teacherSign: userProfile?.displayName || 'Unknown Teacher',
      updatedBy: userProfile?.email
    };

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const result = await response.json();
      if (result?.status === 'error' || result?.success === false) throw new Error(result?.message || '伺服器拒絕儲存');
      const matchesSavedRecord = record => isMilestoneRecord(record)
        && Number(record.phaseId) === toMilestonePhaseId(activePhase)
        && Object.entries(payload.scores).every(([id, value]) =>
          Object.hasOwn(record.scores || {}, id) && record.scores[id] !== null && Number(record.scores[id]) === value
        );
      let updatedRecords = await fetchRecords();
      if (!updatedRecords.some(matchesSavedRecord)) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        updatedRecords = await fetchRecords();
      }
      if (!updatedRecords.some(matchesSavedRecord)) {
        throw new Error('未能在後端讀回新制里程碑紀錄');
      }
      alert('里程碑評估已儲存。');
    } catch (e) {
      console.error('Milestone KSA save failed:', e);
      setSaveError('無法確認里程碑紀錄已寫入。請先重新整理檢查，避免重複提交。');
    } finally {
      setSaving(false);
    }
  };

  const handleScoreChange = (itemId, score) => {
    setFormData(prev => ({ ...prev, [itemId]: score }));
  };

  return (
    <div className="animate-in fade-in space-y-6">
      {/* 標題 */}
      <div className="flex justify-between items-center border-b pb-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <ClipboardCheck className="w-6 h-6 text-purple-600" />
            藥師核心能力里程碑評估
          </h2>
          <p className="text-sm text-gray-500 mt-1">學員：{studentName}</p>
        </div>
        {loading && <Loader2 className="w-5 h-5 animate-spin text-purple-600"/>}
      </div>

      {/* 階段分頁 Tab */}
      <div className="flex overflow-x-auto gap-2 pb-2">
        {KSA_PHASES.map(phase => {
          const hasRecord = records.some(record => isMilestoneRecord(record) && Number(record.phaseId) === toMilestonePhaseId(phase.id));
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
                  disabled={isReadOnly}
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

        <div className="border-b border-blue-100 bg-blue-50 px-4 py-3 text-xs font-medium text-blue-800">
          共 6 大核心能力、15 個次核心能力；採 0–5 分、每 0.5 分一級。Excel 的數值僅為範例，不會自動帶入學員評分，也不設自動達標門檻。
        </div>
        {legacyRecord && <div className="border-b border-amber-100 bg-amber-50 px-4 py-3 text-xs font-medium text-amber-800">本階段另有舊版 KSA 紀錄（1–9 分）。下方新里程碑表單不會套用舊分數；舊紀錄保留於頁面底部供查閱。</div>}
        <div className="p-4 space-y-8 sm:p-6">
          {KSA_DOMAINS.map(domain => (
            <section key={domain.id}>
              <h3 className="mb-4 border-l-4 pl-3 text-lg font-bold text-gray-800" style={{ borderColor: domain.color }}>
                {domain.code}・{domain.title}
              </h3>
              <div className="grid gap-4">
                {domain.items.map(item => {
                  const score = formData[item.id];
                  return (
                    <div key={item.id} className="flex flex-col gap-4 rounded-lg bg-gray-50 p-4 md:flex-row md:items-center md:justify-between">
                      <div className="min-w-0 font-bold text-gray-700 md:w-60"><span className="mr-2" style={{ color: domain.color }}>{item.id}</span>{item.label}</div>
                      
                      <div className="flex flex-1 flex-wrap gap-1.5">
                        {KSA_SCORE_OPTIONS.map(num => {
                          const isSelected = Object.hasOwn(formData, item.id) && Number(score) === num;
                          return (
                            <button
                              key={num}
                              type="button"
                              onClick={() => !isReadOnly && handleScoreChange(item.id, num)}
                              disabled={isReadOnly}
                              aria-label={`${item.id} ${item.label} ${num} 分`}
                              aria-pressed={isSelected}
                              className={`h-9 min-w-9 rounded border px-2 text-sm font-bold transition-all ${isSelected ? 'border-transparent text-white shadow-sm' : 'border-gray-300 bg-white text-gray-600 hover:border-gray-400'} disabled:cursor-not-allowed disabled:opacity-60`}
                              style={isSelected ? { backgroundColor: domain.color } : undefined}
                            >
                              {num}
                            </button>
                          );
                        })}
                      </div>

                      <div className="text-right md:w-20">
                         {Object.hasOwn(formData, item.id) ? <span className="text-sm font-black" style={{ color: domain.color }}>{score}／5 分</span> : <span className="text-xs text-gray-400">未評分</span>}
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

        {saveError && <p role="alert" className="border-t border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{saveError}</p>}
        {isTeacher && (
          <div className="p-4 bg-gray-50 border-t flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2 bg-purple-600 text-white rounded-lg font-bold hover:bg-purple-700 flex items-center gap-2 disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4"/>}
              儲存里程碑評估
            </button>
          </div>
        )}
      </div>
      {legacyRecord && <section className="rounded-xl border border-amber-200 bg-white p-4 sm:p-5">
        <h3 className="font-bold text-amber-800">舊版 KSA 紀錄（唯讀）</h3>
        <p className="mt-1 text-xs text-gray-500">原 12 項、1–9 分量尺；不與新里程碑分數混算。{legacyRecord.teacherSign ? `評核教師：${legacyRecord.teacherSign}` : ''}</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {LEGACY_KSA_DOMAINS.map(domain => <div key={domain.title} className="rounded-lg bg-amber-50/60 p-3"><h4 className="text-sm font-bold text-gray-700">{domain.title}</h4><div className="mt-2 space-y-1.5">{domain.items.map(item => <p key={item.id} className="flex justify-between gap-2 text-xs text-gray-600"><span>{item.label}</span><span className="font-bold">{Object.hasOwn(legacyRecord.scores || {}, item.id) ? `${legacyRecord.scores[item.id]}／9` : '—'}</span></p>)}</div></div>)}
        </div>
        {legacyRecord.comment && <p className="mt-3 text-xs text-gray-600">原教師總評：{legacyRecord.comment}</p>}
      </section>}
    </div>
  );
};

export default KSAAssessment;

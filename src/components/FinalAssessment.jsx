import React, { useState, useEffect } from 'react';
import { 
  ClipboardCheck, Save, Loader2, Send, Lock, Calendar, UserCheck
} from 'lucide-react';
import { FINAL_ASSESSMENT_CATEGORIES } from '../data/FinalAssessment_Config';

const FinalAssessment = ({ studentEmail, studentName, isTeacher, userProfile, apiUrl }) => {
  const [itemsStatus, setItemsStatus] = useState({}); // { item_name: { passed: true/false, date: '2024-05-01', teacher: 'Name' } }
  const [reviewStatus, setReviewStatus] = useState('processing'); // processing, under_review, approved
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // 1. 讀取資料
  const fetchStatus = async () => {
    if (!studentEmail) return;
    setLoading(true);
    try {
      const res = await fetch(`${apiUrl}?type=getFinalAssessment&studentEmail=${studentEmail}`);
      const data = await res.json();
      setItemsStatus(data.items || {});
      setReviewStatus(data.status || 'processing');
    } catch (e) {
      console.error("Fetch error:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, [studentEmail]);

  // 2. 處理勾選變更
  const handleCheck = (itemName, checked) => {
    if (!isTeacher) return;
    const today = new Date().toISOString().split('T')[0];
    const teacherName = userProfile?.displayName || 'Unknown';

    setItemsStatus(prev => ({
      ...prev,
      [itemName]: {
        passed: checked,
        date: checked ? (prev[itemName]?.date || today) : '', // 若取消勾選則清空日期
        teacher: checked ? teacherName : ''
      }
    }));
  };

  // 3. 處理日期變更
  const handleDateChange = (itemName, newDate) => {
    if (!isTeacher) return;
    setItemsStatus(prev => ({
      ...prev,
      [itemName]: {
        ...prev[itemName],
        date: newDate
      }
    }));
  };

  // 4. 儲存進度 (分項儲存)
  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch(apiUrl, {
        method: 'POST',
        body: JSON.stringify({
          type: 'saveFinalAssessment',
          studentEmail,
          studentName,
          items: itemsStatus
        })
      });
      alert('進度已儲存！');
    } catch (e) {
      alert('儲存失敗');
    } finally {
      setSaving(false);
    }
  };

  // 5. 送出審核 (全部完成後)
  const handleSubmitReview = async () => {
    // 檢查是否全部項目都已通過
    let allPassed = true;
    FINAL_ASSESSMENT_CATEGORIES.forEach(cat => {
      cat.items.forEach(item => {
        if (!itemsStatus[item]?.passed) allPassed = false;
      });
    });

    if (!allPassed) return alert('尚有項目未通過，無法送出審核。');
    if (!confirm('確定要送出完訓審核申請嗎？送出後將通知教學負責人。')) return;

    setSaving(true);
    try {
      await fetch(apiUrl, {
        method: 'POST',
        body: JSON.stringify({
          type: 'submitFinalReview',
          studentEmail,
          studentName
        })
      });
      alert('已送出審核申請！');
      fetchStatus();
    } catch (e) {
      alert('送出失敗');
    } finally {
      setSaving(false);
    }
  };

  const isReadOnly = !isTeacher || reviewStatus !== 'processing';

  return (
    <div className="animate-in fade-in space-y-6">
      <div className="flex justify-between items-center border-b pb-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <ClipboardCheck className="w-6 h-6 text-purple-600" />
            新進人員完訓評估
          </h2>
          <p className="text-sm text-gray-500 mt-1">學員：{studentName}</p>
        </div>
        <div className="flex items-center gap-2">
          {reviewStatus === 'under_review' && <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-xs font-bold">審核中</span>}
          {reviewStatus === 'approved' && <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold">已完訓</span>}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400"><Loader2 className="w-8 h-8 animate-spin mx-auto"/>讀取中...</div>
      ) : (
        <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-gray-700 font-bold border-b">
                <tr>
                  <th className="p-4 w-1/2">訓練項目</th>
                  <th className="p-4 text-center w-24">通過</th>
                  <th className="p-4 w-40">通過日期</th>
                  <th className="p-4">評估藥師</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {FINAL_ASSESSMENT_CATEGORIES.map(cat => (
                  <React.Fragment key={cat.id}>
                    {/* 分類標題 */}
                    <tr className="bg-gray-50/50">
                      <td colSpan="4" className="p-3 pl-4 font-bold text-indigo-700 border-t border-b border-indigo-100">
                        {cat.title}
                      </td>
                    </tr>
                    {/* 項目列表 */}
                    {cat.items.map(item => {
                      const status = itemsStatus[item] || {};
                      return (
                        <tr key={item} className="hover:bg-gray-50 transition-colors">
                          <td className="p-4 font-medium text-gray-800">{item}</td>
                          <td className="p-4 text-center">
                            <input 
                              type="checkbox" 
                              checked={!!status.passed}
                              onChange={(e) => handleCheck(item, e.target.checked)}
                              disabled={isReadOnly}
                              className="w-5 h-5 text-purple-600 rounded cursor-pointer disabled:opacity-50"
                            />
                          </td>
                          <td className="p-4">
                            {status.passed && (
                              <div className="flex items-center gap-2 bg-white border rounded px-2 py-1">
                                <Calendar className="w-3 h-3 text-gray-400"/>
                                <input 
                                  type="date" 
                                  value={status.date || ''}
                                  onChange={(e) => handleDateChange(item, e.target.value)}
                                  disabled={isReadOnly}
                                  className="outline-none bg-transparent w-full text-xs font-medium text-gray-700 disabled:text-gray-500"
                                />
                              </div>
                            )}
                          </td>
                          <td className="p-4 text-gray-600 text-xs">
                            {status.passed && (
                              <div className="flex items-center gap-1">
                                <UserCheck className="w-3 h-3"/> {status.teacher}
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>

          {/* 底部操作區 (僅教師可見) */}
          {isTeacher && reviewStatus === 'processing' && (
            <div className="p-4 bg-gray-50 border-t flex justify-end gap-3">
              <button 
                onClick={handleSave} 
                disabled={saving}
                className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg font-bold hover:bg-gray-100 flex items-center gap-2 text-sm"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4"/>}
                儲存進度
              </button>
              <button 
                onClick={handleSubmitReview}
                disabled={saving}
                className="bg-purple-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-purple-700 flex items-center gap-2 text-sm shadow-md"
              >
                <Send className="w-4 h-4" /> 送出審核
              </button>
            </div>
          )}
          
          {/* 唯讀狀態提示 */}
          {(!isTeacher || reviewStatus !== 'processing') && (
            <div className="p-4 bg-gray-50 border-t text-center text-sm text-gray-500 flex items-center justify-center gap-2">
              <Lock className="w-4 h-4"/> 
              {reviewStatus === 'processing' ? '僅指導藥師可編輯' : '評估已送出或完訓，無法變更'}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FinalAssessment;

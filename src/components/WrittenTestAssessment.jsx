import React, { useState, useEffect } from 'react';
import { 
  FileEdit, Save, Loader2, Plus, Trash2, 
  CheckCircle2, AlertTriangle, Calendar, User
} from 'lucide-react';

const WrittenTestAssessment = ({ studentEmail, studentName, isTeacher, userProfile, apiUrl }) => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);

  // 新增表單狀態
  const [formData, setFormData] = useState({
    testDate: new Date().toISOString().split('T')[0], // 預設當日
    testName: '',
    score: ''
  });

  // 1. 讀取資料
  const fetchRecords = async () => {
    if (!studentEmail) return;
    setLoading(true);
    try {
      const res = await fetch(`${apiUrl}?type=getWrittenTest&studentEmail=${studentEmail}`);
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

  // 2. 儲存資料
  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.testName || !formData.score) {
      alert("請填寫測驗名稱與成績");
      return;
    }

    setSaving(true);
    const teacherName = userProfile?.displayName || 'Unknown Teacher';

    try {
      await fetch(apiUrl, {
        method: 'POST',
        body: JSON.stringify({
          type: 'saveWrittenTest',
          studentEmail,
          studentName,
          testDate: formData.testDate,
          testName: formData.testName,
          score: formData.score,
          teacherName: teacherName,
          updatedBy: userProfile?.email
        })
      });
      alert('成績已登錄！');
      setShowForm(false);
      // 重置表單但保留日期為今日
      setFormData({
        testDate: new Date().toISOString().split('T')[0],
        testName: '',
        score: ''
      });
      fetchRecords();
    } catch (e) {
      alert('儲存失敗');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="animate-in fade-in space-y-6">
      {/* 標題區 */}
      <div className="flex justify-between items-center border-b pb-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <FileEdit className="w-6 h-6 text-orange-600" />
            筆試測驗紀錄
          </h2>
          <p className="text-sm text-gray-500 mt-1">學員：{studentName}</p>
        </div>
        
        {/* 只有老師看得到新增按鈕 */}
        {isTeacher && !showForm && (
          <button 
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors shadow-sm font-bold text-sm"
          >
            <Plus className="w-4 h-4" /> 新增測驗
          </button>
        )}
      </div>

      {/* 新增表單 (僅老師可見) */}
      {showForm && isTeacher && (
        <div className="bg-orange-50 p-5 rounded-xl border border-orange-200 shadow-sm animate-in slide-in-from-top-2">
          <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Plus className="w-4 h-4" /> 新增筆試成績
          </h3>
          <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
            
            {/* 測驗日期 */}
            <div className="md:col-span-3">
              <label className="block text-xs font-bold text-gray-600 mb-1">測驗日期</label>
              <input 
                type="date"
                value={formData.testDate}
                onChange={e => setFormData({...formData, testDate: e.target.value})}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
              />
            </div>

            {/* 測驗名稱 */}
            <div className="md:col-span-4">
              <label className="block text-xs font-bold text-gray-600 mb-1">測驗名稱</label>
              <input 
                type="text"
                placeholder="例如：第一階段藥理學測驗"
                value={formData.testName}
                onChange={e => setFormData({...formData, testName: e.target.value})}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
              />
            </div>

            {/* 成績 */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-gray-600 mb-1">成績 (0-100)</label>
              <input 
                type="number"
                placeholder="分數"
                value={formData.score}
                onChange={e => setFormData({...formData, score: e.target.value})}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none font-bold text-center"
              />
            </div>

            {/* 考核教師 (自動帶入顯示) */}
            <div className="md:col-span-3 flex gap-2">
               <div className="flex-1">
                 <label className="block text-xs font-bold text-gray-600 mb-1">考核教師</label>
                 <div className="w-full p-2 bg-gray-100 border border-gray-200 rounded-lg text-gray-500 text-sm flex items-center gap-2">
                   <User className="w-3 h-3"/> {userProfile?.displayName || 'Teacher'}
                 </div>
               </div>
            </div>

            {/* 按鈕群組 */}
            <div className="md:col-span-12 flex justify-end gap-3 mt-2">
              <button 
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 text-gray-600 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg font-medium text-sm"
              >
                取消
              </button>
              <button 
                type="submit"
                disabled={saving}
                className="px-6 py-2 bg-orange-600 text-white rounded-lg font-bold hover:bg-orange-700 shadow-md flex items-center gap-2 disabled:opacity-50 text-sm"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4"/>}
                儲存成績
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 列表顯示 */}
      <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-600 font-bold border-b">
              <tr>
                <th className="p-4 whitespace-nowrap">測驗日期</th>
                <th className="p-4 w-1/3">測驗名稱</th>
                <th className="p-4 text-center">成績</th>
                <th className="p-4">結果狀態</th>
                <th className="p-4 whitespace-nowrap">考核教師</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-gray-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2"/>
                    讀取中...
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-gray-400 italic">
                    尚無筆試測驗紀錄
                  </td>
                </tr>
              ) : (
                records.map((record, idx) => {
                  const score = parseFloat(record.score);
                  const isPass = score >= 80;
                  return (
                    <tr key={idx} className="hover:bg-gray-50 transition-colors">
                      <td className="p-4 font-medium text-gray-700 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                           <Calendar className="w-4 h-4 text-gray-400"/>
                           {record.testDate}
                        </div>
                      </td>
                      <td className="p-4 font-bold text-gray-800">{record.testName}</td>
                      <td className={`p-4 text-center font-bold text-lg ${isPass ? 'text-green-600' : 'text-red-600'}`}>
                        {record.score}
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                          isPass 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-red-100 text-red-700 animate-pulse'
                        }`}>
                          {isPass ? <CheckCircle2 className="w-3 h-3"/> : <AlertTriangle className="w-3 h-3"/>}
                          {record.status}
                        </span>
                      </td>
                      <td className="p-4 text-gray-600 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <User className="w-3 h-3"/> {record.teacherName}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default WrittenTestAssessment;

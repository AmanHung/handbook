import React, { useState } from 'react';
import { X, Save, Calendar, User, CheckCircle2, AlertCircle } from 'lucide-react';
import { EPA_LEVEL_OPTIONS, EPA_PERFORMANCE_OPTIONS } from '../data/EPA_Config';

const EPAFormModal = ({ epa, studentName, teacherName, onClose, onSubmit, isSubmitting }) => {
  const [evalDate, setEvalDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedLevel, setSelectedLevel] = useState('');
  const [checklistValues, setChecklistValues] = useState({});
  const [feedback, setFeedback] = useState('');

  const handleChecklistChange = (itemText, value) => {
    setChecklistValues(prev => ({ ...prev, [itemText]: value }));
  };

  const handleSubmit = () => {
    if (!selectedLevel) return alert('請選擇「信賴等級」');
    
    // 檢查細項
    const allItemsChecked = epa.check_items.every(item => checklistValues[item]);
    if (!allItemsChecked) return alert('請確認所有「觀察項目」皆已完成評分');

    const formData = {
      epa_id: epa.id,
      epa_title: epa.title, // 傳給後端寄信用
      date: evalDate,
      level: selectedLevel,
      checklist: checklistValues,
      feedback_content: feedback,
      teacher_name: teacherName || 'Unknown Teacher'
    };

    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 border-b bg-gray-50 flex justify-between items-center flex-shrink-0">
          <div>
            <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <span className="bg-indigo-600 text-white text-xs px-2 py-1 rounded">新增評估</span>
              {epa.title}
            </h3>
            <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
              <span className="flex items-center gap-1"><User className="w-4 h-4"/> 學員：{studentName}</span>
              <span className="flex items-center gap-1"><User className="w-4 h-4"/> 評核者：{teacherName}</span>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
            <X className="w-6 h-6 text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          
          {/* 日期與情境 */}
          <section className="bg-blue-50 p-4 rounded-xl border border-blue-100">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-indigo-600" />
                  評估日期 (可修改)
                </label>
                <input 
                  type="date" 
                  value={evalDate}
                  onChange={(e) => setEvalDate(e.target.value)}
                  className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-gray-700"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">情境說明限制</label>
                <p className="text-sm text-gray-600 bg-white p-3 rounded-lg border border-blue-200">
                  {epa.description}
                </p>
              </div>
            </div>
          </section>

          {/* 信賴等級 */}
          <section>
            <h4 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <span className="w-1.5 h-6 bg-indigo-500 rounded-full"/>
              信賴等級評估
            </h4>
            <div className="grid grid-cols-1 gap-3">
              {EPA_LEVEL_OPTIONS.map((option) => (
                <label 
                  key={option.value}
                  className={`relative flex items-center p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    selectedLevel === option.value 
                      ? 'border-indigo-600 bg-indigo-50 shadow-md' 
                      : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50'
                  }`}
                >
                  <input 
                    type="radio" 
                    name="trust_level" 
                    value={option.value} 
                    checked={selectedLevel === option.value}
                    onChange={() => setSelectedLevel(option.value)}
                    className="w-5 h-5 text-indigo-600 border-gray-300 focus:ring-indigo-500"
                  />
                  <span className="ml-3 font-medium text-gray-800">{option.label.split(':')[0]}</span>
                  <span className="ml-2 text-gray-600 text-sm"> - {option.label.split(':')[1]}</span>
                </label>
              ))}
            </div>
          </section>

          {/* 細項評分 */}
          <section>
            <h4 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <span className="w-1.5 h-6 bg-indigo-500 rounded-full"/>
              細項觀察評分
            </h4>
            <div className="border rounded-xl overflow-hidden shadow-sm">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-100 text-gray-700 font-bold border-b">
                  <tr>
                    <th className="p-4 w-1/3">評估項目</th>
                    {EPA_PERFORMANCE_OPTIONS.map(opt => (
                      <th key={opt.value} className="p-4 text-center text-xs w-[16%]">
                        {opt.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {epa.check_items.map((item, idx) => (
                    <tr key={idx} className="hover:bg-gray-50 transition-colors">
                      <td className="p-4 font-medium text-gray-800">{item}</td>
                      {EPA_PERFORMANCE_OPTIONS.map(opt => (
                        <td key={opt.value} className="p-4 text-center">
                          <input 
                            type="radio"
                            name={`check_${idx}`} 
                            checked={checklistValues[item] === opt.value}
                            onChange={() => handleChecklistChange(item, opt.value)}
                            className="w-4 h-4 text-indigo-600 cursor-pointer"
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* 教師回饋 (移除滿意度) */}
          <section>
             <h4 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                <span className="w-1.5 h-6 bg-indigo-500 rounded-full"/>
                教師綜合回饋
              </h4>
              <textarea 
                className="w-full h-32 p-4 border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none resize-none text-gray-700 bg-gray-50"
                placeholder="請輸入觀察回饋、優點或建議..."
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
              />
          </section>

        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-white flex justify-end gap-3 flex-shrink-0">
          <button onClick={onClose} className="px-6 py-2.5 rounded-lg border text-gray-600 font-bold hover:bg-gray-50 transition-colors">取消</button>
          <button 
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-8 py-2.5 rounded-lg bg-indigo-600 text-white font-bold hover:bg-indigo-700 shadow-lg disabled:opacity-50 flex items-center gap-2"
          >
            {isSubmitting ? '傳送中...' : <><Save className="w-5 h-5" /> 確認送出</>}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EPAFormModal;

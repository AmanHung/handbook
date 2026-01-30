import React, { useState, useEffect } from 'react';
import { 
  collection, 
  getDocs,
  query,
  where // 確保有引入 where
} from 'firebase/firestore';
import { db } from '../firebase';
import { 
  CheckCircle2, 
  AlertCircle, 
  ChevronDown, 
  ChevronRight, 
  UserCheck, 
  BookOpen,
  Calendar,
  Loader2,
  User,
  Save,
  X
} from 'lucide-react';

// ★★★ 請將此處替換為您的 Google Apps Script 網頁應用程式網址 ★★★
const GAS_API_URL = "https://script.google.com/macros/s/AKfycbw3-nakNBi0t3W3_-XtQmztYqq9qAj0ZOaGpXKZG41eZfhYjNfIM5xuVXwzSLa1_X3hfA/exec"; 

const PassportSection = ({ user, userRole }) => {
  // 狀態管理
  const [students, setStudents] = useState([]);
  const [selectedStudentEmail, setSelectedStudentEmail] = useState(user?.email);
  const [selectedStudentName, setSelectedStudentName] = useState(user?.displayName);
  
  const [passportData, setPassportData] = useState({ items: [], records: {} });
  const [loading, setLoading] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState({});

  // 評核 Modal 狀態
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentEval, setCurrentEval] = useState({ itemId: '', itemName: '', status: 'pass', date: '', note: '' });
  const [submitting, setSubmitting] = useState(false);

  // 初始化：如果是老師，抓取「僅限學生身分」的名單
  useEffect(() => {
    if (userRole === 'teacher') {
      const fetchStudents = async () => {
        try {
          // --- 修正重點 1: 加入 where 條件，只抓取 role 為 student 的用戶 ---
          const q = query(collection(db, 'users'), where('role', '==', 'student'));
          const snap = await getDocs(q);
          const list = snap.docs.map(d => d.data());
          setStudents(list);
        } catch (error) {
          console.error("讀取學生名單失敗:", error);
        }
      };
      fetchStudents();
    }
  }, [userRole]);

  // 讀取護照資料 (從 GAS)
  const fetchPassportData = async (email) => {
    if (!email || !GAS_API_URL.startsWith("http")) return;
    setLoading(true);
    try {
      const response = await fetch(`${GAS_API_URL}?type=getData&studentEmail=${email}`);
      const data = await response.json();
      setPassportData(data);
      
      // 預設展開第一個類別
      if (data.items.length > 0) {
        const firstCat = data.items[0].category_id;
        setExpandedGroups(prev => ({ ...prev, [firstCat]: true }));
      }
    } catch (error) {
      console.error("讀取失敗:", error);
      alert("無法讀取護照資料，請確認網路或聯絡管理員");
    }
    setLoading(false);
  };

  // 當選擇的學生改變時，重新抓取資料
  useEffect(() => {
    fetchPassportData(selectedStudentEmail);
  }, [selectedStudentEmail]);

  // 資料處理：將扁平的 items 轉為以 Category 分組的結構
  const groupedItems = passportData.items.reduce((acc, item) => {
    if (!acc[item.category_id]) {
      acc[item.category_id] = {
        id: item.category_id,
        title: item.category_name,
        items: []
      };
    }
    acc[item.category_id].items.push(item);
    return acc;
  }, {});

  // 開啟評核視窗
  const openEvaluateModal = (item) => {
    if (userRole !== 'teacher') return;
    
    // 預設日期為今天
    const today = new Date().toISOString().split('T')[0];
    
    setCurrentEval({
      itemId: item.id,
      itemName: item.sub_item || item.title, 
      status: 'pass',
      date: today,
      note: ''
    });
    setIsModalOpen(true);
  };

  // 送出評核 (寫入 Google Sheet)
  const handleSubmitEval = async () => {
    setSubmitting(true);
    
    // --- 修正重點 2: 使用 user.displayName (老師姓名) ---
    // 如果系統抓不到 displayName，則回退顯示 Email 的前綴，確保一定有值
    const teacherDisplayName = user.displayName || user.email.split('@')[0];

    const payload = {
      studentEmail: selectedStudentEmail,
      itemId: currentEval.itemId,
      status: currentEval.status,
      assessDate: currentEval.date,
      teacherName: teacherDisplayName, // 傳送姓名
      note: currentEval.note
    };

    try {
      await fetch(GAS_API_URL, {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      
      // 更新成功後，重新讀取資料以顯示最新狀態
      await fetchPassportData(selectedStudentEmail);
      setIsModalOpen(false);
      alert("評核已儲存！");
      
    } catch (error) {
      console.error(error);
      alert("儲存失敗");
    }
    setSubmitting(false);
  };

  const toggleGroup = (groupId) => {
    setExpandedGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-4 md:p-6 md:rounded-xl shadow-sm border border-gray-100">
        
        {/* Header Area */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-100 p-2 rounded-lg">
               <BookOpen className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">新進人員學習護照</h2>
              <p className="text-xs text-gray-500">
                {userRole === 'teacher' ? '請選擇學員進行考核' : '您的學習進度總覽'}
              </p>
            </div>
          </div>

          {/* Teacher: Student Selector */}
          {userRole === 'teacher' && (
            <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg border border-gray-200">
              <User className="w-4 h-4 text-gray-400" />
              <select 
                value={selectedStudentEmail}
                onChange={(e) => {
                  setSelectedStudentEmail(e.target.value);
                  const s = students.find(s => s.email === e.target.value);
                  setSelectedStudentName(s?.displayName || e.target.value);
                }}
                className="bg-transparent text-sm font-bold text-gray-700 outline-none min-w-[150px]"
              >
                {students.length > 0 ? (
                  students.map(s => (
                    <option key={s.email} value={s.email}>
                      {s.displayName || s.email}
                    </option>
                  ))
                ) : (
                  <option disabled>無符合的學員資料</option>
                )}
              </select>
            </div>
          )}
          
          {/* Student: Show Name */}
          {userRole !== 'teacher' && (
            <div className="px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg text-sm font-bold">
              學員：{user.displayName}
            </div>
          )}
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="text-center py-12 text-gray-400 flex flex-col items-center">
            <Loader2 className="w-8 h-8 animate-spin mb-2" />
            <p>正在同步雲端護照資料...</p>
          </div>
        ) : (
          <div className="space-y-3">
            {Object.values(groupedItems).map((group) => {
              const isExpanded = expandedGroups[group.id];
              // 計算該組別完成項目數
              const completedCount = group.items.filter(item => passportData.records[item.id]?.status === 'pass').length;
              const totalCount = group.items.length;
              const progress = Math.round((completedCount / totalCount) * 100) || 0;

              return (
                <div key={group.id} className="border border-gray-200 rounded-lg overflow-hidden">
                  <button 
                    onClick={() => toggleGroup(group.id)}
                    className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-gray-700">{group.title}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${progress === 100 ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>
                        {progress}%
                      </span>
                    </div>
                    {isExpanded ? <ChevronDown className="w-5 h-5 text-gray-400" /> : <ChevronRight className="w-5 h-5 text-gray-400" />}
                  </button>

                  {isExpanded && (
                    <div className="bg-white divide-y divide-gray-100">
                      {group.items.map((item) => {
                        const record = passportData.records[item.id] || {};
                        const status = record.status; 
                        
                        return (
                          <div key={item.id} className="p-3 pl-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-gray-50">
                            <div className="flex-1">
                              <p className="text-sm text-gray-800 font-medium">
                                {item.sub_item || item.title}
                              </p>
                              {/* 顯示評核資訊 (顯示老師姓名) */}
                              {record.teacher && (
                                <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                                  <UserCheck className="w-3 h-3" />
                                  {record.teacher} ({new Date(record.date).toLocaleDateString()})
                                  {record.note && <span className="text-gray-400"> - {record.note}</span>}
                                </p>
                              )}
                            </div>

                            {/* 操作按鈕區 */}
                            <div className="flex items-center gap-2">
                              {status === 'pass' && (
                                <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3" /> 合格
                                </span>
                              )}
                              {status === 'improve' && (
                                <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-bold flex items-center gap-1">
                                  <AlertCircle className="w-3 h-3" /> 再加強
                                </span>
                              )}
                              
                              {/* 老師評核按鈕 */}
                              {userRole === 'teacher' && (
                                <button
                                  onClick={() => openEvaluateModal(item)}
                                  className="px-3 py-1 border border-indigo-200 text-indigo-600 hover:bg-indigo-50 rounded-md text-xs font-bold transition-colors"
                                >
                                  {status ? '重新評核' : '評核'}
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
            
            {Object.keys(groupedItems).length === 0 && (
              <div className="text-center py-8 text-gray-400 border border-dashed rounded-lg">
                目前試算表中沒有設定任何項目 (請至 Google Sheet: PassportItems 分頁新增)
              </div>
            )}
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
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">考核項目</label>
                <p className="text-sm font-bold text-gray-800 bg-gray-100 p-2 rounded">{currentEval.itemName}</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">評核日期</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                  <input 
                    type="date" 
                    value={currentEval.date}
                    onChange={e => setCurrentEval({...currentEval, date: e.target.value})}
                    className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">評核結果</label>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setCurrentEval({...currentEval, status: 'pass'})}
                    className={`flex-1 py-2 rounded-lg text-sm font-bold border transition-all ${
                      currentEval.status === 'pass' 
                        ? 'bg-green-100 text-green-700 border-green-300' 
                        : 'bg-white text-gray-500 border-gray-200'
                    }`}
                  >
                    合格
                  </button>
                  <button 
                    onClick={() => setCurrentEval({...currentEval, status: 'improve'})}
                    className={`flex-1 py-2 rounded-lg text-sm font-bold border transition-all ${
                      currentEval.status === 'improve' 
                        ? 'bg-orange-100 text-orange-700 border-orange-300' 
                        : 'bg-white text-gray-500 border-gray-200'
                    }`}
                  >
                    再加強
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">備註/建議 (選填)</label>
                <input 
                  type="text" 
                  value={currentEval.note}
                  onChange={e => setCurrentEval({...currentEval, note: e.target.value})}
                  placeholder="例如：操作流暢、需注意無菌..."
                  className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:border-indigo-500"
                />
              </div>

              <button 
                onClick={handleSubmitEval}
                disabled={submitting}
                className="w-full py-2.5 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 disabled:opacity-50 flex justify-center items-center gap-2"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                確認送出
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PassportSection;

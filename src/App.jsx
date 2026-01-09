// src/App.jsx
import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';

// 引入 Firebase 相關功能
import { db } from './firebase';
import { collection, onSnapshot, query } from 'firebase/firestore';

// 引入元件
import SOPManager from './components/SOPManager';
import QuickLookup from './components/QuickLookup';
import ShiftNavigator from './components/ShiftNavigator';
import PassportSection from './components/PassportSection';
import AdminPage from './components/AdminPage'; 

// 引入靜態資料
import { SHIFTS_DATA as shifts } from './data/shiftData';
import { PASSPORT_CATEGORIES as trainingModules } from './data/trainingData';

import './App.css';

function App() {
  const [sops, setSops] = useState([]);
  const [activeTab, setActiveTab] = useState('lookup');
  const [loading, setLoading] = useState(true);

  // === 從 Firebase 即時讀取資料 ===
  useEffect(() => {
    const q = query(collection(db, 'sop_articles'));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const sopsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // 前端排序 (新的在上面)
      sopsData.sort((a, b) => {
        const timeA = a.createdAt?.seconds || 0;
        const timeB = b.createdAt?.seconds || 0;
        return timeB - timeA;
      });

      setSops(sopsData);
      setLoading(false);
    }, (error) => {
      console.error("讀取資料庫失敗:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <div className="min-h-screen bg-gray-50">
        <Routes>
          {/* ==============================
              首頁路由 
             ============================== */}
          <Route path="/" element={
            // ✨ 極致版修改 1: 手機版外距近乎歸零 (px-1 = 4px)
            <div className="container mx-auto px-1 py-2 sm:px-4 sm:py-8 max-w-4xl">
              
              {/* ✨ 極致版修改 2: 標題再縮小間距，保留一點左右邊距以免貼邊 */}
              <header className="mb-2 sm:mb-8 text-center px-2">
                <h1 className="text-lg sm:text-3xl font-black text-gray-800 mb-0.5 sm:mb-2 tracking-tight">
                  💊 藥局新人手冊
                </h1>
                <p className="text-[10px] sm:text-base text-gray-500 font-medium">
                  SOP 查詢 · 班別指引 · 學習護照
                </p>
              </header>

              {/* ✨ 極致版修改 3: 導航列更扁平，寬度設為 98% */}
              <div className="flex justify-center space-x-1 sm:space-x-2 mb-2 sm:mb-8 bg-white p-1 sm:p-2 rounded-xl shadow-sm w-[99%] mx-auto border border-gray-100">
                <button
                  onClick={() => setActiveTab('lookup')}
                  className={`flex-1 sm:flex-none px-1 sm:px-6 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-bold transition-all ${
                    activeTab === 'lookup'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  🔍 查詢
                </button>
                <button
                  onClick={() => setActiveTab('shift')}
                  className={`flex-1 sm:flex-none px-1 sm:px-6 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-bold transition-all ${
                    activeTab === 'shift'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  🏥 班別
                </button>
                <button
                  onClick={() => setActiveTab('passport')}
                  className={`flex-1 sm:flex-none px-1 sm:px-6 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-bold transition-all ${
                    activeTab === 'passport'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  📘 護照
                </button>
              </div>

              {/* ✨ 極致版修改 4: 主內容區塊內距縮到最小 (p-2 = 8px) */}
              <main className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-gray-100 p-2 sm:p-6 min-h-[60vh]">
                {activeTab === 'lookup' && (
                  <>
                    {loading ? (
                      <div className="text-center py-20 text-gray-400 font-bold animate-pulse">
                        資料載入中... ☁️
                      </div>
                    ) : sops.length === 0 ? (
                      <div className="text-center py-20 text-gray-400">
                        <p className="text-lg font-bold">目前資料庫是空的 📭</p>
                        <p className="text-sm mt-2">請點擊下方「管理員登入」去新增第一筆 SOP 吧！</p>
                      </div>
                    ) : (
                      <QuickLookup sops={sops} />
                    )}
                  </>
                )}

                {activeTab === 'shift' && (
                  <ShiftNavigator shifts={shifts} />
                )}

                {activeTab === 'passport' && (
                  <PassportSection modules={trainingModules} />
                )}
              </main>

              {/* 頁尾 */}
              <footer className="mt-6 sm:mt-12 py-4 sm:py-6 text-center border-t border-gray-200">
                <p className="text-gray-400 text-[10px] sm:text-sm mb-1 sm:mb-2">
                  © 2024 藥劑部教學組
                </p>
                <Link 
                  to="/admin" 
                  className="text-[10px] sm:text-xs text-gray-300 hover:text-gray-500 transition-colors"
                >
                  管理員登入 🔐
                </Link>
              </footer>
            </div>
          } />

          {/* ==============================
              後台路由 
             ============================== */}
          <Route path="/admin" element={<AdminPage />} />
          
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
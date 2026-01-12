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
import VideoGallery from './components/VideoGallery'; // ✨ 新增：影片元件

// 引入靜態資料
import { SHIFTS_DATA as shifts } from './data/shiftData';
import { PASSPORT_CATEGORIES as trainingModules } from './data/trainingData';

import './App.css';

function App() {
  // === 狀態管理 ===
  const [sops, setSops] = useState([]);
  const [activeTab, setActiveTab] = useState('lookup'); // 預設顯示查詢頁籤
  const [loading, setLoading] = useState(true);

  // === 從 Firebase 即時讀取 SOP 資料 ===
  useEffect(() => {
    // 建立查詢 (指向 sop_articles 集合)
    const q = query(collection(db, 'sop_articles'));

    // 設定即時監聽器
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const sopsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // 前端排序 (依建立時間，新的在上面)
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

    // 元件卸載時取消監聽
    return () => unsubscribe();
  }, []);

  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <div className="min-h-screen bg-gray-50">
        <Routes>
          {/* ==============================
              首頁路由 (前台)
             ============================== */}
          <Route path="/" element={
            // 手機版優化容器：極窄邊距
            <div className="container mx-auto px-1 py-2 sm:px-4 sm:py-8 max-w-4xl">
              
              {/* 1. 頁首標題 */}
              <header className="mb-2 sm:mb-8 text-center px-2">
                <h1 className="text-lg sm:text-3xl font-black text-gray-800 mb-0.5 sm:mb-2 tracking-tight">
                  💊 藥局新人手冊
                </h1>
                <p className="text-[10px] sm:text-base text-gray-500 font-medium">
                  SOP 查詢 · 班別指引 · 學習護照 · 影音教學
                </p>
              </header>

              {/* 2. 功能導航列 (可橫向捲動以適應小螢幕) */}
              <div className="flex justify-center gap-1 sm:gap-2 mb-2 sm:mb-8 bg-white p-1 sm:p-2 rounded-xl shadow-sm w-[99%] mx-auto border border-gray-100 overflow-x-auto">
                <button
                  onClick={() => setActiveTab('lookup')}
                  className={`flex-1 min-w-[60px] px-1 sm:px-6 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
                    activeTab === 'lookup'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  🔍 查詢
                </button>
                <button
                  onClick={() => setActiveTab('shift')}
                  className={`flex-1 min-w-[60px] px-1 sm:px-6 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
                    activeTab === 'shift'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  🏥 班別
                </button>
                <button
                  onClick={() => setActiveTab('passport')}
                  className={`flex-1 min-w-[60px] px-1 sm:px-6 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
                    activeTab === 'passport'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  📘 護照
                </button>
                <button
                  onClick={() => setActiveTab('video')}
                  className={`flex-1 min-w-[60px] px-1 sm:px-6 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
                    activeTab === 'video'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  🎥 影片
                </button>
              </div>

              {/* 3. 主要內容顯示區 */}
              <main className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-gray-100 p-2 sm:p-6 min-h-[60vh]">
                
                {/* 分頁 1: SOP 查詢 */}
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

                {/* 分頁 2: 班別指引 */}
                {activeTab === 'shift' && (
                  <ShiftNavigator shifts={shifts} />
                )}

                {/* 分頁 3: 學習護照 */}
                {activeTab === 'passport' && (
                  <PassportSection modules={trainingModules} />
                )}

                {/* 分頁 4: 影音教學 (新增) */}
                {activeTab === 'video' && (
                  <VideoGallery />
                )}

              </main>

              {/* 4. 頁尾 */}
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
              後台路由 (管理員)
             ============================== */}
          <Route path="/admin" element={<AdminPage />} />
          
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
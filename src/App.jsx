// src/App.jsx
import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';

// 引入 Firebase 相關功能
import { db } from './firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';

// 引入元件
import SOPManager from './components/SOPManager'; // 雖然這裡沒直接用，但 AdminPage 會用到
import QuickLookup from './components/QuickLookup';
import ShiftNavigator from './components/ShiftNavigator';
import PassportSection from './components/PassportSection';
import AdminPage from './components/AdminPage'; 

// 引入靜態資料 (SOP 資料改由 Firebase 讀取，這裡不再需要 sopSeed)
// import { SOP_SEED_DATA as sopSeed } from './data/sopSeed'; // 註解掉或移除
import { SHIFTS_DATA as shifts } from './data/shiftData';
import { PASSPORT_CATEGORIES as trainingModules } from './data/trainingData';

import './App.css';

function App() {
  const [sops, setSops] = useState([]);
  const [activeTab, setActiveTab] = useState('lookup');
  const [loading, setLoading] = useState(true); // 增加載入狀態

  // === 關鍵修改：從 Firebase 即時讀取資料 ===
  useEffect(() => {
    // 建立查詢：讀取 'sop_articles' 集合，並依照 'createdAt' 排序 (選用)
    // 如果沒有 createdAt 欄位，可以只用 collection(db, 'sop_articles')
    const q = query(collection(db, 'sop_articles')); // 簡易版，先不強制排序以免報錯

    // 開啟監聽器 (Real-time listener)
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const sopsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // 在前端做簡單排序 (新的在上面)
      // 假設資料有 createdAt (Timestamp)，如果沒有則不影響
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

    // 元件卸載時，關閉監聽，避免記憶體洩漏
    return () => unsubscribe();
  }, []);

  return (
    // 保持原本的 basename 設定
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <div className="min-h-screen bg-gray-50">
        <Routes>
          {/* ==============================
              首頁路由 
             ============================== */}
          <Route path="/" element={
            <div className="container mx-auto px-4 py-8 max-w-4xl">
              <header className="mb-8 text-center">
                <h1 className="text-3xl font-bold text-gray-800 mb-2">
                  💊 藥局新人手冊系統
                </h1>
                <p className="text-gray-600">
                  快速查詢 SOP · 班別指引 · 學習護照
                </p>
              </header>

              {/* 導航切換按鈕 */}
              <div className="flex justify-center space-x-2 mb-8 bg-white p-2 rounded-lg shadow-sm w-fit mx-auto">
                <button
                  onClick={() => setActiveTab('lookup')}
                  className={`px-4 py-2 rounded-md transition-colors ${
                    activeTab === 'lookup'
                      ? 'bg-blue-600 text-white shadow'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  🔍 SOP 查詢
                </button>
                <button
                  onClick={() => setActiveTab('shift')}
                  className={`px-4 py-2 rounded-md transition-colors ${
                    activeTab === 'shift'
                      ? 'bg-blue-600 text-white shadow'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  🏥 班別指引
                </button>
                <button
                  onClick={() => setActiveTab('passport')}
                  className={`px-4 py-2 rounded-md transition-colors ${
                    activeTab === 'passport'
                      ? 'bg-blue-600 text-white shadow'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  📘 學習護照
                </button>
              </div>

              {/* 主要內容區塊 */}
              <main className="bg-white rounded-xl shadow-lg p-6">
                {activeTab === 'lookup' && (
                  <>
                    {/* 顯示載入中或沒有資料的提示 */}
                    {loading ? (
                      <div className="text-center py-10 text-gray-500">
                        資料載入中... ☁️
                      </div>
                    ) : sops.length === 0 ? (
                      <div className="text-center py-10 text-gray-400">
                        <p>目前資料庫是空的 📭</p>
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

              {/* 頁尾與管理員入口 */}
              <footer className="mt-12 py-6 text-center border-t border-gray-200">
                <p className="text-gray-400 text-sm mb-2">
                  © 2024 藥劑部教學組 | 致力於更好的藥事服務
                </p>
                <Link 
                  to="/admin" 
                  className="text-xs text-gray-300 hover:text-gray-500 transition-colors"
                >
                  管理員登入 🔐
                </Link>
              </footer>
            </div>
          } />

          {/* ==============================
              後台路由 (需要密碼驗證)
             ============================== */}
          <Route path="/admin" element={<AdminPage />} />
          
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
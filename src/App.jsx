// src/App.jsx
import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import SOPManager from './components/SOPManager';
import QuickLookup from './components/QuickLookup';
import ShiftNavigator from './components/ShiftNavigator';
import PassportSection from './components/PassportSection';
import AdminPage from './components/AdminPage'; 

// 引入資料
import { SOP_SEED_DATA as sopSeed } from './data/sopSeed';
import { SHIFTS_DATA as shifts } from './data/shiftData';
import { PASSPORT_CATEGORIES as trainingModules } from './data/trainingData';

import './App.css';

function App() {
  const [sops, setSops] = useState([]);
  const [activeTab, setActiveTab] = useState('lookup');

  // 初始化載入資料
  useEffect(() => {
    setSops(sopSeed);
  }, []);

  return (
    // === 修正重點：加入 basename 設定 ===
    // import.meta.env.BASE_URL 會自動讀取 vite.config.js 中的 base 設定 ('/handbook/')
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
                  <QuickLookup sops={sops} />
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
// src/App.jsx
import React, { useState } from 'react';
import { 
  User, Stethoscope, ClipboardCheck, Calendar, Menu, Sun, BookOpen, Zap, Search
} from 'lucide-react';

// 引入各個功能模組
import ShiftNavigator from './components/ShiftNavigator'; 
import QuickLookup from './components/QuickLookup'; 
import PassportSection from './components/PassportSection';

// ⚠️ 管理員工具 (保留引入，但透過開關控制顯示)
import AdminUploader from './components/AdminUploader';

export default function App() {
  const [activeTab, setActiveTab] = useState('home'); 
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // ==========================================
  // 🔧 開發者專用開關
  // ==========================================
  // 想更新資料庫時，請將 false 改為 true
  const showAdminTool = false; 
  // ==========================================

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-24 max-w-md mx-auto shadow-2xl relative">
      
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md px-6 py-4 flex items-center justify-between border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-black text-lg text-slate-800 leading-none">新人手冊</h1>
            <p className="text-[10px] text-slate-400 uppercase font-bold">Fengyuan Pharmacy</p>
          </div>
        </div>
        <button onClick={() => setSidebarOpen(true)} className="p-2 text-slate-400 hover:text-slate-600">
          <Menu className="w-6 h-6" />
        </button>
      </header>

      {/* Main Content */}
      <main className="p-6">
        
        {/* ⚠️ 管理員上傳區塊 (隱藏式) */}
        {showAdminTool && (
           <div className="mb-8 border-4 border-red-500/30 bg-red-50 rounded-xl p-4 animate-pulse">
             <p className="text-center text-red-600 font-bold text-xs mb-2">⚠️ 管理員模式開啟中：SOP 資料庫維護</p>
             <AdminUploader />
           </div>
        )}

        {/* 1. 首頁 (Home) */}
        {activeTab === 'home' && (
           <div className="space-y-6 pb-12">
              {/* 歡迎區塊 */}
              <div className="bg-gradient-to-br from-indigo-600 to-blue-700 p-8 rounded-[2rem] text-white shadow-xl relative overflow-hidden">
                <div className="relative z-10">
                  <h1 className="text-2xl font-bold mb-1">早安，豐藥新人</h1>
                  <p className="text-blue-100 text-xs mb-6 font-medium">今日進度：第 1 週</p>
                  <div className="h-2.5 bg-blue-900/30 rounded-full overflow-hidden mb-2">
                    <div className="h-full bg-white w-1/4 rounded-full"></div>
                  </div>
                  <span className="text-[10px] text-white font-black">25% TRAINING DONE</span>
                </div>
                <Sun className="absolute -right-4 -bottom-4 opacity-10 w-32 h-32" />
              </div>

              {/* 班表模組 */}
              <ShiftNavigator /> 
           </div>
        )}
        
        {/* 2. 速查頁面 (包含雲端 SOP) */}
        {activeTab === 'lookup' && <QuickLookup />}

        {/* 3. 兒科專區 (預留位置) */}
        {activeTab === 'pediatric' && (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <Stethoscope className="w-16 h-16 mb-4 opacity-20" />
            <p className="text-sm font-bold">兒科專區建置中...</p>
          </div>
        )}

        {/* 4. 學習護照 */}
        {activeTab === 'passport' && <PassportSection />}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-[340px] bg-white/90 backdrop-blur-xl rounded-[2.5rem] shadow-2xl border flex justify-around items-center p-2 z-50">
        <button onClick={() => setActiveTab('home')} className={`p-4 rounded-full transition-all ${activeTab === 'home' ? 'bg-indigo-600 text-white shadow-lg scale-110' : 'text-slate-400'}`}>
          <User className="w-5 h-5" />
        </button>
        
        <button onClick={() => setActiveTab('lookup')} className={`p-4 rounded-full transition-all ${activeTab === 'lookup' ? 'bg-indigo-600 text-white shadow-lg scale-110' : 'text-slate-400'}`}>
          <Search className="w-5 h-5" />
        </button>

        <button onClick={() => setActiveTab('pediatric')} className={`p-4 rounded-full transition-all ${activeTab === 'pediatric' ? 'bg-teal-600 text-white shadow-lg scale-110' : 'text-slate-400'}`}>
          <Stethoscope className="w-5 h-5" />
        </button>
        
        <button onClick={() => setActiveTab('passport')} className={`p-4 rounded-full transition-all ${activeTab === 'passport' ? 'bg-indigo-600 text-white shadow-lg scale-110' : 'text-slate-400'}`}>
          <ClipboardCheck className="w-5 h-5" />
        </button>
      </nav>
      
      {/* Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm" onClick={() => setSidebarOpen(false)}>
          <div className="absolute right-0 top-0 bottom-0 w-72 bg-white p-8" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-10">
              <span className="font-black text-slate-400 text-[10px] tracking-widest uppercase">Profile</span>
              <button onClick={() => setSidebarOpen(false)}><Menu className="w-6 h-6 text-slate-300" /></button>
            </div>
            <div className="space-y-4 opacity-40">
              <div className="flex items-center gap-4 text-sm font-bold p-3"><BookOpen className="w-4 h-4" /> SOP 手冊</div>
              <div className="flex items-center gap-4 text-sm font-bold p-3"><Zap className="w-4 h-4" /> HIS 系統碼</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
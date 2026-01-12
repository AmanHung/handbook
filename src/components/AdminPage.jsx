import { useState } from 'react';
import SOPManager from './SOPManager';
import VideoManager from './VideoManager'; // ✨ 引入新元件
import { Link } from 'react-router-dom';
import { BookText, Video } from 'lucide-react'; // 引入 icon

const AdminPage = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  
  // ✨ 新增狀態：目前管理的區塊
  const [managementTab, setManagementTab] = useState('sop'); // 'sop' or 'video'

  const handleLogin = () => {
    if (password === '123') {
      setIsAuthenticated(true);
    } else {
      alert('密碼錯誤，請重新輸入');
      setPassword('');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
        <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-sm">
          <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">系統管理區</h2>
          <div className="mb-4">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="請輸入管理密碼"
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            />
          </div>
          <button
            onClick={handleLogin}
            className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition duration-200 mb-4"
          >
            登入系統
          </button>
          <div className="text-center">
            <Link to="/" className="text-sm text-gray-500 hover:text-gray-700">
              ← 返回首頁
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-4 bg-white shadow-sm mb-6 flex justify-between items-center sticky top-0 z-50">
        <h1 className="text-lg sm:text-xl font-bold text-gray-800">藥局手冊後台</h1>
        <Link to="/" className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 text-xs font-bold">
          回前台
        </Link>
      </div>

      <div className="container mx-auto px-2 sm:px-4 max-w-4xl pb-10">
        {/* ✨ 管理功能切換按鈕 */}
        <div className="flex gap-2 mb-6 bg-slate-200 p-1 rounded-xl">
            <button 
                onClick={() => setManagementTab('sop')}
                className={`flex-1 py-3 rounded-lg flex items-center justify-center gap-2 font-bold text-sm transition-all ${managementTab === 'sop' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
                <BookText className="w-4 h-4"/> SOP 文章管理
            </button>
            <button 
                onClick={() => setManagementTab('video')}
                className={`flex-1 py-3 rounded-lg flex items-center justify-center gap-2 font-bold text-sm transition-all ${managementTab === 'video' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
                <Video className="w-4 h-4"/> 教學影片管理
            </button>
        </div>

        {/* 內容區塊 */}
        <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-gray-100 min-h-[500px]">
             {managementTab === 'sop' ? <SOPManager /> : <VideoManager />}
        </div>
      </div>
    </div>
  );
};

export default AdminPage;
// src/components/AdminPage.jsx
import { useState } from 'react';
import SOPManager from './SOPManager'; // 引入原本的管理元件
import { Link } from 'react-router-dom';

const AdminPage = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');

  // 簡易密碼驗證 (實務上建議配合後端驗證，目前先做前端簡易擋板)
  const handleLogin = () => {
    // 預設密碼設為 'admin123'，你可以隨時修改
    if (password === 'admin123') {
      setIsAuthenticated(true);
    } else {
      alert('密碼錯誤，請重新輸入');
      setPassword('');
    }
  };

  // 如果尚未驗證，顯示登入畫面
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

  // 驗證通過，顯示原本的 SOPManager
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-4 bg-white shadow-sm mb-6 flex justify-between items-center">
        <h1 className="text-xl font-bold text-gray-800">藥局手冊後台管理</h1>
        <Link to="/" className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-sm">
          回首頁
        </Link>
      </div>
      {/* 這裡渲染原本的 SOP 管理介面 */}
      <div className="container mx-auto px-4">
        <SOPManager />
      </div>
    </div>
  );
};

export default AdminPage;
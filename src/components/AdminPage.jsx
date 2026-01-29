import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  Users, 
  FileText, 
  Search, 
  UserCheck, 
  UserX,
  User
} from 'lucide-react';
import { db } from '../firebase';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import AdminUploader from './AdminUploader';

const AdminPage = ({ user }) => {
  const [activeTab, setActiveTab] = useState('users'); // users | upload
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // 讀取所有使用者資料
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, 'users'));
      const userList = [];
      querySnapshot.forEach((doc) => {
        userList.push({ uid: doc.id, ...doc.data() });
      });
      setUsers(userList);
    } catch (error) {
      console.error("Error fetching users:", error);
      alert("讀取使用者清單失敗，請確認您的權限。");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'users') {
      fetchUsers();
    }
  }, [activeTab]);

  // 修改使用者權限
  const handleRoleChange = async (targetUser, newRole) => {
    // 防止修改自己 (避免把自己降級後失去管理權限)
    if (targetUser.uid === user.uid) {
      alert("安全機制：您不能修改自己的管理員權限。");
      return;
    }

    const confirmMsg = `確定要將 ${targetUser.displayName} 的身分修改為「${newRole === 'teacher' ? '指導藥師' : 'PGY 學員'}」嗎？`;
    if (!window.confirm(confirmMsg)) return;

    try {
      const userRef = doc(db, 'users', targetUser.uid);
      await updateDoc(userRef, {
        role: newRole
      });
      
      // 更新本地列表
      setUsers(users.map(u => 
        u.uid === targetUser.uid ? { ...u, role: newRole } : u
      ));
      
      alert("權限更新成功！");
    } catch (error) {
      console.error("Error updating role:", error);
      alert("更新失敗：您可能沒有修改使用者的權限 (請檢查 Firestore Rules)。");
    }
  };

  // 篩選使用者
  const filteredUsers = users.filter(u => 
    u.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Shield className="w-6 h-6 text-indigo-600" />
            後台管理系統
          </h2>
          <p className="text-gray-500 text-sm mt-1">管理藥局人員權限與教學資源</p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
              activeTab === 'users' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <Users className="w-4 h-4" /> 人員權限
          </button>
          <button
            onClick={() => setActiveTab('upload')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
              activeTab === 'upload' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <FileText className="w-4 h-4" /> 資源上傳
          </button>
        </div>
      </div>

      {activeTab === 'users' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
          {/* Search Bar */}
          <div className="p-4 border-b border-gray-100 bg-gray-50">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="搜尋姓名或 Email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              />
            </div>
          </div>

          {/* Users Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-sm">
                  <th className="p-4 font-medium">使用者</th>
                  <th className="p-4 font-medium">Email</th>
                  <th className="p-4 font-medium">目前身分</th>
                  <th className="p-4 font-medium text-right">權限操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan="4" className="p-8 text-center text-gray-500">載入中...</td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="p-8 text-center text-gray-500">找不到符合的使用者</td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => (
                    <tr key={u.uid} className="hover:bg-gray-50/50 transition-colors">
                      <td className="p-4 flex items-center gap-3">
                        <img 
                          src={u.photoURL || `https://ui-avatars.com/api/?name=${u.displayName}`} 
                          alt={u.displayName}
                          className="w-10 h-10 rounded-full bg-gray-200" 
                        />
                        <span className="font-medium text-gray-800">{u.displayName}</span>
                      </td>
                      <td className="p-4 text-gray-600 text-sm">{u.email}</td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                          u.role === 'teacher' 
                            ? 'bg-emerald-100 text-emerald-700' 
                            : 'bg-indigo-100 text-indigo-700'
                        }`}>
                          {u.role === 'teacher' ? '指導藥師' : 'PGY 學員'}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        {u.uid !== user.uid && (
                          u.role === 'teacher' ? (
                            <button
                              onClick={() => handleRoleChange(u, 'student')}
                              className="text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1 ml-auto"
                            >
                              <UserX className="w-4 h-4" /> 降級為學員
                            </button>
                          ) : (
                            <button
                              onClick={() => handleRoleChange(u, 'teacher')}
                              className="text-emerald-600 hover:bg-emerald-50 px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1 ml-auto"
                            >
                              <UserCheck className="w-4 h-4" /> 升級為藥師
                            </button>
                          )
                        )}
                        {u.uid === user.uid && (
                          <span className="text-gray-400 text-sm italic">目前登入</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Upload Tab */}
      {activeTab === 'upload' && <AdminUploader />}
    </div>
  );
};

export default AdminPage;

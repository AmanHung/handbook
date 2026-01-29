import React, { useState, useEffect } from 'react';
import { 
  Shield, Users, FileText, Search, UserCheck, UserX, Trash2, Video, Database
} from 'lucide-react';
import { db } from '../firebase';
import { collection, getDocs, doc, updateDoc, deleteDoc, onSnapshot, query, orderBy } from 'firebase/firestore';
import AdminUploader from './AdminUploader';

const AdminPage = ({ user }) => {
  const [activeTab, setActiveTab] = useState('users'); // users | upload | resources
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // 資源管理狀態
  const [resources, setResources] = useState({ sops: [], videos: [] });

  // 1. 讀取使用者
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
      alert("讀取使用者清單失敗，請確認權限。");
    } finally {
      setLoading(false);
    }
  };

  // 2. 讀取資源 (SOP + Videos)
  useEffect(() => {
    if (activeTab === 'resources') {
      const unsubSOP = onSnapshot(query(collection(db, 'sop_articles')), (snap) => {
        setResources(prev => ({
          ...prev,
          sops: snap.docs.map(d => ({ id: d.id, ...d.data() }))
        }));
      });

      const unsubVideo = onSnapshot(query(collection(db, 'training_videos')), (snap) => {
        setResources(prev => ({
          ...prev,
          videos: snap.docs.map(d => ({ id: d.id, ...d.data() }))
        }));
      });

      return () => { unsubSOP(); unsubVideo(); };
    } else if (activeTab === 'users') {
      fetchUsers();
    }
  }, [activeTab]);

  // 修改使用者權限
  const handleRoleChange = async (targetUser, newRole) => {
    if (targetUser.uid === user.uid) {
      alert("安全機制：您不能修改自己的管理員權限。");
      return;
    }
    const confirmMsg = `確定要將 ${targetUser.displayName} 修改為「${newRole === 'teacher' ? '指導藥師' : 'PGY 學員'}」嗎？`;
    if (!window.confirm(confirmMsg)) return;

    try {
      await updateDoc(doc(db, 'users', targetUser.uid), { role: newRole });
      setUsers(users.map(u => u.uid === targetUser.uid ? { ...u, role: newRole } : u));
      alert("權限更新成功！");
    } catch (error) {
      console.error("Error updating role:", error);
      alert("更新失敗：" + error.message);
    }
  };

  // 刪除資源 (SOP/Video)
  const handleDeleteResource = async (collectionName, id, title) => {
    if (!window.confirm(`確定要刪除「${title}」嗎？此動作無法復原。`)) return;
    try {
      await deleteDoc(doc(db, collectionName, id));
      alert("刪除成功！");
    } catch (error) {
      console.error("Delete error:", error);
      alert("刪除失敗：" + error.message);
    }
  };

  // 篩選使用者
  const filteredUsers = users.filter(u => 
    u.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Admin Header */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Shield className="w-6 h-6 text-indigo-600" />
            後台管理系統
          </h2>
          <p className="text-gray-500 text-sm mt-1">管理權限、SOP 與教學資源</p>
        </div>

        <div className="flex bg-gray-100 p-1 rounded-lg">
          {[
            { id: 'users', label: '人員權限', icon: Users },
            { id: 'resources', label: '資源管理', icon: Database }, // 新增分頁
            { id: 'upload', label: '新增上傳', icon: FileText },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
                activeTab === tab.id 
                  ? 'bg-white text-indigo-600 shadow-sm' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <tab.icon className="w-4 h-4" /> {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab 1: Users */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-gray-50">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="搜尋姓名或 Email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-sm">
                  <th className="p-4">使用者</th>
                  <th className="p-4">身分</th>
                  <th className="p-4 text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredUsers.map((u) => (
                  <tr key={u.uid} className="hover:bg-gray-50">
                    <td className="p-4 flex items-center gap-3">
                      <img src={u.photoURL} alt="" className="w-10 h-10 rounded-full bg-gray-200" />
                      <div>
                        <div className="font-medium text-gray-800">{u.displayName}</div>
                        <div className="text-xs text-gray-500">{u.email}</div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                        u.role === 'teacher' ? 'bg-emerald-100 text-emerald-700' : 'bg-indigo-100 text-indigo-700'
                      }`}>
                        {u.role === 'teacher' ? '指導藥師' : 'PGY 學員'}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      {u.uid !== user.uid && (
                        <button
                          onClick={() => handleRoleChange(u, u.role === 'teacher' ? 'student' : 'teacher')}
                          className={`text-sm font-medium flex items-center gap-1 ml-auto px-3 py-1.5 rounded-md transition-colors ${
                            u.role === 'teacher' 
                              ? 'text-red-600 hover:bg-red-50' 
                              : 'text-emerald-600 hover:bg-emerald-50'
                          }`}
                        >
                          {u.role === 'teacher' ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                          {u.role === 'teacher' ? '降級' : '升級'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Resources Management (New!) */}
      {activeTab === 'resources' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* SOP List */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 bg-indigo-50 border-b border-indigo-100 flex justify-between items-center">
              <h3 className="font-bold text-indigo-800 flex items-center gap-2">
                <FileText className="w-5 h-5" /> SOP 文件列表
              </h3>
              <span className="text-xs bg-white px-2 py-1 rounded-full text-indigo-600 font-bold">{resources.sops.length}</span>
            </div>
            <div className="divide-y divide-gray-100 max-h-[500px] overflow-y-auto">
              {resources.sops.length === 0 ? (
                <div className="p-8 text-center text-gray-400">暫無資料</div>
              ) : resources.sops.map(sop => (
                <div key={sop.id} className="p-4 flex items-start justify-between hover:bg-gray-50 group">
                  <div>
                    <p className="font-medium text-gray-800 line-clamp-1">{sop.title}</p>
                    <p className="text-xs text-gray-500 mt-1">分類: {sop.category}</p>
                  </div>
                  <button 
                    onClick={() => handleDeleteResource('sop_articles', sop.id, sop.title)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                    title="刪除"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Video List */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 bg-pink-50 border-b border-pink-100 flex justify-between items-center">
              <h3 className="font-bold text-pink-800 flex items-center gap-2">
                <Video className="w-5 h-5" /> 教學影片列表
              </h3>
              <span className="text-xs bg-white px-2 py-1 rounded-full text-pink-600 font-bold">{resources.videos.length}</span>
            </div>
            <div className="divide-y divide-gray-100 max-h-[500px] overflow-y-auto">
              {resources.videos.length === 0 ? (
                <div className="p-8 text-center text-gray-400">暫無資料</div>
              ) : resources.videos.map(vid => (
                <div key={vid.id} className="p-4 flex items-start justify-between hover:bg-gray-50 group">
                  <div>
                    <p className="font-medium text-gray-800 line-clamp-1">{vid.title}</p>
                    <a href={vid.url} target="_blank" className="text-xs text-pink-500 hover:underline mt-1 block truncate max-w-[200px]">{vid.url}</a>
                  </div>
                  <button 
                    onClick={() => handleDeleteResource('training_videos', vid.id, vid.title)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                    title="刪除"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Upload */}
      {activeTab === 'upload' && <AdminUploader />}
    </div>
  );
};

export default AdminPage;

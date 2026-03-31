import { useState, useEffect } from 'react'
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  onAuthStateChanged 
} from 'firebase/auth'
import { auth, db } from './firebase'
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore'
import { 
  BookOpen, 
  LogOut, 
  User as UserIcon,
  Menu,
  X,
  Shield,
  Search,
  Calendar,
  Edit,
  Save,
  Users // [新增] 引入群組圖示供訪客使用
} from 'lucide-react'
import QuickLookup from './components/QuickLookup'
import VideoGallery from './components/VideoGallery'
import ShiftNavigator from './components/ShiftNavigator'
import PassportSection from './components/PassportSection'
import AdminPage from './components/AdminPage'
import './App.css'

function App() {
  const [user, setUser] = useState(null)
  const [userProfile, setUserProfile] = useState(null)
  const [userRole, setUserRole] = useState('student')
  const [activeTab, setActiveTab] = useState('lookup')
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [loading, setLoading] = useState(true)

  // 個人資料編輯 Modal 狀態
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [editForm, setEditForm] = useState({ displayName: '', arrivalDate: '' })

  // 輔助函式：判斷是否為教職人員 (包含 老師 與 管理員)
  const isTeacherOrAdmin = ['teacher', 'admin'].includes(userRole);

  // 登入處理 (Google 正式帳號)
  const handleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider()
      provider.setCustomParameters({ prompt: 'select_account' })
      const result = await signInWithPopup(auth, provider)
      console.log("登入成功:", result.user.email);
    } catch (error) {
      console.error("登入錯誤:", error);
      alert(`登入失敗: ${error.message}`);
    }
  }

  // ★★★ [新增] 訪客登入處理 ★★★
  const handleGuestLogin = () => {
    // 使用 localStorage 讓訪客重新整理也不會被登出
    localStorage.setItem('isGuestMode', 'true');
    
    setUser({
      uid: 'guest_user_12345',
      email: 'guest@pharmacy.local',
      displayName: '訪客 (Guest)',
      photoURL: 'https://ui-avatars.com/api/?name=Guest&background=E0E7FF&color=4F46E5&bold=true'
    });
    
    setUserProfile({
      displayName: '訪客 (Guest)',
      role: 'guest',
      arrivalDate: ''
    });
    
    setUserRole('guest');
    setActiveTab('lookup'); // 預設導向 SOP
  }

  // 登出處理
  const handleLogout = async () => {
    try {
      // 移除訪客狀態
      localStorage.removeItem('isGuestMode');
      
      // 如果不是訪客，才去呼叫 Firebase 登出
      if (userRole !== 'guest') {
        await signOut(auth);
      }
      
      setUser(null)
      setUserProfile(null)
      setUserRole('student')
      setActiveTab('lookup')
    } catch (error) {
      console.error("Logout failed:", error)
    }
  }

  // 定義超級管理員 Email
  const SUPER_ADMIN_EMAILS = [
    "obm0304@gmail.com", 
    "另一個管理員@gmail.com"
  ];

  // 監聽登入狀態並同步使用者資料
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setLoading(true)
      
      if (currentUser) {
        setUser(currentUser)
        
        const userRef = doc(db, 'users', currentUser.uid)
        try {
          const userSnap = await getDoc(userRef)
          
          let finalRole = 'student'; // 預設

          if (userSnap.exists()) {
            const data = userSnap.data();
            finalRole = data.role || 'student';
            
            // 強制鎖定超級管理員
            if (SUPER_ADMIN_EMAILS.includes(currentUser.email) && finalRole !== 'admin') {
               finalRole = 'admin';
               await updateDoc(userRef, { role: 'admin' });
               console.log("已自動提升為超級管理員權限");
            }

            setUserProfile(data);
          } else {
            // 新使用者註冊
            if (SUPER_ADMIN_EMAILS.includes(currentUser.email)) {
               finalRole = 'admin';
            }

            const newUserData = {
              email: currentUser.email,
              displayName: currentUser.displayName,
              photoURL: currentUser.photoURL,
              role: finalRole, 
              arrivalDate: '',
              createdAt: new Date().toISOString()
            };
            await setDoc(userRef, newUserData);
            setUserProfile(newUserData);
          }
          
          setUserRole(finalRole);

        } catch (error) {
          console.error("Error fetching user data:", error)
        }
      } else {
        // 檢查是否為「訪客模式」
        if (localStorage.getItem('isGuestMode') === 'true') {
          setUser({
            uid: 'guest_user_12345',
            email: 'guest@pharmacy.local',
            displayName: '訪客 (Guest)',
            photoURL: 'https://ui-avatars.com/api/?name=Guest&background=E0E7FF&color=4F46E5&bold=true'
          });
          setUserProfile({ displayName: '訪客 (Guest)', role: 'guest', arrivalDate: '' });
          setUserRole('guest');
        } else {
          setUser(null)
          setUserProfile(null)
          setUserRole('student')
        }
      }
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  // 開啟編輯視窗
  const handleOpenProfile = () => {
    setEditForm({
      displayName: userProfile?.displayName || user?.displayName || '',
      arrivalDate: userProfile?.arrivalDate || ''
    });
    setIsProfileOpen(true);
    setIsMenuOpen(false);
  }

  // 儲存個人資料
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!user || userRole === 'guest') return; // 阻擋訪客存檔

    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        displayName: editForm.displayName,
        arrivalDate: editForm.arrivalDate
      });
      setUserProfile(prev => ({ 
        ...prev, 
        displayName: editForm.displayName, 
        arrivalDate: editForm.arrivalDate 
      }));
      setIsProfileOpen(false);
      alert('個人資料已更新！');
    } catch (error) {
      console.error("更新失敗:", error);
      alert('更新失敗，請稍後再試');
    }
  }

  // 取得顯示的身分名稱
  const getRoleLabel = () => {
    if (userRole === 'admin') return '教學負責人';
    if (userRole === 'teacher') return '指導藥師';
    if (userRole === 'guest') return '訪客體驗'; // ★ 新增訪客標籤
    return 'PGY 學員';
  };

  // 取得身分對應的顏色
  const getRoleColorClass = () => {
    if (userRole === 'admin') return 'text-purple-600 font-bold'; 
    if (userRole === 'teacher') return 'text-emerald-600 font-bold'; 
    if (userRole === 'guest') return 'text-indigo-500 font-bold'; // ★ 新增訪客顏色
    return 'text-gray-500';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-500">正在載入藥師導航系統...</p>
        </div>
      </div>
    )
  }

  // 登入畫面
  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center border border-indigo-50">
          <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <BookOpen className="w-10 h-10 text-indigo-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">藥師新人導航系統</h1>
          <p className="text-gray-500 mb-8">
            歡迎使用新進人員訓練平台<br/>
            請登入以存取 SOP、排班表與學習護照
          </p>
          
          <div className="space-y-3">
            <button
              onClick={handleLogin}
              className="w-full flex items-center justify-center gap-3 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium py-3 px-4 rounded-xl transition-all shadow-sm hover:shadow-md"
            >
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-6 h-6" alt="Google" />
              使用 Google 帳號登入
            </button>
            
            {/* ★★★ [新增] 訪客登入按鈕 ★★★ */}
            <button
              onClick={handleGuestLogin}
              className="w-full flex items-center justify-center gap-3 bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 text-indigo-700 font-medium py-3 px-4 rounded-xl transition-all shadow-sm hover:shadow-md"
            >
              <Users className="w-5 h-5 text-indigo-600" />
              訪客體驗登入 (僅供瀏覽)
            </button>
          </div>
        </div>
        <p className="mt-8 text-sm text-gray-400">
          © {new Date().getFullYear()} Pharmacy Department Training System
        </p>
      </div>
    )
  }

  const displayUserName = userProfile?.displayName || user.displayName;

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm sticky top-0 z-50 border-b border-indigo-100">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="bg-indigo-600 p-2 rounded-lg">
                <BookOpen className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-800 hidden sm:block">藥師導航系統</h1>
                <h1 className="text-xl font-bold text-gray-800 sm:hidden">P.T.S</h1>
              </div>
            </div>

            <div className="hidden md:flex items-center gap-1">
              {/* ★★★ 電腦版導覽列控管 (動態隱藏訪客不該看的) ★★★ */}
              {[
                { id: 'lookup', label: 'SOP 速查', icon: Search },
                { id: 'video', label: '影音教學', icon: BookOpen },
                { id: 'shift', label: '排班表', icon: Calendar },
                // 若「不是訪客」，才顯示學習護照
                ...(userRole !== 'guest' ? [{ id: 'passport', label: '學習護照', icon: UserIcon }] : []),
                // 若為「教師或管理員」，才顯示後台
                ...(isTeacherOrAdmin ? [{ id: 'admin', label: '後台管理', icon: Shield }] : []),
              ].map(item => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${
                    activeTab === item.id 
                      ? 'bg-indigo-50 text-indigo-700' 
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  {item.icon && <item.icon className="w-4 h-4" />}
                  {item.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-3 pl-4 border-l border-gray-200">
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-700">{displayUserName}</p>
                  <p className={`text-xs ${getRoleColorClass()}`}>
                    {getRoleLabel()}
                  </p>
                </div>
                <div className="relative group cursor-pointer">
                    <img 
                      src={user.photoURL} 
                      alt={displayUserName} 
                      className={`w-9 h-9 rounded-full border-2 ${isTeacherOrAdmin ? 'border-emerald-400' : 'border-gray-200'}`}
                      onClick={() => setIsMenuOpen(!isMenuOpen)}
                    />
                </div>
              </div>

              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-md"
              >
                {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* 手機版 / 個人選單 Modal */}
        {isMenuOpen && (
          <div className="absolute right-0 top-16 w-full md:w-64 bg-white shadow-lg border-b border-gray-100 md:rounded-bl-xl z-50 animate-in slide-in-from-top-2">
            <div className="px-4 py-3 border-b border-gray-100 md:hidden">
                <div className="flex items-center gap-3">
                  <img src={user.photoURL} alt="Avatar" className="w-10 h-10 rounded-full" />
                  <div>
                    <p className="font-medium text-gray-800">{displayUserName}</p>
                    <p className={`text-xs ${getRoleColorClass()}`}>{getRoleLabel()}</p>
                  </div>
                </div>
            </div>

            <div className="p-2 space-y-1">
              <div className="md:hidden space-y-1 pb-2 mb-2 border-b border-gray-100">
                {/* ★★★ 手機版導覽列控管 (動態隱藏訪客不該看的) ★★★ */}
                {[
                    { id: 'lookup', label: 'SOP 速查' },
                    { id: 'video', label: '影音教學' },
                    { id: 'shift', label: '排班表' },
                    ...(userRole !== 'guest' ? [{ id: 'passport', label: '學習護照' }] : []),
                    ...(isTeacherOrAdmin ? [{ id: 'admin', label: '後台管理' }] : []),
                ].map(item => (
                    <button
                    key={item.id}
                    onClick={() => {
                        setActiveTab(item.id)
                        setIsMenuOpen(false)
                    }}
                    className={`block w-full text-left px-3 py-2 rounded-md text-base font-medium ${
                        activeTab === item.id 
                        ? 'bg-indigo-50 text-indigo-700' 
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                    >
                    {item.label}
                    </button>
                ))}
              </div>

              {/* 訪客不顯示個人資料設定 */}
              {userRole !== 'guest' && (
                <>
                  <button
                    onClick={handleOpenProfile}
                    className="w-full text-left px-3 py-2 text-gray-700 font-medium flex items-center gap-2 hover:bg-indigo-50 hover:text-indigo-600 rounded-md transition-colors"
                  >
                    <UserIcon className="w-4 h-4" /> 個人資料設定
                  </button>
                  <div className="border-t border-gray-100 my-1"></div>
                </>
              )}
              
              <button
                onClick={handleLogout}
                className="w-full text-left px-3 py-2 text-red-600 font-medium flex items-center gap-2 hover:bg-red-50 rounded-md transition-colors"
              >
                <LogOut className="w-4 h-4" /> 登出系統
              </button>
            </div>
          </div>
        )}
      </nav>

      {/* 編輯個人資料 Modal */}
      {isProfileOpen && userRole !== 'guest' && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setIsProfileOpen(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <Edit className="w-5 h-5 text-indigo-600" /> 編輯個人資料
              </h3>
              <button onClick={() => setIsProfileOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSaveProfile} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">顯示名稱 (姓名)</label>
                <input 
                  type="text" 
                  value={editForm.displayName}
                  onChange={e => setEditForm({...editForm, displayName: e.target.value})}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="請輸入您的真實姓名"
                />
              </div>

              {userRole === 'student' && (
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">到職日期</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
                    <input 
                      type="date" 
                      value={editForm.arrivalDate}
                      onChange={e => setEditForm({...editForm, arrivalDate: e.target.value})}
                      className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">此日期將用於計算您的學習進度</p>
                </div>
              )}

              <div className="pt-4 flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setIsProfileOpen(false)}
                  className="flex-1 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium"
                >
                  取消
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-2 text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg font-medium flex justify-center items-center gap-2"
                >
                  <Save className="w-4 h-4" /> 儲存變更
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 主畫面區域 */}
      <main className="max-w-7xl mx-auto px-0 sm:px-6 lg:px-8 py-0 sm:py-8">
        {activeTab === 'lookup' && <QuickLookup />}
        {activeTab === 'video' && <VideoGallery />}
        {activeTab === 'shift' && <ShiftNavigator />}
        
        {/* ★★★ 路由雙重鎖：即使訪客改網址或變數，也渲染不出學習護照 ★★★ */}
        {activeTab === 'passport' && userRole !== 'guest' && (
          <PassportSection 
            user={user} 
            userRole={userRole}
            userProfile={userProfile} 
          />
        )}
        {activeTab === 'admin' && isTeacherOrAdmin && <AdminPage user={user} />}
      </main>
    </div>
  )
}

export default App

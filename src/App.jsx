import { useState, useEffect } from 'react'
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  onAuthStateChanged 
} from 'firebase/auth'
import { auth, db } from './firebase' // 引入 db
import { doc, getDoc, setDoc } from 'firebase/firestore' // 引入 firestore 方法
import { 
  BookOpen, 
  LogOut, 
  User as UserIcon,
  Menu,
  X,
  Shield // 新增 Shield 圖示代表管理員/教師
} from 'lucide-react'
import QuickLookup from './components/QuickLookup'
import VideoGallery from './components/VideoGallery'
import ShiftNavigator from './components/ShiftNavigator'
import SOPManager from './components/SOPManager'
import PassportSection from './components/PassportSection'
import AdminPage from './components/AdminPage'
import './App.css'

function App() {
  const [user, setUser] = useState(null)
  const [userRole, setUserRole] = useState('student') // 新增角色狀態: 'student' | 'teacher'
  const [activeTab, setActiveTab] = useState('lookup')
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [loading, setLoading] = useState(true)

  // 登入處理
  const handleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider()
      const result = await signInWithPopup(auth, provider)
      console.log("登入成功，用戶資訊：", result.user);
      // 登入後會觸發 onAuthStateChanged，邏輯統一在那邊處理
    } catch (error) {
      console.error("登入詳細錯誤:", error);
      console.error("錯誤代碼:", error.code);
      console.error("錯誤訊息:", error.message);
      
      let errorMessage = "登入失敗，請稍後再試";
      if (error.code === 'auth/unauthorized-domain') {
        errorMessage = "登入失敗：目前的網域未獲授權。請在 Firebase Console > Authentication > Settings > Authorized domains 中新增目前的網域。";
      } else if (error.code === 'auth/popup-closed-by-user') {
        errorMessage = "登入已取消";
      } else if (error.code === 'auth/cancelled-popup-request') {
        errorMessage = "登入視窗被重複開啟";
      } else if (error.code === 'auth/operation-not-allowed') {
        errorMessage = "登入失敗：Google 登入功能尚未啟用。請前往 Firebase Console > Authentication > Sign-in method 啟用 Google 提供者。";
      }
      
      alert(`${errorMessage}\n\n詳細原因: ${error.message}`);
    }
  }

  // 登出處理
  const handleLogout = async () => {
    try {
      await signOut(auth)
      setUser(null)
      setUserRole('student')
      setActiveTab('lookup')
    } catch (error) {
      console.error("Logout failed:", error)
    }
  }

  // 監聽登入狀態並同步使用者資料
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setLoading(true)
      if (currentUser) {
        setUser(currentUser)
        
        // 同步使用者資料到 Firestore
        const userRef = doc(db, 'users', currentUser.uid)
        try {
          const userSnap = await getDoc(userRef)
          
          if (userSnap.exists()) {
            // 如果使用者已存在，讀取他的角色
            const userData = userSnap.data()
            setUserRole(userData.role || 'student')
          } else {
            // 如果是新使用者，建立基本資料，預設為 student
            await setDoc(userRef, {
              email: currentUser.email,
              displayName: currentUser.displayName,
              photoURL: currentUser.photoURL,
              role: 'student',
              createdAt: new Date().toISOString()
            })
            setUserRole('student')
          }
        } catch (error) {
          console.error("Error fetching user data:", error)
        }
      } else {
        setUser(null)
        setUserRole('student')
      }
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  // 開發測試用：切換角色的隱藏功能
  const toggleRole = async () => {
    if (!user) return
    const newRole = userRole === 'student' ? 'teacher' : 'student'
    setUserRole(newRole)
    // 同步更新到資料庫 (方便測試，實際產品不應該這樣隨意切換)
    try {
      await setDoc(doc(db, 'users', user.uid), { role: newRole }, { merge: true })
      alert(`已切換身分為：${newRole === 'teacher' ? '指導藥師' : '學員'}`)
    } catch (e) {
      console.error(e)
    }
  }

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
          <button
            onClick={handleLogin}
            className="w-full flex items-center justify-center gap-3 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium py-3 px-4 rounded-xl transition-all shadow-sm hover:shadow-md"
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-6 h-6" alt="Google" />
            使用 Google 帳號登入
          </button>
        </div>
        <p className="mt-8 text-sm text-gray-400">
          © {new Date().getFullYear()} Pharmacy Department Training System
        </p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-white shadow-sm sticky top-0 z-50 border-b border-indigo-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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

            {/* Desktop Menu */}
            <div className="hidden md:flex items-center gap-1">
              {[
                { id: 'lookup', label: 'SOP 速查', icon: BookOpen },
                { id: 'video', label: '影音教學', icon: BookOpen }, // 可以換個 icon
                { id: 'shift', label: '排班表', icon: BookOpen },   // 可以換個 icon
                { id: 'sop-manage', label: 'SOP 管理', icon: BookOpen },
                { id: 'passport', label: '學習護照', icon: UserIcon },
                { id: 'admin', label: '後台管理', icon: Shield },
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
                  {item.label}
                </button>
              ))}
            </div>

            {/* User Profile & Mobile Menu Button */}
            <div className="flex items-center gap-4">
              <div 
                className="hidden sm:flex items-center gap-3 pl-4 border-l border-gray-200 cursor-pointer"
                onClick={toggleRole} 
                title="點擊切換角色 (測試用)"
              >
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-700">{user.displayName}</p>
                  <p className={`text-xs ${userRole === 'teacher' ? 'text-emerald-600 font-bold' : 'text-gray-500'}`}>
                    {userRole === 'teacher' ? '指導藥師' : 'PGY 學員'}
                  </p>
                </div>
                <img 
                  src={user.photoURL} 
                  alt={user.displayName} 
                  className={`w-9 h-9 rounded-full border-2 ${userRole === 'teacher' ? 'border-emerald-400' : 'border-gray-200'}`}
                />
              </div>
              
              <button
                onClick={handleLogout}
                className="p-2 text-gray-400 hover:text-red-600 transition-colors hidden sm:block"
                title="登出"
              >
                <LogOut className="w-5 h-5" />
              </button>

              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="md:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-md"
              >
                {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden border-t border-gray-100 bg-white">
            <div className="px-2 pt-2 pb-3 space-y-1">
              {[
                { id: 'lookup', label: 'SOP 速查' },
                { id: 'video', label: '影音教學' },
                { id: 'shift', label: '排班表' },
                { id: 'sop-manage', label: 'SOP 管理' },
                { id: 'passport', label: '學習護照' },
                { id: 'admin', label: '後台管理' },
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
              <div className="border-t border-gray-100 mt-2 pt-2">
                <div className="flex items-center px-3 py-2 gap-3" onClick={toggleRole}>
                  <img src={user.photoURL} alt="Avatar" className="w-8 h-8 rounded-full" />
                  <div>
                    <p className="font-medium text-gray-700">{user.displayName}</p>
                    <p className="text-xs text-gray-500">{user.email}</p>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-3 py-2 text-red-600 font-medium flex items-center gap-2 hover:bg-red-50 rounded-md"
                >
                  <LogOut className="w-4 h-4" /> 登出系統
                </button>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'lookup' && <QuickLookup />}
        {activeTab === 'video' && <VideoGallery />}
        {activeTab === 'shift' && <ShiftNavigator />}
        {activeTab === 'sop-manage' && <SOPManager />}
        {activeTab === 'passport' && (
          <PassportSection 
            user={user} 
            userRole={userRole} // 傳遞目前使用者角色
          />
        )}
        {activeTab === 'admin' && <AdminPage user={user} />}
      </main>
    </div>
  )
}

export default App

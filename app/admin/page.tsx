'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface AuthUser {
  id: string
  username: string
  displayName: string
  loginTime: string
}

interface PatchNote {
  id: string
  version: string
  title: string
  description: string
  category: 'feature' | 'bugfix' | 'security' | 'improvement'
  is_major: boolean
  author_name: string
  created_at: string
  published: boolean
}

interface User {
  id: string
  username: string
  display_name: string
  created_at: string
  last_login: string
}

export default function AdminPage() {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null)
  const [supabase, setSupabase] = useState<any>(null)
  const [activeTab, setActiveTab] = useState<'dashboard' | 'patches' | 'users'>('dashboard')
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState<'success' | 'error' | ''>('')
  
  // 모달 상태
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showUserDeleteModal, setShowUserDeleteModal] = useState(false)
  const [selectedPatch, setSelectedPatch] = useState<PatchNote | null>(null)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [userDeletionInfo, setUserDeletionInfo] = useState({
    messageCount: 0,
    patchCount: 0,
    loading: true
  })
  
  // 통계 데이터
  const [stats, setStats] = useState({
    totalPatches: 0,
    totalUsers: 0,
    recentUsers: 0
  })
  
  // 패치노트 관련
  const [patchNotes, setPatchNotes] = useState<PatchNote[]>([])
  const [formData, setFormData] = useState({
    version: '',
    title: '',
    description: '',
    category: 'feature' as 'feature' | 'bugfix' | 'security' | 'improvement',
    is_major: false
  })
  
  // 편집 폼 데이터
  const [editFormData, setEditFormData] = useState({
    version: '',
    title: '',
    description: '',
    category: 'feature' as 'feature' | 'bugfix' | 'security' | 'improvement',
    is_major: false
  })
  
  // 사용자 관리 관련
  const [users, setUsers] = useState<User[]>([])
  
  const router = useRouter()

  // 관리자 권한 체크
  const ADMIN_USERNAMES = ['admin']

  const isAdmin = (user: AuthUser): boolean => {
    return ADMIN_USERNAMES.includes(user.username.toLowerCase())
  }

  // 인증 및 관리자 체크
  useEffect(() => {
    const checkAuth = () => {
      try {
        const userSession = sessionStorage.getItem('auth_user')
        if (!userSession) {
          router.push('/auth')
          return
        }

        const user = JSON.parse(userSession)
        
        if (!isAdmin(user)) {
          alert('관리자 권한이 필요합니다.')
          router.push('/')
          return
        }
        
        setAuthUser(user)
      } catch (error) {
        console.error('Auth check error:', error)
        router.push('/auth')
      }
    }

    checkAuth()
  }, [router])

  // Supabase 초기화
  useEffect(() => {
    const initSupabase = async () => {
      try {
        const { createClient } = await import('@supabase/supabase-js')
        const url = 'https://vdiqoxxaiiwgqvmtwxxy.supabase.co'
        const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZkaXFveHhhaWl3Z3F2bXR3eHh5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgxNzQ0ODAsImV4cCI6MjA2Mzc1MDQ4MH0.ZxwDHCADi5Q5jxJt6Isjik5j_AmalQE2wYH7SvPpHDA'
        
        const client = createClient(url, key)
        setSupabase(client)
      } catch (error) {
        console.error('Supabase 초기화 실패:', error)
      }
    }
    initSupabase()
  }, [])

  // 데이터 로드
  useEffect(() => {
    if (supabase && authUser) {
      loadDashboardData()
    }
  }, [supabase, authUser, activeTab])

  const loadDashboardData = async () => {
    if (!supabase) return

    try {
      const [patchesRes, usersRes] = await Promise.all([
        supabase.from('patch_notes').select('id').eq('published', true),
        supabase.from('users').select('id, created_at')
      ])

      const recentUsersRes = await supabase
        .from('users')
        .select('id')
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())

      setStats({
        totalPatches: patchesRes.data?.length || 0,
        totalUsers: usersRes.data?.length || 0,
        recentUsers: recentUsersRes.data?.length || 0
      })

      if (activeTab === 'patches') {
        loadPatchNotes()
      } else if (activeTab === 'users') {
        loadUsers()
      }
    } catch (error) {
      console.error('데이터 로드 에러:', error)
    }
  }

  const loadPatchNotes = async () => {
    if (!supabase) return

    const { data, error } = await supabase
      .from('patch_notes')
      .select('*')
      .order('created_at', { ascending: false })

    if (!error) {
      setPatchNotes(data || [])
    }
  }

  const loadUsers = async () => {
    if (!supabase) return

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false })

    if (!error) {
      setUsers(data || [])
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }))
    setMessage('')
  }

  const handleEditInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    setEditFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }))
  }

  const handleSubmitPatch = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!authUser || !supabase) return
    
    setIsLoading(true)
    setMessage('')

    try {
      const { error } = await supabase
        .from('patch_notes')
        .insert([{
          version: formData.version.trim(),
          title: formData.title.trim(),
          description: formData.description.trim(),
          category: formData.category,
          is_major: formData.is_major,
          author_id: authUser.id,
          author_name: authUser.displayName || authUser.username,
          published: true
        }])

      if (error) {
        setMessage('패치노트 생성 중 오류가 발생했습니다')
        setMessageType('error')
        return
      }

      setMessage(`패치노트 ${formData.version} 생성 완료!`)
      setMessageType('success')
      
      setFormData({
        version: '',
        title: '',
        description: '',
        category: 'feature',
        is_major: false
      })
      
      loadPatchNotes()
    } catch (error) {
      setMessage('패치노트 생성 중 오류가 발생했습니다')
      setMessageType('error')
    } finally {
      setIsLoading(false)
    }
  }

  // 패치노트 편집 모달 열기
  const handleEditPatch = (patch: PatchNote) => {
    setSelectedPatch(patch)
    setEditFormData({
      version: patch.version,
      title: patch.title,
      description: patch.description,
      category: patch.category,
      is_major: patch.is_major
    })
    setShowEditModal(true)
  }

  // 패치노트 수정
  const handleUpdatePatch = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedPatch || !supabase) return
    
    setIsLoading(true)

    try {
      const { error } = await supabase
        .from('patch_notes')
        .update({
          version: editFormData.version.trim(),
          title: editFormData.title.trim(),
          description: editFormData.description.trim(),
          category: editFormData.category,
          is_major: editFormData.is_major
        })
        .eq('id', selectedPatch.id)

      if (error) {
        setMessage('패치노트 수정 중 오류가 발생했습니다')
        setMessageType('error')
        return
      }

      setMessage(`패치노트 ${editFormData.version} 수정 완료!`)
      setMessageType('success')
      setShowEditModal(false)
      setSelectedPatch(null)
      loadPatchNotes()
    } catch (error) {
      setMessage('패치노트 수정 중 오류가 발생했습니다')
      setMessageType('error')
    } finally {
      setIsLoading(false)
    }
  }

  // 패치노트 삭제 확인 모달
  const handleDeletePatch = (patch: PatchNote) => {
    setSelectedPatch(patch)
    setShowDeleteModal(true)
  }

  // 패치노트 삭제 실행
  const confirmDeletePatch = async () => {
    if (!selectedPatch || !supabase) return
    
    setIsLoading(true)

    try {
      const { error } = await supabase
        .from('patch_notes')
        .delete()
        .eq('id', selectedPatch.id)

      if (error) {
        setMessage('패치노트 삭제 중 오류가 발생했습니다')
        setMessageType('error')
        return
      }

      setMessage(`패치노트 ${selectedPatch.version} 삭제 완료!`)
      setMessageType('success')
      setShowDeleteModal(false)
      setSelectedPatch(null)
      loadPatchNotes()
    } catch (error) {
      setMessage('패치노트 삭제 중 오류가 발생했습니다')
      setMessageType('error')
    } finally {
      setIsLoading(false)
    }
  }

  // 발행/비발행 토글
  const togglePublished = async (patch: PatchNote) => {
    if (!supabase) return

    try {
      const { error } = await supabase
        .from('patch_notes')
        .update({ published: !patch.published })
        .eq('id', patch.id)

      if (error) {
        setMessage('발행 상태 변경 중 오류가 발생했습니다')
        setMessageType('error')
        return
      }

      setMessage(`패치노트 ${patch.published ? '비발행' : '발행'} 처리 완료!`)
      setMessageType('success')
      loadPatchNotes()
    } catch (error) {
      setMessage('발행 상태 변경 중 오류가 발생했습니다')
      setMessageType('error')
    }
  }

  // 사용자 삭제 확인 모달 열기
  const handleDeleteUser = async (user: User) => {
    if (!supabase) return

    // admin 사용자는 삭제 불가
    if (user.username === 'admin') {
      setMessage('관리자 계정은 삭제할 수 없습니다')
      setMessageType('error')
      return
    }

    setSelectedUser(user)
    setUserDeletionInfo({ messageCount: 0, patchCount: 0, loading: true })
    setShowUserDeleteModal(true)

    try {
      // 사용자의 메시지 및 패치노트 수 조회
      const [messagesRes, patchesRes] = await Promise.all([
        supabase.from('messages').select('id').eq('user_id', user.id),
        supabase.from('patch_notes').select('id').eq('author_id', user.id)
      ])

      setUserDeletionInfo({
        messageCount: messagesRes.data?.length || 0,
        patchCount: patchesRes.data?.length || 0,
        loading: false
      })
    } catch (error) {
      console.error('사용자 정보 조회 에러:', error)
      setUserDeletionInfo({ messageCount: 0, patchCount: 0, loading: false })
    }
  }

  // 사용자 삭제 실행 (API 라우트 호출)
  const confirmDeleteUser = async () => {
    if (!selectedUser || !authUser) {
      console.log('❌ 필수 조건 미충족:', { selectedUser, authUser })
      return
    }
    
    console.log('🚀 API를 통한 사용자 삭제 시작:', selectedUser.id)
    console.log('🔑 관리자 정보:', authUser)
    setIsLoading(true)

    try {
      const requestBody = {
        userId: selectedUser.id,
        adminId: authUser.id
      }
      
      console.log('📦 요청 데이터:', requestBody)
      
      const response = await fetch('/api/admin/delete-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      const result = await response.json()
      
      console.log('📨 응답 상태:', response.status)
      console.log('📨 응답 데이터:', result)

      if (!response.ok) {
        throw new Error(result.error || '사용자 삭제 중 오류가 발생했습니다')
      }

      console.log('✅ API 호출 성공:', result)
      setMessage(result.message || `사용자 ${selectedUser.display_name} 및 관련 데이터 삭제 완료!`)
      setMessageType('success')
      setShowUserDeleteModal(false)
      setSelectedUser(null)
      
      // 데이터 새로고침
      loadUsers()
      loadDashboardData()
    } catch (error) {
      console.error('❌ API 호출 에러:', error)
      setMessage(`사용자 삭제 중 오류가 발생했습니다: ${error instanceof Error ? error.message : String(error)}`)
      setMessageType('error')
    } finally {
      setIsLoading(false)
    }
  }

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // 인증 로딩 중
  if (!authUser) {
    return (
      <div className="min-h-screen bg-black text-green-400 flex items-center justify-center p-4 crt-effect">
        <div className="retro-border p-6 md:p-8 w-full max-w-sm md:max-w-md relative">
          <div className="scanline"></div>
          <h1 className="text-xl md:text-2xl mb-6 text-center retro-glow typewriter">
            ADMIN_AUTH_CHECK...
          </h1>
          <div className="text-center">
            <div className="mt-4">
              <span className="inline-block w-2 h-2 bg-green-400 retro-pulse mr-1"></span>
              <span className="inline-block w-2 h-2 bg-green-400 retro-pulse mr-1 delay-100"></span>
              <span className="inline-block w-2 h-2 bg-green-400 retro-pulse delay-200"></span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-green-400 crt-effect">
      {/* Header */}
      <header className="border-b-2 border-green-400 p-3 md:p-4 retro-flicker">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-center space-y-2 sm:space-y-0">
          <h1 className="text-lg sm:text-xl md:text-2xl retro-glow typewriter">
            ADMIN_CONTROL_PANEL.EXE
          </h1>
          
          <div className="flex items-center space-x-4">
            <span className="text-xs text-red-400 retro-glow">
              🔑 ADMIN: {authUser.displayName}
            </span>
            
            <Link href="/" className="retro-button text-xs py-1 px-3">
              HOME
            </Link>
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <nav className="border-b border-gray-700 p-3 md:p-4 bg-gray-900 bg-opacity-50">
        <div className="max-w-6xl mx-auto flex space-x-1">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`retro-button text-xs py-2 px-4 ${
              activeTab === 'dashboard' ? 'bg-green-400 text-black' : ''
            }`}
          >
            📊 DASHBOARD
          </button>
          
          <button
            onClick={() => setActiveTab('patches')}
            className={`retro-button text-xs py-2 px-4 ${
              activeTab === 'patches' ? 'bg-purple-400 text-black' : ''
            }`}
          >
            📋 PATCH_NOTES
          </button>
          
          <button
            onClick={() => setActiveTab('users')}
            className={`retro-button text-xs py-2 px-4 ${
              activeTab === 'users' ? 'bg-blue-400 text-black' : ''
            }`}
          >
            👥 USER_MANAGEMENT
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto p-4 md:p-6 lg:p-8">
        
        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <section className="fade-in-up">
            <h2 className="text-2xl md:text-3xl mb-6 retro-glow text-center">
              &gt; SYSTEM_STATUS_
            </h2>
            
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="retro-border p-6 relative">
                <div className="scanline"></div>
                <h3 className="text-lg mb-2 text-purple-400">PATCH_NOTES</h3>
                <div className="text-3xl text-green-400 retro-glow mb-2">{stats.totalPatches}</div>
                <div className="text-xs text-gray-400">Total Updates</div>
              </div>
              
              <div className="retro-border p-6 relative">
                <div className="scanline"></div>
                <h3 className="text-lg mb-2 text-blue-400">TOTAL_USERS</h3>
                <div className="text-3xl text-green-400 retro-glow mb-2">{stats.totalUsers}</div>
                <div className="text-xs text-gray-400">Registered Users</div>
              </div>
              
              <div className="retro-border p-6 relative">
                <div className="scanline"></div>
                <h3 className="text-lg mb-2 text-yellow-400">NEW_USERS</h3>
                <div className="text-3xl text-green-400 retro-glow mb-2">{stats.recentUsers}</div>
                <div className="text-xs text-gray-400">Last 7 Days</div>
              </div>
            </div>
            
            {/* Quick Actions */}
            <div className="retro-border p-6">
              <h3 className="text-xl mb-4 text-green-400 retro-glow">&gt; QUICK_ACTIONS</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  onClick={() => setActiveTab('patches')}
                  className="retro-button p-4 text-left hover:bg-purple-400 hover:bg-opacity-10"
                >
                  <div className="text-purple-400 mb-2">📋 MANAGE_PATCHES</div>
                  <div className="text-xs text-gray-400">Create, Edit, Delete patch notes</div>
                </button>
                
                <button
                  onClick={() => setActiveTab('users')}
                  className="retro-button p-4 text-left hover:bg-blue-400 hover:bg-opacity-10"
                >
                  <div className="text-blue-400 mb-2">👥 MANAGE_USERS</div>
                  <div className="text-xs text-gray-400">View and delete users</div>
                </button>
              </div>
            </div>
          </section>
        )}

        {/* Patch Notes Tab */}
        {activeTab === 'patches' && (
          <section className="fade-in-up">
            <h2 className="text-2xl md:text-3xl mb-6 retro-glow text-center">
              &gt; PATCH_NOTE_MANAGEMENT_
            </h2>
            
            {/* Create Patch Form */}
            <div className="retro-border p-6 mb-8 relative">
              <div className="scanline"></div>
              <h3 className="text-xl mb-4 text-purple-400 retro-glow">&gt; CREATE_NEW_PATCH</h3>
              
              <form onSubmit={handleSubmitPatch} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs mb-2 text-green-400">&gt; VERSION:</label>
                    <input
                      type="text"
                      name="version"
                      value={formData.version}
                      onChange={handleInputChange}
                      className="retro-input w-full"
                      placeholder="v1.6.0"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs mb-2 text-green-400">&gt; CATEGORY:</label>
                    <select
                      name="category"
                      value={formData.category}
                      onChange={handleInputChange}
                      className="retro-input w-full"
                    >
                      <option value="feature">✨ FEATURE</option>
                      <option value="improvement">⚡ IMPROVEMENT</option>
                      <option value="security">🔒 SECURITY</option>
                      <option value="bugfix">🐛 BUGFIX</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs mb-2 text-green-400">&gt; TITLE:</label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    className="retro-input w-full"
                    placeholder="새로운 기능 설명"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs mb-2 text-green-400">&gt; DESCRIPTION:</label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    className="retro-input w-full h-24"
                    placeholder="• 변경사항 1&#10;• 변경사항 2"
                    required
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    name="is_major"
                    checked={formData.is_major}
                    onChange={handleInputChange}
                    className="w-4 h-4"
                  />
                  <label className="text-yellow-400 text-xs">⭐ MAJOR_RELEASE</label>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="retro-button w-full py-3"
                >
                  {isLoading ? 'CREATING...' : 'CREATE_PATCH_NOTE'}
                </button>
              </form>
            </div>
            
            {/* Message Display */}
            {message && (
              <div className={`retro-border p-3 mb-6 ${
                messageType === 'success' ? 'border-green-400 bg-green-400 bg-opacity-10' : 'border-red-400 bg-red-400 bg-opacity-10'
              }`}>
                <p className={`text-xs ${messageType === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                  &gt; {message}
                </p>
              </div>
            )}
            
            {/* Patch Notes List */}
            <div className="retro-border p-6">
              <h3 className="text-xl mb-4 text-purple-400 retro-glow">&gt; EXISTING_PATCHES ({patchNotes.length})</h3>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {patchNotes.map((patch) => (
                  <div key={patch.id} className="retro-border p-4 bg-gray-900 bg-opacity-30">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center space-x-3">
                        <span className="text-green-400 font-bold">{patch.version}</span>
                        <span className={`text-xs px-2 py-1 rounded ${
                          patch.published 
                            ? 'bg-green-400 bg-opacity-20 text-green-400' 
                            : 'bg-red-400 bg-opacity-20 text-red-400'
                        }`}>
                          {patch.published ? '발행됨' : '비발행'}
                        </span>
                        {patch.is_major && <span className="text-yellow-400 text-xs">⭐ MAJOR</span>}
                      </div>
                      <span className="text-xs text-gray-500">{formatDate(patch.created_at)}</span>
                    </div>
                    
                    <div className="text-white text-sm mb-3">{patch.title}</div>
                    
                    <div className="flex justify-between items-center">
                      <div className="text-xs text-gray-400">
                        {patch.category.toUpperCase()} | by {patch.author_name}
                      </div>
                      
                      <div className="flex space-x-2">
                        <button
                          onClick={() => togglePublished(patch)}
                          className={`retro-button text-xs py-1 px-2 ${
                            patch.published 
                              ? 'border-red-400 text-red-400 hover:bg-red-400' 
                              : 'border-green-400 text-green-400 hover:bg-green-400'
                          } hover:text-black`}
                        >
                          {patch.published ? '비발행' : '발행'}
                        </button>
                        
                        <button
                          onClick={() => handleEditPatch(patch)}
                          className="retro-button text-xs py-1 px-2 border-blue-400 text-blue-400 hover:bg-blue-400 hover:text-black"
                        >
                          수정
                        </button>
                        
                        <button
                          onClick={() => handleDeletePatch(patch)}
                          className="retro-button text-xs py-1 px-2 border-red-400 text-red-400 hover:bg-red-400 hover:text-black"
                        >
                          삭제
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <section className="fade-in-up">
            <h2 className="text-2xl md:text-3xl mb-6 retro-glow text-center">
              &gt; USER_MANAGEMENT_
            </h2>
            
            {/* Message Display */}
            {message && (
              <div className={`retro-border p-3 mb-6 ${
                messageType === 'success' ? 'border-green-400 bg-green-400 bg-opacity-10' : 'border-red-400 bg-red-400 bg-opacity-10'
              }`}>
                <p className={`text-xs ${messageType === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                  &gt; {message}
                </p>
              </div>
            )}
            
            <div className="retro-border p-6">
              <h3 className="text-xl mb-4 text-blue-400 retro-glow">&gt; REGISTERED_USERS ({users.length})</h3>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {users.map((user) => (
                  <div key={user.id} className="retro-border p-4 bg-gray-900 bg-opacity-30">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <span className="text-green-400 font-bold">{user.display_name}</span>
                        <span className="text-gray-500 ml-2">@{user.username}</span>
                        {user.username === 'admin' && <span className="text-red-400 ml-2">👑 ADMIN</span>}
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-gray-500">가입: {formatDate(user.created_at)}</span>
                        {user.username !== 'admin' && (
                          <button
                            onClick={() => handleDeleteUser(user)}
                            className="retro-button text-xs py-1 px-2 border-red-400 text-red-400 hover:bg-red-400 hover:text-black"
                          >
                            삭제
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="text-xs text-gray-400">
                      최근 로그인: {formatDate(user.last_login)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>

      {/* Edit Modal */}
      {showEditModal && selectedPatch && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="retro-border p-6 w-full max-w-2xl bg-black relative">
            <div className="scanline"></div>
            <h3 className="text-xl mb-4 text-purple-400 retro-glow">&gt; EDIT_PATCH_NOTE</h3>
            
            <form onSubmit={handleUpdatePatch} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs mb-2 text-green-400">&gt; VERSION:</label>
                  <input
                    type="text"
                    name="version"
                    value={editFormData.version}
                    onChange={handleEditInputChange}
                    className="retro-input w-full"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-xs mb-2 text-green-400">&gt; CATEGORY:</label>
                  <select
                    name="category"
                    value={editFormData.category}
                    onChange={handleEditInputChange}
                    className="retro-input w-full"
                  >
                    <option value="feature">✨ FEATURE</option>
                    <option value="improvement">⚡ IMPROVEMENT</option>
                    <option value="security">🔒 SECURITY</option>
                    <option value="bugfix">🐛 BUGFIX</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs mb-2 text-green-400">&gt; TITLE:</label>
                <input
                  type="text"
                  name="title"
                  value={editFormData.title}
                  onChange={handleEditInputChange}
                  className="retro-input w-full"
                  required
                />
              </div>

              <div>
                <label className="block text-xs mb-2 text-green-400">&gt; DESCRIPTION:</label>
                <textarea
                  name="description"
                  value={editFormData.description}
                  onChange={handleEditInputChange}
                  className="retro-input w-full h-32"
                  required
                />
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  name="is_major"
                  checked={editFormData.is_major}
                  onChange={handleEditInputChange}
                  className="w-4 h-4"
                />
                <label className="text-yellow-400 text-xs">⭐ MAJOR_RELEASE</label>
              </div>

              <div className="flex space-x-3">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="retro-button flex-1 py-3"
                >
                  {isLoading ? 'UPDATING...' : 'UPDATE_PATCH'}
                </button>
                
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false)
                    setSelectedPatch(null)
                  }}
                  className="retro-button flex-1 py-3 border-red-400 text-red-400 hover:bg-red-400 hover:text-black"
                >
                  CANCEL
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Patch Confirmation Modal */}
      {showDeleteModal && selectedPatch && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="retro-border p-6 w-full max-w-md bg-black relative">
            <div className="scanline"></div>
            <h3 className="text-xl mb-4 text-red-400 retro-glow">&gt; DELETE_PATCH_CONFIRMATION</h3>
            
            <div className="mb-6">
              <p className="text-white mb-2">패치노트를 삭제하시겠습니까?</p>
              <div className="retro-border p-3 bg-red-400 bg-opacity-10">
                <p className="text-red-400 text-sm font-bold">{selectedPatch.version}: {selectedPatch.title}</p>
              </div>
              <p className="text-xs text-gray-400 mt-2">⚠️ 이 작업은 되돌릴 수 없습니다!</p>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={confirmDeletePatch}
                disabled={isLoading}
                className="retro-button flex-1 py-3 border-red-400 text-red-400 hover:bg-red-400 hover:text-black"
              >
                {isLoading ? 'DELETING...' : 'DELETE'}
              </button>
              
              <button
                onClick={() => {
                  setShowDeleteModal(false)
                  setSelectedPatch(null)
                }}
                className="retro-button flex-1 py-3"
              >
                CANCEL
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete User Confirmation Modal */}
      {showUserDeleteModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="retro-border p-6 w-full max-w-lg bg-black relative">
            <div className="scanline"></div>
            <h3 className="text-xl mb-4 text-red-400 retro-glow">&gt; DELETE_USER_CONFIRMATION</h3>
            
            <div className="mb-6">
              <p className="text-white mb-3">사용자와 모든 관련 데이터를 삭제하시겠습니까?</p>
              
              <div className="retro-border p-3 bg-red-400 bg-opacity-10 mb-4">
                <p className="text-red-400 text-sm font-bold">
                  {selectedUser.display_name} (@{selectedUser.username})
                </p>
              </div>

              {userDeletionInfo.loading ? (
                <div className="text-center py-4">
                  <span className="text-gray-400 text-sm">관련 데이터 조회 중...</span>
                  <div className="mt-2">
                    <span className="inline-block w-2 h-2 bg-green-400 retro-pulse mr-1"></span>
                    <span className="inline-block w-2 h-2 bg-green-400 retro-pulse mr-1 delay-100"></span>
                    <span className="inline-block w-2 h-2 bg-green-400 retro-pulse delay-200"></span>
                  </div>
                </div>
              ) : (
                <div className="retro-border p-3 bg-yellow-400 bg-opacity-10 mb-4">
                  <p className="text-yellow-400 text-xs mb-2">⚠️ 함께 삭제될 데이터:</p>
                  <div className="text-white text-xs space-y-1">
                    <p>• 메시지: {userDeletionInfo.messageCount}개</p>
                    <p>• 패치노트: {userDeletionInfo.patchCount}개</p>
                    <p>• 사용자 계정: 1개</p>
                  </div>
                </div>
              )}

              <p className="text-xs text-gray-400">⚠️ 이 작업은 되돌릴 수 없습니다!</p>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={confirmDeleteUser}
                disabled={isLoading || userDeletionInfo.loading}
                className="retro-button flex-1 py-3 border-red-400 text-red-400 hover:bg-red-400 hover:text-black"
              >
                {isLoading ? 'DELETING...' : 'DELETE_ALL'}
              </button>
              
              <button
                onClick={() => {
                  setShowUserDeleteModal(false)
                  setSelectedUser(null)
                }}
                className="retro-button flex-1 py-3"
              >
                CANCEL
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-px h-px bg-red-400 shadow-[0_0_20px_10px_rgba(255,0,0,0.3)] animate-pulse"></div>
        <div className="hidden md:block absolute top-3/4 right-1/3 w-px h-px bg-purple-400 shadow-[0_0_15px_8px_rgba(128,0,255,0.3)] animate-pulse delay-1000"></div>
        <div className="absolute bottom-1/4 right-1/4 w-px h-px bg-yellow-400 shadow-[0_0_25px_12px_rgba(255,255,0,0.3)] animate-pulse delay-2000"></div>
      </div>
    </div>
  )
}

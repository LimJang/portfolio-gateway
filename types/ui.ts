// 폼 및 UI 상태 관련 타입 정의
export interface FormState {
  isLoading: boolean
  error: string
  message: string
  messageType: 'success' | 'error' | ''
}

export interface PatchFormData {
  version: string
  title: string
  description: string
  category: 'feature' | 'bugfix' | 'security' | 'improvement'
  is_major: boolean
}

export interface AdminStats {
  totalPatches: number
  totalUsers: number
  recentUsers: number
}

export interface UserDeletionInfo {
  messageCount: number
  patchCount: number
  loading: boolean
}

export type ActiveTab = 'dashboard' | 'patches' | 'users'
export type CategoryFilter = 'all' | 'feature' | 'bugfix' | 'security' | 'improvement'

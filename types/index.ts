// 모든 타입 통합 export
export * from './auth'
export * from './database'
export * from './ui'

// 공통 유틸리티 타입
export type ApiResponse<T = any> = {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export type LoadingState = 'idle' | 'loading' | 'success' | 'error'

export type Theme = 'retro' | 'dark' | 'light'

export type UserRole = 'user' | 'admin'

// 인증 관련 타입 정의
export interface AuthUser {
  id: string
  username: string
  displayName: string
  loginTime: string
}

export interface LoginFormData {
  username: string
  displayName: string
  password: string
  confirmPassword: string
}

export interface AuthState {
  user: AuthUser | null
  isLoading: boolean
  error: string
}

// 데이터베이스 관련 타입 정의
export interface Message {
  id: string
  content: string
  username: string
  display_name: string
  created_at: string
  user_id?: string
}

export interface User {
  id: string
  username: string
  display_name: string
  created_at: string
  last_login: string
}

export interface PatchNote {
  id: string
  version: string
  title: string
  description: string
  category: 'feature' | 'bugfix' | 'security' | 'improvement'
  is_major: boolean
  author_name: string
  author_id: string
  created_at: string
  published: boolean
}

export interface LatestPatch {
  version: string
  title: string
  category: string
  is_major: boolean
  created_at: string
}

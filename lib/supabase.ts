import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
})

// 타입 정의
export interface Message {
  id: string
  content: string
  username: string
  created_at: string
  user_id?: string
}

export interface User {
  id: string
  username: string
  created_at: string
}

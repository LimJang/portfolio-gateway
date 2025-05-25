import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabaseUrl = 'https://vdiqoxxaiiwgqvmtwxxy.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

// 환경변수 체크를 런타임으로 이동
export async function POST(request: NextRequest) {
  try {
    // 환경변수 체크
    if (!supabaseServiceKey) {
      console.error('SUPABASE_SERVICE_ROLE_KEY 환경변수가 설정되지 않았습니다.')
      return NextResponse.json(
        { error: 'Server configuration error. Please contact administrator.' },
        { status: 500 }
      )
    }

    // 서비스 키로 클라이언트 생성 (RLS 우회 가능)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    const { userId, adminId } = await request.json()

    if (!userId || !adminId) {
      return NextResponse.json(
        { error: '필수 파라미터가 누락되었습니다' },
        { status: 400 }
      )
    }

    console.log('🔧 서버사이드 사용자 삭제 시작:', { userId, adminId })

    // 관리자 권한 확인
    const { data: adminUser, error: adminError } = await supabaseAdmin
      .from('users')
      .select('username')
      .eq('id', adminId)
      .single()

    if (adminError || !adminUser || adminUser.username !== 'admin') {
      return NextResponse.json(
        { error: '관리자 권한이 필요합니다' },
        { status: 403 }
      )
    }

    // admin 사용자 삭제 방지
    const { data: targetUser, error: targetError } = await supabaseAdmin
      .from('users')
      .select('username')
      .eq('id', userId)
      .single()

    if (targetError) {
      return NextResponse.json(
        { error: '사용자를 찾을 수 없습니다' },
        { status: 404 }
      )
    }

    if (targetUser.username === 'admin') {
      return NextResponse.json(
        { error: '관리자 계정은 삭제할 수 없습니다' },
        { status: 400 }
      )
    }

    // 1. 메시지 삭제
    console.log('1️⃣ 서버: 메시지 삭제 시작...')
    const { error: messagesError } = await supabaseAdmin
      .from('messages')
      .delete()
      .eq('user_id', userId)

    if (messagesError) {
      console.error('메시지 삭제 실패:', messagesError)
      throw new Error('메시지 삭제 실패: ' + messagesError.message)
    }

    // 2. 패치노트 삭제
    console.log('2️⃣ 서버: 패치노트 삭제 시작...')
    const { error: patchesError } = await supabaseAdmin
      .from('patch_notes')
      .delete()
      .eq('author_id', userId)

    if (patchesError) {
      console.error('패치노트 삭제 실패:', patchesError)
      throw new Error('패치노트 삭제 실패: ' + patchesError.message)
    }

    // 3. 사용자 삭제
    console.log('3️⃣ 서버: 사용자 삭제 시작...')
    const { error: userError } = await supabaseAdmin
      .from('users')
      .delete()
      .eq('id', userId)

    if (userError) {
      console.error('사용자 삭제 실패:', userError)
      throw new Error('사용자 삭제 실패: ' + userError.message)
    }

    console.log('✅ 서버: 사용자 삭제 완료!')

    return NextResponse.json({
      success: true,
      message: '사용자 및 관련 데이터가 성공적으로 삭제되었습니다'
    })

  } catch (error) {
    console.error('❌ 서버: 사용자 삭제 에러:', error)
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다',
        details: String(error)
      },
      { status: 500 }
    )
  }
}

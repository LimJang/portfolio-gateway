import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabaseUrl = 'https://vdiqoxxaiiwgqvmtwxxy.supabase.co'
// 환경변수 우선, 없으면 하드코딩된 키 사용 (임시)
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZkaXFveHhhaWl3Z3F2bXR3eHh5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODE3NDQ4MCwiZXhwIjoyMDYzNzUwNDgwfQ.DAnYAU_5pC5kxJYP1Sq5fDvDn1W6fZGQq4RHy-OsM0s'

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 환경변수 체크:', { 
      hasEnvKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      keyLength: supabaseServiceKey?.length 
    })

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

    // 관리자 권한 확인 - 디버깅 추가
    console.log('🔍 관리자 권한 검증 시작...')
    const { data: adminUser, error: adminError } = await supabaseAdmin
      .from('users')
      .select('id, username, display_name')
      .eq('id', adminId)
      .single()

    console.log('관리자 조회 결과:', { adminUser, adminError })

    if (adminError) {
      console.error('관리자 조회 에러:', adminError)
      return NextResponse.json(
        { error: '관리자 정보를 조회할 수 없습니다: ' + adminError.message },
        { status: 403 }
      )
    }

    if (!adminUser) {
      console.error('관리자 사용자를 찾을 수 없음')
      return NextResponse.json(
        { error: '관리자 사용자를 찾을 수 없습니다' },
        { status: 403 }
      )
    }

    // username이 admin인지 확인 (대소문자 무시)
    const isAdminUser = adminUser.username?.toLowerCase() === 'admin'
    console.log('관리자 권한 체크:', { 
      username: adminUser.username, 
      isAdmin: isAdminUser 
    })

    if (!isAdminUser) {
      console.error('관리자 권한 없음:', adminUser.username)
      return NextResponse.json(
        { error: `권한이 없습니다. 현재 사용자: ${adminUser.username}` },
        { status: 403 }
      )
    }

    // 삭제 대상 사용자 확인
    console.log('🔍 삭제 대상 사용자 확인...')
    const { data: targetUser, error: targetError } = await supabaseAdmin
      .from('users')
      .select('id, username, display_name')
      .eq('id', userId)
      .single()

    console.log('삭제 대상 조회 결과:', { targetUser, targetError })

    if (targetError) {
      return NextResponse.json(
        { error: '삭제 대상 사용자를 찾을 수 없습니다: ' + targetError.message },
        { status: 404 }
      )
    }

    if (targetUser.username === 'admin') {
      return NextResponse.json(
        { error: '관리자 계정은 삭제할 수 없습니다' },
        { status: 400 }
      )
    }

    console.log('✅ 권한 검증 완료. 삭제 프로세스 시작...')

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
      message: `사용자 ${targetUser.display_name} (${targetUser.username}) 및 관련 데이터가 성공적으로 삭제되었습니다`
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

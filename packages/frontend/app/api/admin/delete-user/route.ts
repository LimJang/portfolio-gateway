import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabaseUrl = 'https://vdiqoxxaiiwgqvmtwxxy.supabase.co'

export async function POST(request: NextRequest) {
  console.log('🚀 API 라우트 시작')
  
  try {
    // 환경변수 상태 체크
    const envServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    console.log('🔧 환경변수 상태:', { 
      hasEnvKey: !!envServiceKey,
      envKeyLength: envServiceKey?.length,
      nodeEnv: process.env.NODE_ENV
    })

    // 환경변수가 없는 경우 명확한 에러 메시지
    if (!envServiceKey) {
      console.error('❌ SUPABASE_SERVICE_ROLE_KEY 환경변수가 설정되지 않았습니다')
      return NextResponse.json(
        { 
          error: 'Supabase Service Role Key가 설정되지 않았습니다',
          details: 'SUPABASE_SERVICE_ROLE_KEY 환경변수를 Vercel에서 설정해주세요'
        },
        { status: 500 }
      )
    }

    // 요청 바디 파싱
    console.log('📦 요청 바디 파싱 시작')
    const body = await request.json()
    console.log('📦 파싱된 요청 데이터:', body)
    
    const { userId, adminId } = body

    if (!userId || !adminId) {
      console.log('❌ 필수 파라미터 누락:', { userId: !!userId, adminId: !!adminId })
      return NextResponse.json(
        { error: '필수 파라미터가 누락되었습니다' },
        { status: 400 }
      )
    }

    console.log('✅ 필수 파라미터 확인 완료:', { userId, adminId })

    // 서비스 키로 클라이언트 생성 (RLS 우회 가능)
    console.log('🔧 Supabase 클라이언트 생성 시작')
    const supabaseAdmin = createClient(supabaseUrl, envServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
    console.log('✅ Supabase 클라이언트 생성 완료')

    console.log('🔧 서버사이드 사용자 삭제 시작:', { userId, adminId })

    // 관리자 권한 확인 - 디버깅 추가
    console.log('🔍 관리자 권한 검증 시작...')
    
    const adminQuery = supabaseAdmin
      .from('users')
      .select('id, username, display_name')
      .eq('id', adminId)
      .single()
    
    console.log('🔍 관리자 쿼리 생성 완료, 실행 중...')
    
    const { data: adminUser, error: adminError } = await adminQuery

    console.log('🔍 관리자 조회 완료')
    console.log('관리자 조회 결과 - data:', adminUser)
    console.log('관리자 조회 결과 - error:', adminError)

    if (adminError) {
      console.error('❌ 관리자 조회 에러 상세:', {
        message: adminError.message,
        details: adminError.details,
        hint: adminError.hint,
        code: adminError.code
      })
      return NextResponse.json(
        { 
          error: '관리자 정보를 조회할 수 없습니다',
          details: adminError.message,
          code: adminError.code 
        },
        { status: 403 }
      )
    }

    if (!adminUser) {
      console.error('❌ 관리자 사용자를 찾을 수 없음 - adminUser is null/undefined')
      return NextResponse.json(
        { error: '관리자 사용자를 찾을 수 없습니다' },
        { status: 403 }
      )
    }

    console.log('✅ 관리자 사용자 찾음:', {
      id: adminUser.id,
      username: adminUser.username,
      display_name: adminUser.display_name
    })

    // username이 admin인지 확인 (대소문자 무시)
    const isAdminUser = adminUser.username?.toLowerCase() === 'admin'
    console.log('🔍 관리자 권한 체크:', { 
      username: adminUser.username,
      username_lower: adminUser.username?.toLowerCase(),
      isAdmin: isAdminUser 
    })

    if (!isAdminUser) {
      console.error('❌ 관리자 권한 없음:', {
        expected: 'admin',
        actual: adminUser.username,
        actualLower: adminUser.username?.toLowerCase()
      })
      return NextResponse.json(
        { error: `권한이 없습니다. 현재 사용자: ${adminUser.username}` },
        { status: 403 }
      )
    }

    console.log('✅ 관리자 권한 검증 완료!')

    // 삭제 대상 사용자 확인
    console.log('🔍 삭제 대상 사용자 확인...')
    const { data: targetUser, error: targetError } = await supabaseAdmin
      .from('users')
      .select('id, username, display_name')
      .eq('id', userId)
      .single()

    console.log('삭제 대상 조회 결과:', { targetUser, targetError })

    if (targetError) {
      console.error('❌ 삭제 대상 조회 에러:', targetError)
      return NextResponse.json(
        { error: '삭제 대상 사용자를 찾을 수 없습니다: ' + targetError.message },
        { status: 404 }
      )
    }

    if (targetUser.username === 'admin') {
      console.error('❌ 관리자 계정 삭제 시도 차단')
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
      console.error('❌ 메시지 삭제 실패:', messagesError)
      throw new Error('메시지 삭제 실패: ' + messagesError.message)
    }
    console.log('✅ 메시지 삭제 완료')

    // 2. 패치노트 삭제
    console.log('2️⃣ 서버: 패치노트 삭제 시작...')
    const { error: patchesError } = await supabaseAdmin
      .from('patch_notes')
      .delete()
      .eq('author_id', userId)

    if (patchesError) {
      console.error('❌ 패치노트 삭제 실패:', patchesError)
      throw new Error('패치노트 삭제 실패: ' + patchesError.message)
    }
    console.log('✅ 패치노트 삭제 완료')

    // 3. 사용자 삭제
    console.log('3️⃣ 서버: 사용자 삭제 시작...')
    const { error: userError } = await supabaseAdmin
      .from('users')
      .delete()
      .eq('id', userId)

    if (userError) {
      console.error('❌ 사용자 삭제 실패:', userError)
      throw new Error('사용자 삭제 실패: ' + userError.message)
    }
    console.log('✅ 사용자 삭제 완료')

    console.log('🎉 서버: 전체 사용자 삭제 완료!')

    return NextResponse.json({
      success: true,
      message: `사용자 ${targetUser.display_name} (${targetUser.username}) 및 관련 데이터가 성공적으로 삭제되었습니다`
    })

  } catch (error) {
    console.error('❌ 서버: 사용자 삭제 에러 상세:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      error: error
    })
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다',
        details: String(error)
      },
      { status: 500 }
    )
  }
}

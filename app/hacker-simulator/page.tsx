// Terminal Hacker Simulator - Main Game Page
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Terminal from './components/Terminal'
import { MISSIONS, createMissionController, MissionController } from '../../lib/game/MissionController'
import { TypingStats } from '../../lib/game/TypingEngine'

interface AuthUser {
  id: string
  username: string
  displayName: string
  loginTime: string
}

type GameState = 'menu' | 'mission-select' | 'mission-briefing' | 'playing' | 'mission-complete'

export default function HackerSimulatorPage() {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [gameState, setGameState] = useState<GameState>('menu')
  const [currentMissionId, setCurrentMissionId] = useState<number | null>(null)
  const [missionController, setMissionController] = useState<MissionController | null>(null)
  const [playerStats, setPlayerStats] = useState({
    totalScore: 0,
    bestWPM: 0,
    averageAccuracy: 0,
    completedMissions: 0
  })
  
  const router = useRouter()

  // 관리자 체크
  const isAdmin = (user: AuthUser): boolean => {
    return user.username.toLowerCase() === 'admin'
  }

  // 인증 체크 및 게임 초기화
  useEffect(() => {
    const checkAuth = () => {
      try {
        const userSession = sessionStorage.getItem('auth_user')
        if (!userSession) {
          router.push('/auth')
          return
        }

        const user = JSON.parse(userSession)
        setAuthUser(user)
        
        // 게임 컨트롤러 초기화
        const controller = createMissionController()
        setMissionController(controller)
        
        // 플레이어 통계 로드
        const overallProgress = controller.getOverallProgress()
        setPlayerStats({
          totalScore: overallProgress.totalScore,
          bestWPM: overallProgress.averageWPM,
          averageAccuracy: 0, // TODO: 구현 필요
          completedMissions: overallProgress.completedMissions
        })
        
      } catch (error) {
        console.error('Auth check error:', error)
        router.push('/auth')
      } finally {
        setIsLoading(false)
      }
    }

    checkAuth()
  }, [router])

  const handleLogout = () => {
    sessionStorage.removeItem('auth_user')
    router.push('/auth')
  }

  const handleStartMission = (missionId: number) => {
    if (!missionController) return
    
    const mission = missionController.startMission(missionId)
    if (mission) {
      setCurrentMissionId(missionId)
      setGameState('mission-briefing')
    }
  }

  const handleStartPlaying = () => {
    setGameState('playing')
  }

  const handleMissionComplete = (stats: TypingStats) => {
    if (!missionController || !currentMissionId) return
    
    const mission = MISSIONS.find(m => m.id === currentMissionId)
    if (!mission) return
    
    const timeElapsed = (stats.currentTime.getTime() - stats.startTime.getTime()) / 1000
    const result = missionController.calculateScore(mission, stats.wpm, stats.accuracy, timeElapsed)
    
    missionController.completeMission(currentMissionId, result)
    
    // 통계 업데이트
    const overallProgress = missionController.getOverallProgress()
    setPlayerStats({
      totalScore: overallProgress.totalScore,
      bestWPM: Math.max(playerStats.bestWPM, stats.wpm),
      averageAccuracy: stats.accuracy,
      completedMissions: overallProgress.completedMissions
    })
    
    setGameState('mission-complete')
  }

  const handleBackToMenu = () => {
    setGameState('menu')
    setCurrentMissionId(null)
  }

  const handleNextMission = () => {
    if (currentMissionId && currentMissionId < MISSIONS.length) {
      handleStartMission(currentMissionId + 1)
    } else {
      handleBackToMenu()
    }
  }

  // 인증 로딩 중
  if (isLoading) {
    return (
      <div className="min-h-screen bg-black text-green-400 flex items-center justify-center p-4 crt-effect font-mono">
        <div className="retro-border p-6 md:p-8 w-full max-w-sm md:max-w-md relative">
          <div className="scanline"></div>
          <h1 className="text-xl md:text-2xl mb-6 text-center retro-glow typewriter font-bold">
            AUTHENTICATING...
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

  if (!authUser) return null

  const currentMission = currentMissionId ? MISSIONS.find(m => m.id === currentMissionId) : null

  return (
    <div className="min-h-screen bg-black text-green-400 flex flex-col crt-effect font-mono">
      {/* Header */}
      <header className="border-b-2 border-green-400 p-3 md:p-4 retro-flicker">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-center space-y-2 sm:space-y-0">
          <h1 className="text-lg sm:text-xl retro-glow font-bold">
            TERMINAL HACKER SIMULATOR
          </h1>
          
          <div className="flex items-center space-x-2 md:space-x-4 flex-wrap">
            <div className="flex items-center space-x-2">
              <span className="text-xs md:text-sm font-bold">USER:</span>
              <span className="text-orange-400 font-bold">{authUser.displayName}</span>
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-xs md:text-sm font-bold">SCORE:</span>
              <span className="text-yellow-400 font-bold">{playerStats.totalScore}</span>
            </div>

            {isAdmin(authUser) && (
              <Link href="/admin" className="retro-button text-xs py-1 px-3 border-red-400 text-red-400 hover:bg-red-400 hover:text-black font-bold">
                🔑 ADMIN
              </Link>
            )}
            
            <Link href="/" className="retro-button text-xs py-1 px-3 font-bold">
              HOME
            </Link>
            
            <button 
              onClick={handleLogout}
              className="retro-button text-xs py-1 px-3 border-red-400 text-red-400 hover:bg-red-400 hover:text-black font-bold"
            >
              LOGOUT
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8">
        <div className="max-w-6xl mx-auto">
          
          {/* Menu State */}
          {gameState === 'menu' && (
            <div className="retro-border p-8 bg-black bg-opacity-80">
              <div className="text-center mb-8">
                <h2 className="text-3xl md:text-4xl retro-glow font-bold mb-4">
                  HACKER SIMULATOR
                </h2>
                <p className="text-lg text-gray-400 font-bold">
                  Test your typing skills in this terminal hacking game
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {/* Game Options */}
                <div className="space-y-4">
                  <button 
                    onClick={() => setGameState('mission-select')}
                    className="w-full retro-button p-4 text-left border-green-400 text-green-400 hover:bg-green-400 hover:text-black font-bold"
                  >
                    <div className="text-lg mb-2">🎮 START NEW MISSION</div>
                    <div className="text-sm text-gray-400">Begin hacking simulation</div>
                  </button>

                  <button className="w-full retro-button p-4 text-left border-blue-400 text-blue-400 hover:bg-blue-400 hover:text-black font-bold">
                    <div className="text-lg mb-2">🏆 LEADERBOARD</div>
                    <div className="text-sm text-gray-400">View top hackers</div>
                  </button>

                  <button 
                    onClick={() => handleStartMission(1)}
                    className="w-full retro-button p-4 text-left border-yellow-400 text-yellow-400 hover:bg-yellow-400 hover:text-black font-bold"
                  >
                    <div className="text-lg mb-2">💪 QUICK START</div>
                    <div className="text-sm text-gray-400">Jump into Mission 1</div>
                  </button>
                </div>

                {/* Stats Panel */}
                <div className="retro-border p-6 bg-gray-900 bg-opacity-50">
                  <h3 className="text-xl font-bold mb-4 text-green-400">&gt; PLAYER STATS</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="font-bold">TOTAL SCORE:</span>
                      <span className="text-yellow-400 font-bold">{playerStats.totalScore} PTS</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-bold">BEST WPM:</span>
                      <span className="text-blue-400 font-bold">{playerStats.bestWPM} WPM</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-bold">ACCURACY:</span>
                      <span className="text-green-400 font-bold">{playerStats.averageAccuracy}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-bold">MISSIONS:</span>
                      <span className="text-red-400 font-bold">{playerStats.completedMissions}/5</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Mission Select State */}
          {gameState === 'mission-select' && (
            <div className="retro-border p-8 bg-black bg-opacity-80">
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl md:text-3xl retro-glow font-bold">
                  SELECT MISSION
                </h2>
                <button 
                  onClick={handleBackToMenu}
                  className="retro-button border-red-400 text-red-400 hover:bg-red-400 hover:text-black px-4 py-2"
                >
                  BACK
                </button>
              </div>

              <div className="grid gap-4">
                {MISSIONS.map((mission) => {
                  const progress = missionController?.getProgress(mission.id)
                  const isUnlocked = missionController?.isNextMissionUnlocked(mission.id)
                  
                  return (
                    <div 
                      key={mission.id}
                      className={`retro-border p-4 ${isUnlocked ? 'bg-gray-900 bg-opacity-50' : 'bg-gray-800 bg-opacity-30'}`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center space-x-4 mb-2">
                            <h3 className="text-lg font-bold text-green-400">
                              Mission {mission.id}: {mission.title}
                            </h3>
                            <span className={`text-xs px-2 py-1 rounded border ${
                              mission.difficulty === 'easy' ? 'border-green-400 text-green-400' :
                              mission.difficulty === 'medium' ? 'border-yellow-400 text-yellow-400' :
                              'border-red-400 text-red-400'
                            }`}>
                              {mission.difficulty.toUpperCase()}
                            </span>
                          </div>
                          <p className="text-sm text-gray-400 mb-2">{mission.description}</p>
                          <div className="text-xs text-gray-500">
                            Target: {mission.targetWPM} WPM | Time Limit: {Math.floor(mission.timeLimit / 60)}:{(mission.timeLimit % 60).toString().padStart(2, '0')}
                          </div>
                          {progress?.isCompleted && (
                            <div className="text-xs text-blue-400 mt-1">
                              ✅ Completed | Best: {progress.bestWPM} WPM | Score: {progress.bestScore}
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => handleStartMission(mission.id)}
                          disabled={!isUnlocked}
                          className={`retro-button px-4 py-2 ${
                            isUnlocked 
                              ? 'border-green-400 text-green-400 hover:bg-green-400 hover:text-black'
                              : 'border-gray-600 text-gray-600 cursor-not-allowed'
                          }`}
                        >
                          {isUnlocked ? 'START' : 'LOCKED'}
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Mission Briefing State */}
          {gameState === 'mission-briefing' && currentMission && (
            <div className="retro-border p-8 bg-black bg-opacity-80">
              <div className="text-center mb-8">
                <h2 className="text-2xl md:text-3xl retro-glow font-bold mb-4">
                  {currentMission.title}
                </h2>
                <p className="text-lg text-gray-400">{currentMission.description}</p>
              </div>

              <div className="retro-border p-6 bg-gray-900 bg-opacity-50 mb-8">
                <div className="space-y-2">
                  {currentMission.storyText.map((line, index) => (
                    <div key={index} className="text-green-400 font-bold">
                      {line}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-center space-x-4">
                <button 
                  onClick={handleBackToMenu}
                  className="retro-button border-red-400 text-red-400 hover:bg-red-400 hover:text-black px-6 py-3"
                >
                  ABORT MISSION
                </button>
                <button 
                  onClick={handleStartPlaying}
                  className="retro-button border-green-400 text-green-400 hover:bg-green-400 hover:text-black px-6 py-3"
                >
                  BEGIN INFILTRATION
                </button>
              </div>
            </div>
          )}

          {/* Playing State */}
          {gameState === 'playing' && currentMission && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-green-400">
                  Mission {currentMission.id}: {currentMission.title}
                </h2>
                <button 
                  onClick={handleBackToMenu}
                  className="retro-button border-red-400 text-red-400 hover:bg-red-400 hover:text-black px-4 py-2"
                >
                  ABORT
                </button>
              </div>
              
              <Terminal
                targetText={currentMission.commands.join('\n')}
                onComplete={handleMissionComplete}
                onKeystroke={(key, isCorrect) => {
                  // TODO: 사운드 효과 추가
                }}
                isActive={true}
                className="w-full"
              />
            </div>
          )}

          {/* Mission Complete State */}
          {gameState === 'mission-complete' && currentMission && (
            <div className="retro-border p-8 bg-black bg-opacity-80 text-center">
              <div className="text-4xl mb-4">🎉</div>
              <h2 className="text-2xl md:text-3xl retro-glow font-bold mb-4">
                MISSION COMPLETE
              </h2>
              <p className="text-lg text-green-400 mb-8">
                {currentMission.completionMessage}
              </p>

              <div className="flex justify-center space-x-4">
                <button 
                  onClick={handleBackToMenu}
                  className="retro-button border-blue-400 text-blue-400 hover:bg-blue-400 hover:text-black px-6 py-3"
                >
                  MAIN MENU
                </button>
                {currentMissionId && currentMissionId < MISSIONS.length && (
                  <button 
                    onClick={handleNextMission}
                    className="retro-button border-green-400 text-green-400 hover:bg-green-400 hover:text-black px-6 py-3"
                  >
                    NEXT MISSION
                  </button>
                )}
              </div>
            </div>
          )}

        </div>
      </main>

      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 right-1/3 w-px h-px bg-green-400 shadow-[0_0_20px_10px_rgba(0,255,65,0.2)] animate-pulse"></div>
        <div className="hidden md:block absolute bottom-1/4 left-1/3 w-px h-px bg-red-400 shadow-[0_0_15px_8px_rgba(255,0,65,0.2)] animate-pulse delay-1000"></div>
        <div className="absolute top-1/3 left-1/4 w-px h-px bg-blue-400 shadow-[0_0_25px_12px_rgba(0,100,255,0.2)] animate-pulse delay-2000"></div>
      </div>
    </div>
  )
}

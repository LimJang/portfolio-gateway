// Custom React Hook for Typing Logic
import { useState, useEffect, useCallback, useRef } from 'react'
import { TypingEngine, TypingStats, createTypingEngine } from '../game/TypingEngine'

interface UseTypingOptions {
  targetText: string
  onComplete?: (stats: TypingStats) => void
  onKeystroke?: (key: string, isCorrect: boolean) => void
  onStatsUpdate?: (stats: TypingStats) => void
}

interface UseTypingReturn {
  // Current state
  userInput: string
  stats: TypingStats
  isActive: boolean
  isComplete: boolean
  
  // Actions
  startTyping: () => void
  stopTyping: () => void
  resetTyping: () => void
  handleInput: (input: string) => void
  
  // Progress info
  progress: number
  currentChar: string
  nextChar: string
  errors: string[]
}

export const useTyping = ({
  targetText,
  onComplete,
  onKeystroke,
  onStatsUpdate
}: UseTypingOptions): UseTypingReturn => {
  const [userInput, setUserInput] = useState('')
  const [stats, setStats] = useState<TypingStats>({
    wpm: 0,
    accuracy: 100,
    correctChars: 0,
    totalChars: 0,
    errors: 0,
    startTime: new Date(),
    currentTime: new Date()
  })
  const [isActive, setIsActive] = useState(false)
  const [isComplete, setIsComplete] = useState(false)
  const [errors, setErrors] = useState<string[]>([])

  const typingEngineRef = useRef<TypingEngine | null>(null)
  const statsIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Initialize typing engine when target text changes
  useEffect(() => {
    if (targetText) {
      typingEngineRef.current = createTypingEngine(targetText)
      resetTyping()
    }
  }, [targetText])

  // Start typing session
  const startTyping = useCallback(() => {
    if (!typingEngineRef.current) return
    
    typingEngineRef.current.startSession()
    setIsActive(true)
    setIsComplete(false)
    
    // Start stats update interval
    statsIntervalRef.current = setInterval(() => {
      if (typingEngineRef.current) {
        const currentStats = typingEngineRef.current.getStats(userInput)
        setStats(currentStats)
        onStatsUpdate?.(currentStats)
      }
    }, 100) // Update every 100ms for smooth progress
  }, [userInput, onStatsUpdate])

  // Stop typing session
  const stopTyping = useCallback(() => {
    setIsActive(false)
    if (statsIntervalRef.current) {
      clearInterval(statsIntervalRef.current)
      statsIntervalRef.current = null
    }
  }, [])

  // Reset typing session
  const resetTyping = useCallback(() => {
    setUserInput('')
    setIsActive(false)
    setIsComplete(false)
    setErrors([])
    setStats({
      wpm: 0,
      accuracy: 100,
      correctChars: 0,
      totalChars: 0,
      errors: 0,
      startTime: new Date(),
      currentTime: new Date()
    })
    
    if (statsIntervalRef.current) {
      clearInterval(statsIntervalRef.current)
      statsIntervalRef.current = null
    }
    
    if (typingEngineRef.current) {
      typingEngineRef.current.reset()
    }
  }, [])

  // Handle user input
  const handleInput = useCallback((input: string) => {
    if (!typingEngineRef.current || !isActive) return

    // Start session if this is the first character
    if (userInput.length === 0 && input.length === 1) {
      typingEngineRef.current.startSession()
    }

    setUserInput(input)

    // Record keystroke if input increased
    if (input.length > userInput.length) {
      const newChar = input[input.length - 1]
      const expectedChar = targetText[input.length - 1]
      const keystroke = typingEngineRef.current.recordKeystroke(newChar, expectedChar)
      
      onKeystroke?.(newChar, keystroke.isCorrect)
    }

    // Validate input and update errors
    const validation = typingEngineRef.current.validateInput(input)
    setErrors(validation.errors)

    // Check completion
    if (typingEngineRef.current.isComplete(input)) {
      setIsComplete(true)
      stopTyping()
      
      const finalStats = typingEngineRef.current.getStats(input)
      setStats(finalStats)
      onComplete?.(finalStats)
    }
  }, [isActive, userInput, targetText, onKeystroke, onComplete, stopTyping])

  // Calculate progress percentage
  const progress = typingEngineRef.current 
    ? typingEngineRef.current.getProgress(userInput)
    : 0

  // Get current character being typed
  const currentChar = userInput.length < targetText.length 
    ? targetText[userInput.length] 
    : ''

  // Get next character to be typed
  const nextChar = userInput.length + 1 < targetText.length 
    ? targetText[userInput.length + 1] 
    : ''

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (statsIntervalRef.current) {
        clearInterval(statsIntervalRef.current)
      }
    }
  }, [])

  return {
    // State
    userInput,
    stats,
    isActive,
    isComplete,
    
    // Actions
    startTyping,
    stopTyping,
    resetTyping,
    handleInput,
    
    // Progress
    progress,
    currentChar,
    nextChar,
    errors
  }
}

// Hook for managing multiple typing sessions (useful for mission progression)
interface UseTypingSessionOptions {
  onSessionComplete?: (sessionStats: TypingStats) => void
  onSessionStart?: () => void
}

export const useTypingSession = ({ 
  onSessionComplete, 
  onSessionStart 
}: UseTypingSessionOptions = {}) => {
  const [sessions, setSessions] = useState<TypingStats[]>([])
  const [currentSession, setCurrentSession] = useState<number>(0)
  const [isSessionActive, setIsSessionActive] = useState(false)

  const startSession = useCallback(() => {
    setIsSessionActive(true)
    onSessionStart?.()
  }, [onSessionStart])

  const completeSession = useCallback((stats: TypingStats) => {
    setSessions(prev => [...prev, stats])
    setCurrentSession(prev => prev + 1)
    setIsSessionActive(false)
    onSessionComplete?.(stats)
  }, [onSessionComplete])

  const resetSessions = useCallback(() => {
    setSessions([])
    setCurrentSession(0)
    setIsSessionActive(false)
  }, [])

  // Calculate aggregate statistics
  const aggregateStats = {
    totalSessions: sessions.length,
    averageWPM: sessions.length > 0 
      ? Math.round(sessions.reduce((sum, s) => sum + s.wpm, 0) / sessions.length)
      : 0,
    averageAccuracy: sessions.length > 0 
      ? Math.round(sessions.reduce((sum, s) => sum + s.accuracy, 0) / sessions.length)
      : 0,
    totalChars: sessions.reduce((sum, s) => sum + s.totalChars, 0),
    totalErrors: sessions.reduce((sum, s) => sum + s.errors, 0),
    bestWPM: sessions.length > 0 ? Math.max(...sessions.map(s => s.wpm)) : 0
  }

  return {
    sessions,
    currentSession,
    isSessionActive,
    aggregateStats,
    startSession,
    completeSession,
    resetSessions
  }
}

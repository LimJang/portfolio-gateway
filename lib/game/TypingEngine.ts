// Core Typing Engine - Real-time WPM and Accuracy Calculation
export interface TypingStats {
  wpm: number
  accuracy: number
  correctChars: number
  totalChars: number
  errors: number
  startTime: Date
  currentTime: Date
}

export interface KeystrokeEvent {
  key: string
  timestamp: number
  isCorrect: boolean
  expectedChar: string
  actualChar: string
}

export interface ValidationResult {
  isCorrect: boolean
  completedChars: number
  currentPosition: number
  errors: string[]
}

export class TypingEngine {
  private startTime: Date | null = null
  private keystrokes: KeystrokeEvent[] = []
  private currentPosition: number = 0
  private errorCount: number = 0

  constructor(private targetText: string) {}

  // Start typing session
  startSession(): void {
    this.startTime = new Date()
    this.keystrokes = []
    this.currentPosition = 0
    this.errorCount = 0
  }

  // 문자 정규화 - 모든 종류의 스페이스를 일반 스페이스로 변환
  private normalizeChar(char: string): string {
    // 다양한 스페이스 문자들을 일반 스페이스로 통일
    if (char === ' ' || char === '\u00A0' || char === '\u2000' || char === '\u2001' || 
        char === '\u2002' || char === '\u2003' || char === '\u2004' || char === '\u2005' || 
        char === '\u2006' || char === '\u2007' || char === '\u2008' || char === '\u2009' || 
        char === '\u200A' || char === '\u200B' || char === '\u3000') {
      return ' '
    }
    return char
  }

  // 개선된 문자 비교 함수
  private compareChars(actual: string, expected: string): boolean {
    const normalizedActual = this.normalizeChar(actual)
    const normalizedExpected = this.normalizeChar(expected)
    
    // 정규화된 문자로 정확한 비교
    return normalizedActual === normalizedExpected
  }

  // Validate user input against target text
  validateInput(userInput: string): ValidationResult {
    const result: ValidationResult = {
      isCorrect: true,
      completedChars: 0,
      currentPosition: this.currentPosition,
      errors: []
    }

    // 현재 에러 카운트 초기화
    let currentErrors = 0

    // Check each character with improved logic
    for (let i = 0; i < userInput.length && i < this.targetText.length; i++) {
      const expectedChar = this.targetText[i]
      const actualChar = userInput[i]
      
      if (this.compareChars(actualChar, expectedChar)) {
        result.completedChars++
      } else {
        result.isCorrect = false
        currentErrors++
        
        const expectedDisplay = expectedChar === ' ' ? '[SPACE]' : 
                               expectedChar === '\n' ? '[ENTER]' : 
                               expectedChar === '\t' ? '[TAB]' : expectedChar
        const actualDisplay = actualChar === ' ' ? '[SPACE]' : 
                              actualChar === '\n' ? '[ENTER]' : 
                              actualChar === '\t' ? '[TAB]' : actualChar
        
        result.errors.push(`Position ${i + 1}: expected '${expectedDisplay}', got '${actualDisplay}'`)
      }
    }

    // 입력이 타겟보다 긴 경우 처리
    if (userInput.length > this.targetText.length) {
      result.isCorrect = false
      currentErrors++
      result.errors.push(`Input too long: expected ${this.targetText.length} characters, got ${userInput.length}`)
    }

    this.currentPosition = userInput.length
    this.errorCount = currentErrors
    return result
  }

  // Record keystroke for analysis
  recordKeystroke(key: string, expectedChar: string): KeystrokeEvent {
    const keystroke: KeystrokeEvent = {
      key,
      timestamp: Date.now(),
      isCorrect: this.compareChars(key, expectedChar),
      expectedChar,
      actualChar: key
    }

    this.keystrokes.push(keystroke)
    return keystroke
  }

  // Calculate Words Per Minute
  calculateWPM(correctChars: number): number {
    if (!this.startTime) return 0
    
    const timeElapsed = (Date.now() - this.startTime.getTime()) / 1000 / 60 // in minutes
    if (timeElapsed === 0) return 0
    
    const wordsTyped = correctChars / 5 // Standard: 5 characters = 1 word
    return Math.round(wordsTyped / timeElapsed)
  }

  // Calculate typing accuracy percentage
  calculateAccuracy(correctChars: number, totalChars: number): number {
    if (totalChars === 0) return 100
    return Math.round((correctChars / totalChars) * 100)
  }

  // Get current typing statistics
  getStats(userInput: string): TypingStats {
    const validation = this.validateInput(userInput)
    const currentTime = new Date()
    const wpm = this.calculateWPM(validation.completedChars)
    const accuracy = this.calculateAccuracy(validation.completedChars, userInput.length)

    return {
      wpm,
      accuracy,
      correctChars: validation.completedChars,
      totalChars: userInput.length,
      errors: this.errorCount,
      startTime: this.startTime || currentTime,
      currentTime
    }
  }

  // Check if typing is complete
  isComplete(userInput: string): boolean {
    if (userInput.length < this.targetText.length) return false
    
    // 모든 문자가 정확히 일치하는지 확인
    for (let i = 0; i < this.targetText.length; i++) {
      if (!this.compareChars(userInput[i] || '', this.targetText[i])) {
        return false
      }
    }
    
    return userInput.length === this.targetText.length
  }

  // Get completion percentage
  getProgress(userInput: string): number {
    if (this.targetText.length === 0) return 100
    return Math.min(100, (userInput.length / this.targetText.length) * 100)
  }

  // Reset engine for new session
  reset(newTargetText?: string): void {
    if (newTargetText) {
      this.targetText = newTargetText
    }
    this.startTime = null
    this.keystrokes = []
    this.currentPosition = 0
    this.errorCount = 0
  }

  // Get next expected character
  getNextChar(userInput: string): string {
    if (userInput.length >= this.targetText.length) return ''
    return this.targetText[userInput.length]
  }

  // Get detailed keystroke analysis
  getKeystrokeAnalysis(): {
    totalKeystrokes: number
    correctKeystrokes: number
    errorRate: number
    averageSpeed: number
  } {
    const totalKeystrokes = this.keystrokes.length
    const correctKeystrokes = this.keystrokes.filter(k => k.isCorrect).length
    const errorRate = totalKeystrokes > 0 ? ((totalKeystrokes - correctKeystrokes) / totalKeystrokes) * 100 : 0

    // Calculate average time between keystrokes
    let totalTime = 0
    for (let i = 1; i < this.keystrokes.length; i++) {
      totalTime += this.keystrokes[i].timestamp - this.keystrokes[i - 1].timestamp
    }
    const averageSpeed = this.keystrokes.length > 1 ? totalTime / (this.keystrokes.length - 1) : 0

    return {
      totalKeystrokes,
      correctKeystrokes,
      errorRate: Math.round(errorRate),
      averageSpeed: Math.round(averageSpeed)
    }
  }

  // 디버깅용 함수 - 향상된 정보 제공
  public debugCurrentState(userInput: string): {
    targetLength: number
    inputLength: number
    currentPosition: number
    nextExpectedChar: string
    lastInputChar: string
    isMatching: boolean
    normalizedComparison: {
      expected: string
      actual: string
      matches: boolean
    }
  } {
    const nextExpectedChar = this.getNextChar(userInput)
    const lastInputChar = userInput.length > 0 ? userInput[userInput.length - 1] : ''
    
    const normalizedExpected = this.normalizeChar(nextExpectedChar)
    const normalizedActual = this.normalizeChar(lastInputChar)
    
    return {
      targetLength: this.targetText.length,
      inputLength: userInput.length,
      currentPosition: this.currentPosition,
      nextExpectedChar: nextExpectedChar === ' ' ? '[SPACE]' : nextExpectedChar,
      lastInputChar: lastInputChar === ' ' ? '[SPACE]' : lastInputChar,
      isMatching: userInput.length > 0 ? this.compareChars(lastInputChar, this.targetText[userInput.length - 1]) : true,
      normalizedComparison: {
        expected: normalizedExpected === ' ' ? '[SPACE]' : normalizedExpected,
        actual: normalizedActual === ' ' ? '[SPACE]' : normalizedActual,
        matches: normalizedExpected === normalizedActual
      }
    }
  }
}

// Utility functions for typing engine
export const createTypingEngine = (targetText: string): TypingEngine => {
  return new TypingEngine(targetText)
}

export const formatWPM = (wpm: number): string => {
  return `${wpm} WPM`
}

export const formatAccuracy = (accuracy: number): string => {
  return `${accuracy}%`
}

export const formatTime = (startTime: Date, currentTime: Date): string => {
  const diffMs = currentTime.getTime() - startTime.getTime()
  const seconds = Math.floor(diffMs / 1000)
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
}
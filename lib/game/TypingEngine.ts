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
  private errors: number = 0

  constructor(private targetText: string) {}

  // Start typing session
  startSession(): void {
    this.startTime = new Date()
    this.keystrokes = []
    this.currentPosition = 0
    this.errors = 0
  }

  // Validate user input against target text
  validateInput(userInput: string): ValidationResult {
    const result: ValidationResult = {
      isCorrect: true,
      completedChars: 0,
      currentPosition: this.currentPosition,
      errors: []
    }

    // Check each character
    for (let i = 0; i < userInput.length; i++) {
      const expectedChar = this.targetText[i]
      const actualChar = userInput[i]
      
      if (expectedChar === actualChar) {
        result.completedChars++
      } else {
        result.isCorrect = false
        result.errors.push(`Position ${i}: expected '${expectedChar}', got '${actualChar}'`)
        this.errors++
      }
    }

    this.currentPosition = userInput.length
    return result
  }

  // Record keystroke for analysis
  recordKeystroke(key: string, expectedChar: string): KeystrokeEvent {
    const keystroke: KeystrokeEvent = {
      key,
      timestamp: Date.now(),
      isCorrect: key === expectedChar,
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
      errors: this.errors,
      startTime: this.startTime || currentTime,
      currentTime
    }
  }

  // Check if typing is complete
  isComplete(userInput: string): boolean {
    return userInput.length >= this.targetText.length && 
           this.validateInput(userInput).completedChars === this.targetText.length
  }

  // Get completion percentage
  getProgress(userInput: string): number {
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
    this.errors = 0
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

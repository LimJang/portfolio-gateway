// Terminal Display Component - Core game interface
'use client'

import { useState, useRef, useEffect } from 'react'
import { useTyping } from '../../../lib/hooks/useTyping'

interface TerminalProps {
  targetText: string
  onComplete?: (stats: any) => void
  onKeystroke?: (key: string, isCorrect: boolean) => void
  isActive?: boolean
  className?: string
}

export default function Terminal({ 
  targetText, 
  onComplete, 
  onKeystroke,
  isActive = true,
  className = '' 
}: TerminalProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [showCursor, setShowCursor] = useState(true)

  const {
    userInput,
    stats,
    isActive: typingActive,
    isComplete,
    startTyping,
    stopTyping,
    resetTyping,
    handleInput,
    progress,
    currentChar,
    errors
  } = useTyping({
    targetText,
    onComplete,
    onKeystroke,
    onStatsUpdate: (stats) => {
      // Real-time stats updates can be handled here
    }
  })

  // Cursor blinking effect
  useEffect(() => {
    const interval = setInterval(() => {
      setShowCursor(prev => !prev)
    }, 500)
    return () => clearInterval(interval)
  }, [])

  // Auto-focus input when component mounts
  useEffect(() => {
    if (inputRef.current && isActive) {
      inputRef.current.focus()
    }
  }, [isActive])

  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    handleInput(value)
  }

  // Handle key press for starting typing
  const handleKeyPress = () => {
    if (!typingActive && userInput.length === 0) {
      startTyping()
    }
  }

  // Render text with highlighting
  const renderText = () => {
    return targetText.split('').map((char, index) => {
      let className = 'font-mono'
      
      if (index < userInput.length) {
        // Already typed characters
        if (userInput[index] === char) {
          className += ' text-green-400 bg-green-900 bg-opacity-30'
        } else {
          className += ' text-red-400 bg-red-900 bg-opacity-50'
        }
      } else if (index === userInput.length) {
        // Current character
        className += ` text-yellow-400 bg-yellow-900 bg-opacity-50 ${showCursor ? 'animate-pulse' : ''}`
      } else {
        // Future characters
        className += ' text-gray-500'
      }

      return (
        <span key={index} className={className}>
          {char === ' ' ? '\u00A0' : char}
        </span>
      )
    })
  }

  return (
    <div className={`terminal-container ${className}`}>
      {/* Hidden input for capturing keystrokes */}
      <input
        ref={inputRef}
        type="text"
        value={userInput}
        onChange={handleInputChange}
        onKeyDown={handleKeyPress}
        className="absolute opacity-0 pointer-events-none"
        disabled={!isActive || isComplete}
        autoComplete="off"
        spellCheck={false}
      />

      {/* Terminal Display */}
      <div 
        className="terminal-display bg-black border-2 border-green-400 p-4 rounded font-mono cursor-text"
        onClick={() => inputRef.current?.focus()}
      >
        {/* Stats Header */}
        <div className="flex justify-between items-center mb-4 text-sm border-b border-green-400 pb-2">
          <div className="flex space-x-4">
            <span className="text-green-400">
              WPM: <span className="font-bold text-yellow-400">{stats.wpm}</span>
            </span>
            <span className="text-green-400">
              ACC: <span className="font-bold text-blue-400">{stats.accuracy}%</span>
            </span>
            <span className="text-green-400">
              PROGRESS: <span className="font-bold text-purple-400">{Math.round(progress)}%</span>
            </span>
          </div>
          <div className="text-xs text-gray-400">
            {typingActive ? '🟢 ACTIVE' : '⚪ READY'}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs text-green-400">TYPING PROGRESS</span>
            <span className="text-xs text-green-400">{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-gray-800 h-2 rounded">
            <div 
              className="bg-green-400 h-2 rounded transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Main Text Display */}
        <div className="text-lg leading-relaxed mb-4 p-4 bg-gray-900 bg-opacity-50 rounded border border-gray-700 min-h-[200px]">
          <div className="whitespace-pre-wrap">
            {renderText()}
            {showCursor && userInput.length === targetText.length && (
              <span className="text-green-400 animate-pulse">█</span>
            )}
          </div>
        </div>

        {/* Current Character Display */}
        {currentChar && !isComplete && (
          <div className="mb-4 p-2 bg-yellow-900 bg-opacity-30 border border-yellow-400 rounded">
            <span className="text-yellow-400 text-sm">
              NEXT: <span className="text-2xl font-bold ml-2">{currentChar === ' ' ? '[SPACE]' : currentChar}</span>
            </span>
          </div>
        )}

        {/* Error Display */}
        {errors.length > 0 && (
          <div className="mb-4 p-2 bg-red-900 bg-opacity-30 border border-red-400 rounded">
            <div className="text-red-400 text-sm mb-1">ERRORS DETECTED:</div>
            <div className="text-xs text-red-300 max-h-20 overflow-y-auto">
              {errors.slice(-3).map((error, index) => (
                <div key={index}>&gt; {error}</div>
              ))}
            </div>
          </div>
        )}

        {/* Completion Message */}
        {isComplete && (
          <div className="p-4 bg-green-900 bg-opacity-50 border border-green-400 rounded">
            <div className="text-green-400 text-center">
              <div className="text-xl font-bold mb-2">🎉 COMMAND SEQUENCE COMPLETE! 🎉</div>
              <div className="text-sm">
                Final Stats: {stats.wpm} WPM | {stats.accuracy}% Accuracy | {stats.correctChars}/{stats.totalChars} Characters
              </div>
            </div>
          </div>
        )}

        {/* Instructions */}
        {!typingActive && userInput.length === 0 && (
          <div className="text-center text-gray-400 text-sm mt-4">
            <div>Click here and start typing to begin...</div>
            <div className="text-xs mt-1">Type each character exactly as shown above</div>
          </div>
        )}
      </div>

      {/* Control Buttons */}
      <div className="flex justify-center space-x-4 mt-4">
        {!typingActive && userInput.length === 0 && (
          <button 
            onClick={startTyping}
            className="retro-button border-green-400 text-green-400 hover:bg-green-400 hover:text-black px-6 py-2"
          >
            START TYPING
          </button>
        )}
        
        {typingActive && (
          <button 
            onClick={stopTyping}
            className="retro-button border-red-400 text-red-400 hover:bg-red-400 hover:text-black px-6 py-2"
          >
            STOP
          </button>
        )}
        
        <button 
          onClick={resetTyping}
          className="retro-button border-yellow-400 text-yellow-400 hover:bg-yellow-400 hover:text-black px-6 py-2"
        >
          RESET
        </button>
      </div>
    </div>
  )
}

// Terminal Display Component - Real terminal environment
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
    const interval: NodeJS.Timeout = setInterval(() => {
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
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (!typingActive && userInput.length === 0) {
      startTyping()
    }
  }

  // Prevent drag, copy, paste, and right-click
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
  }

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
  }

  const handleCopy = (e: React.ClipboardEvent) => {
    e.preventDefault()
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
  }

  // Terminal 출력 텍스트 렌더링 - 타겟 텍스트를 줄 단위로 표시
  const renderTargetLines = () => {
    const lines = targetText.split('\n')
    return lines.map((line, lineIndex) => (
      <div key={lineIndex} className="font-dunggeun text-green-400 mb-1">
        <span className="text-gray-500 mr-2">$</span>
        {line.split('').map((char, charIndex) => {
          const globalIndex = lines.slice(0, lineIndex).join('\n').length + (lineIndex > 0 ? 1 : 0) + charIndex
          let className = ''
          
          if (globalIndex < userInput.length) {
            // Already typed characters
            if (userInput[globalIndex] === char) {
              className = 'text-green-400 bg-green-900 bg-opacity-40'
            } else {
              className = 'text-red-400 bg-red-900 bg-opacity-60'
            }
          } else if (globalIndex === userInput.length) {
            // Current character
            className = `text-yellow-400 bg-yellow-900 bg-opacity-60 ${showCursor ? 'animate-pulse' : ''}`
          } else {
            // Future characters
            className = 'text-gray-400'
          }

          return (
            <span key={charIndex} className={className}>
              {char === ' ' ? '·' : char}
            </span>
          )
        })}
      </div>
    ))
  }

  // 사용자 입력 줄 렌더링
  const renderInputLine = () => {
    const currentLine = userInput.split('\n').pop() || ''
    
    return (
      <div className="font-dunggeun text-green-400 flex items-center">
        <span className="text-green-400 mr-2">{'>'}</span>
        <div className="flex-1 relative">
          <span className="text-green-400">
            {currentLine.split('').map((char, index) => (
              <span key={index}>
                {char === ' ' ? '·' : char}
              </span>
            ))}
          </span>
          {showCursor && (
            <span className="text-green-400 animate-pulse">█</span>
          )}
        </div>
      </div>
    )
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
        onCopy={handleCopy}
        onPaste={handlePaste}
        className="absolute opacity-0 pointer-events-none font-dunggeun"
        disabled={!isActive || isComplete}
        autoComplete="off"
        spellCheck={false}
      />

      {/* Terminal Container */}
      <div 
        className="terminal-display bg-black border-2 border-green-400 rounded font-dunggeun select-none"
        onClick={() => inputRef.current?.focus()}
        onMouseDown={handleMouseDown}
        onContextMenu={handleContextMenu}
        style={{ 
          userSelect: 'none',
          WebkitUserSelect: 'none',
          MozUserSelect: 'none',
          minHeight: '500px'
        }}
      >
        {/* Terminal Header */}
        <div className="bg-green-400 text-black px-4 py-2 text-sm font-bold flex justify-between items-center">
          <div>HACKER TERMINAL v2.1.5</div>
          <div className="flex space-x-4 text-xs">
            <span>WPM: {stats.wpm}</span>
            <span>ACC: {stats.accuracy}%</span>
            <span>PROG: {Math.round(progress)}%</span>
          </div>
        </div>

        {/* Terminal Body */}
        <div className="p-4 space-y-2" style={{ minHeight: '400px' }}>
          {/* System Info */}
          <div className="text-green-400 text-sm mb-4 font-dunggeun">
            <div>System initialized... [OK]</div>
            <div>Connection established... [OK]</div>
            <div>Entering command sequence mode...</div>
            <div className="text-yellow-400 mt-2">Type each command exactly as shown:</div>
            <div className="border-b border-gray-700 my-2"></div>
          </div>

          {/* Target Commands Display */}
          <div className="space-y-1 mb-4">
            {renderTargetLines()}
          </div>

          {/* Progress Bar */}
          <div className="my-4">
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs text-green-400 font-bold">EXECUTION PROGRESS</span>
              <span className="text-xs text-green-400 font-bold">{Math.round(progress)}%</span>
            </div>
            <div className="w-full bg-gray-800 h-1 rounded">
              <div 
                className="bg-green-400 h-1 rounded transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Error Display */}
          {errors.length > 0 && (
            <div className="bg-red-900 bg-opacity-30 border border-red-400 rounded p-2 mb-4">
              <div className="text-red-400 text-xs font-bold mb-1">EXECUTION ERRORS:</div>
              {errors.slice(-2).map((error, index) => (
                <div key={index} className="text-red-300 text-xs font-dunggeun">
                  ⚠️ {error}
                </div>
              ))}
            </div>
          )}

          {/* Current Character Hint */}
          {currentChar && !isComplete && (
            <div className="bg-yellow-900 bg-opacity-20 border border-yellow-600 rounded p-2 mb-4">
              <span className="text-yellow-400 text-xs font-bold font-dunggeun">
                NEXT INPUT: <span className="text-lg font-bold ml-2">{currentChar === ' ' ? '[SPACE]' : currentChar}</span>
              </span>
            </div>
          )}

          {/* Completion Message */}
          {isComplete && (
            <div className="bg-green-900 bg-opacity-50 border border-green-400 rounded p-4 mb-4">
              <div className="text-green-400 text-center font-dunggeun">
                <div className="text-lg font-bold mb-2">✅ COMMAND SEQUENCE EXECUTED SUCCESSFULLY</div>
                <div className="text-sm">
                  Performance: {stats.wpm} WPM | Accuracy: {stats.accuracy}% | Errors: {stats.errors}
                </div>
              </div>
            </div>
          )}

          {/* Spacer to push input to bottom */}
          <div className="flex-1"></div>

          {/* Input Line at Bottom */}
          <div className="border-t border-gray-700 pt-2 mt-auto">
            {!isComplete && renderInputLine()}
          </div>
        </div>
      </div>

      {/* Control Buttons */}
      <div className="flex justify-center space-x-4 mt-4">
        {!typingActive && userInput.length === 0 && (
          <button 
            onClick={startTyping}
            className="retro-button border-green-400 text-green-400 hover:bg-green-400 hover:text-black px-6 py-2 font-bold"
          >
            INITIALIZE TERMINAL
          </button>
        )}
        
        {typingActive && (
          <button 
            onClick={stopTyping}
            className="retro-button border-red-400 text-red-400 hover:bg-red-400 hover:text-black px-6 py-2 font-bold"
          >
            ABORT SEQUENCE
          </button>
        )}
        
        <button 
          onClick={resetTyping}
          className="retro-button border-yellow-400 text-yellow-400 hover:bg-yellow-400 hover:text-black px-6 py-2 font-bold"
        >
          RESET TERMINAL
        </button>
      </div>

      {/* Instructions */}
      {!typingActive && userInput.length === 0 && (
        <div className="text-center text-gray-400 text-sm mt-4 font-bold font-dunggeun">
          <div>Click terminal and start typing to begin command execution...</div>
          <div className="text-xs mt-1">Spaces are shown as dots (·) for visibility</div>
          <div className="text-xs mt-1 text-red-400">⚠️ Copy/Paste operations disabled</div>
        </div>
      )}
    </div>
  )
}
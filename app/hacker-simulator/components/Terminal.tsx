// Terminal Display Component - Authentic DOS/Hacker Terminal
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
  const outputRef = useRef<HTMLDivElement>(null)
  const [showCursor, setShowCursor] = useState(true)
  const [currentLine, setCurrentLine] = useState('')
  const [completedLines, setCompletedLines] = useState<string[]>([])

  // Split target text into lines for line-by-line processing
  const targetLines = targetText.split('\n')
  const currentTargetLine = completedLines.length < targetLines.length 
    ? targetLines[completedLines.length] 
    : ''

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
    targetText: currentTargetLine, // Process one line at a time
    onComplete: (stats) => {
      // Line completed
      const newCompletedLines = [...completedLines, currentLine]
      setCompletedLines(newCompletedLines)
      setCurrentLine('')
      
      // Check if all lines are completed
      if (newCompletedLines.length >= targetLines.length) {
        onComplete?.(stats)
      } else {
        // Reset for next line
        resetTyping()
      }
    },
    onKeystroke,
    onStatsUpdate: (stats) => {
      // Real-time stats updates
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

  // Auto-scroll to bottom when content changes
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight
    }
  }, [completedLines, currentLine, errors])

  // Handle key press including Enter
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!typingActive && currentLine.length === 0) {
      startTyping()
    }
    
    // Handle Enter key for line completion
    if (e.key === 'Enter') {
      e.preventDefault()
      
      // Check if current line matches target line
      if (currentLine === currentTargetLine) {
        // Line is correct, move to next line
        const newCompletedLines = [...completedLines, currentLine]
        setCompletedLines(newCompletedLines)
        setCurrentLine('')
        
        // Check if all lines are completed
        if (newCompletedLines.length >= targetLines.length) {
          onComplete?.(stats)
        } else {
          // Reset for next line
          resetTyping()
        }
      } else {
        // Line is incorrect, show error but allow retry
        console.log('Line incorrect, retry needed')
      }
    }
  }

  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setCurrentLine(value)
    handleInput(value)
  }

  // Prevent drag, copy, paste
  const handleCopy = (e: React.ClipboardEvent) => {
    e.preventDefault()
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
  }

  // Render target text with character-by-character highlighting
  const renderTargetText = () => {
    return targetLines.map((line, lineIndex) => {
      let lineClass = 'font-dunggeun mb-1'
      
      if (lineIndex < completedLines.length) {
        // Completed lines
        lineClass += ' text-green-400'
      } else if (lineIndex === completedLines.length) {
        // Current line being typed
        lineClass += ' text-yellow-400'
        
        return (
          <div key={lineIndex} className={lineClass}>
            {line.split('').map((char, charIndex) => {
              let className = ''
              
              if (charIndex < currentLine.length) {
                // Already typed characters
                if (currentLine[charIndex] === char) {
                  className = 'text-green-400'
                } else {
                  className = 'text-red-400 bg-red-900'
                }
              } else if (charIndex === currentLine.length) {
                // Current character to type
                className = `text-yellow-400 ${showCursor ? 'bg-yellow-900' : ''}`
              } else {
                // Future characters
                className = 'text-gray-400'
              }

              return (
                <span key={charIndex} className={className}>
                  {char}
                </span>
              )
            })}
          </div>
        )
      } else {
        // Future lines
        lineClass += ' text-gray-500'
      }

      return (
        <div key={lineIndex} className={lineClass}>
          {line}
        </div>
      )
    })
  }

  // Render current input line
  const renderCurrentInput = () => {
    return (
      <div className="font-dunggeun text-green-400">
        <span className="text-green-400">C:\HACK&gt; </span>
        <span className="text-green-400">
          {currentLine}
          {showCursor && <span className="animate-pulse">_</span>}
        </span>
      </div>
    )
  }

  // Calculate overall progress
  const overallProgress = targetLines.length > 0 
    ? ((completedLines.length + (currentLine.length / Math.max(currentTargetLine.length, 1))) / targetLines.length) * 100
    : 0

  return (
    <div className={`dos-terminal ${className}`}>
      {/* DOS Terminal Window */}
      <div className="dos-window bg-black border-2 border-gray-600 shadow-2xl font-dunggeun">
        {/* Window Title Bar */}
        <div className="dos-titlebar bg-gray-700 text-white px-2 py-1 text-xs flex justify-between items-center">
          <span>💀 HACKER TERMINAL - SYSTEM BREACH v3.14</span>
          <div className="flex space-x-1">
            <div className="w-3 h-3 bg-yellow-500 rounded-sm"></div>
            <div className="w-3 h-3 bg-green-500 rounded-sm"></div>
            <div className="w-3 h-3 bg-red-500 rounded-sm"></div>
          </div>
        </div>

        {/* Terminal Content Area */}
        <div 
          className="dos-content bg-black text-green-400 relative"
          onClick={() => inputRef.current?.focus()}
          style={{ height: '500px', overflow: 'hidden' }}
        >
          {/* Scrollable Output Area */}
          <div 
            ref={outputRef}
            className="dos-output absolute top-0 left-0 right-0 p-4 pr-6 overflow-y-auto font-dunggeun text-sm leading-6"
            style={{ height: 'calc(100% - 60px)' }} // Leave space for input at bottom
          >
            {/* System Boot Messages */}
            <div className="text-green-400 mb-2">
              <div>HACKNET TERMINAL SYSTEM v3.14.159</div>
              <div>Copyright (C) 2025 Underground Collective</div>
              <div className="text-gray-500">----------------------------------------</div>
              <div>System Status: <span className="text-green-400">ONLINE</span></div>
              <div>Security Level: <span className="text-red-400">COMPROMISED</span></div>
              <div>Target System: <span className="text-yellow-400">CLASSIFIED</span></div>
              <div className="text-gray-500">----------------------------------------</div>
              <div className="mb-4">
                Initiating command sequence... Type each command exactly as shown, press ENTER to execute.
              </div>
            </div>

            {/* Statistics Display */}
            <div className="text-xs text-gray-400 mb-4 border border-gray-700 p-2">
              <div className="grid grid-cols-4 gap-4">
                <div>WPM: <span className="text-yellow-400">{stats.wpm}</span></div>
                <div>ACC: <span className="text-blue-400">{stats.accuracy}%</span></div>
                <div>ERR: <span className="text-red-400">{stats.errors}</span></div>
                <div>PROG: <span className="text-green-400">{Math.round(overallProgress)}%</span></div>
              </div>
            </div>

            {/* Target Commands to Type */}
            <div className="mb-4">
              <div className="text-yellow-400 text-xs mb-2">REQUIRED COMMAND SEQUENCE:</div>
              <div className="bg-gray-900 p-3 border border-gray-700 whitespace-pre-wrap text-sm">
                {renderTargetText()}
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mb-4">
              <div className="text-xs text-green-400 mb-1">EXECUTION PROGRESS:</div>
              <div className="bg-gray-800 h-2 border border-gray-600">
                <div 
                  className="bg-green-400 h-full transition-all duration-300"
                  style={{ width: `${overallProgress}%` }}
                />
              </div>
            </div>

            {/* Completed Commands Display */}
            {completedLines.length > 0 && (
              <div className="mb-4">
                <div className="text-green-400 text-xs mb-1">EXECUTED COMMANDS:</div>
                <div className="bg-green-900 bg-opacity-20 border border-green-600 p-2">
                  {completedLines.map((line, index) => (
                    <div key={index} className="text-green-300 text-xs">
                      ✅ {line}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Error Messages */}
            {errors.length > 0 && (
              <div className="mb-4">
                <div className="text-red-400 text-xs mb-1">EXECUTION ERRORS:</div>
                <div className="bg-red-900 bg-opacity-30 border border-red-600 p-2">
                  {errors.slice(-3).map((error, index) => (
                    <div key={index} className="text-red-300 text-xs">
                      ⚠️ {error}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Current Line Status */}
            {currentTargetLine && !isComplete && (
              <div className="mb-4">
                <div className="text-yellow-400 text-xs">
                  CURRENT COMMAND: <span className="text-white font-bold ml-2">{currentTargetLine}</span>
                </div>
                <div className="text-gray-400 text-xs mt-1">
                  Progress: {currentLine.length}/{currentTargetLine.length} characters | Press ENTER when complete
                </div>
              </div>
            )}

            {/* Completion Message */}
            {completedLines.length >= targetLines.length && (
              <div className="mb-4">
                <div className="text-green-400 border border-green-400 p-3">
                  <div className="text-center">
                    <div className="text-lg mb-2">✅ SYSTEM BREACH SUCCESSFUL</div>
                    <div className="text-sm">
                      Performance: {stats.wpm} WPM | Accuracy: {stats.accuracy}% | Errors: {stats.errors}
                    </div>
                    <div className="text-xs text-gray-400 mt-2">
                      Access granted to classified systems...
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Spacer for scrolling */}
            <div style={{ height: '20px' }}></div>
          </div>

          {/* Fixed Input Line at Bottom */}
          <div className="dos-input absolute bottom-0 left-0 right-0 bg-black border-t border-gray-700 p-4">
            {completedLines.length < targetLines.length ? (
              <div className="relative">
                {renderCurrentInput()}
                {/* Hidden input field for actual typing */}
                <input
                  ref={inputRef}
                  type="text"
                  value={currentLine}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  onCopy={handleCopy}
                  onPaste={handlePaste}
                  className="absolute top-0 left-0 w-full h-full opacity-0 bg-transparent border-none outline-none font-dunggeun"
                  disabled={!isActive}
                  autoComplete="off"
                  spellCheck={false}
                />
              </div>
            ) : (
              <div className="font-dunggeun text-green-400">
                <span className="text-green-400">C:\HACK&gt; </span>
                <span className="text-gray-400">System breached successfully. Awaiting new commands...</span>
                <span className="text-green-400 animate-pulse">_</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Control Buttons Below Terminal */}
      <div className="flex justify-center space-x-4 mt-4">
        {!typingActive && currentLine.length === 0 && completedLines.length === 0 && (
          <button 
            onClick={startTyping}
            className="retro-button border-green-400 text-green-400 hover:bg-green-400 hover:text-black px-6 py-2 font-bold"
          >
            INITIATE HACK
          </button>
        )}
        
        {(typingActive || currentLine.length > 0) && completedLines.length < targetLines.length && (
          <button 
            onClick={() => {
              stopTyping()
              setCurrentLine('')
              setCompletedLines([])
              resetTyping()
            }}
            className="retro-button border-red-400 text-red-400 hover:bg-red-400 hover:text-black px-6 py-2 font-bold"
          >
            ABORT MISSION
          </button>
        )}
        
        <button 
          onClick={() => {
            stopTyping()
            setCurrentLine('')
            setCompletedLines([])
            resetTyping()
          }}
          className="retro-button border-yellow-400 text-yellow-400 hover:bg-yellow-400 hover:text-black px-6 py-2 font-bold"
        >
          RESET SYSTEM
        </button>
      </div>

      {/* Instructions */}
      {!typingActive && currentLine.length === 0 && completedLines.length === 0 && (
        <div className="text-center text-gray-400 text-sm mt-4 font-dunggeun">
          <div>Click the terminal and start typing to begin the hack...</div>
          <div className="text-xs mt-1">Type each command line by line | Press ENTER to execute each command</div>
          <div className="text-xs mt-1 text-red-400">⚠️ Copy/Paste disabled for security</div>
        </div>
      )}

      {/* CSS Styles */}
      <style jsx>{`
        .dos-terminal {
          font-family: 'NeoDunggeunmo', 'Courier New', monospace;
        }
        
        .dos-window {
          max-width: 800px;
          margin: 0 auto;
          border-radius: 0;
          box-shadow: 0 0 20px rgba(0, 255, 65, 0.3);
        }
        
        .dos-titlebar {
          background: linear-gradient(to bottom, #4a5568, #2d3748);
          font-size: 11px;
          user-select: none;
        }
        
        .dos-content {
          position: relative;
          cursor: text;
        }
        
        .dos-output {
          scrollbar-width: thin;
          scrollbar-color: #00ff41 #000000;
        }
        
        .dos-output::-webkit-scrollbar {
          width: 8px;
        }
        
        .dos-output::-webkit-scrollbar-track {
          background: #000000;
          border: 1px solid #333;
        }
        
        .dos-output::-webkit-scrollbar-thumb {
          background: #00ff41;
          border-radius: 0;
        }
        
        .dos-input {
          min-height: 50px;
        }
        
        /* Matrix-style text shadow */
        .dos-content {
          text-shadow: 0 0 5px currentColor;
        }
        
        /* Scanline effect */
        .dos-content::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: repeating-linear-gradient(
            0deg,
            rgba(0, 255, 65, 0.03),
            rgba(0, 255, 65, 0.03) 1px,
            transparent 1px,
            transparent 2px
          );
          pointer-events: none;
          z-index: 1;
        }
      `}</style>
    </div>
  )
}
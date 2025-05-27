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
  const [userInput, setUserInput] = useState('')
  const [missionComplete, setMissionComplete] = useState(false)
  const [startTime] = useState(new Date())
  const [stats, setStats] = useState({
    wpm: 0,
    accuracy: 100,
    errors: 0,
    startTime: new Date(),
    currentTime: new Date()
  })

  // Remove all line breaks from target text
  const cleanTargetText = targetText.replace(/\n/g, ' ')

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
  }, [])

  // Auto-scroll to bottom when content changes
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight
    }
  }, [userInput])

  // Check completion when user input changes
  useEffect(() => {
    if (userInput.length > 0 && cleanTargetText.length > 0) {
      // Calculate progress with 100% limit
      const rawProgress = (userInput.length / cleanTargetText.length) * 100
      const progress = Math.min(100, rawProgress) // 100% 리밋
      
      // Calculate accuracy
      const correctChars = userInput.split('').filter((char, index) => char === cleanTargetText[index]).length
      const accuracy = Math.round((correctChars / userInput.length) * 100)
      
      // Calculate WPM
      const currentTime = new Date()
      const timeElapsed = (currentTime.getTime() - startTime.getTime()) / 1000 / 60 // minutes
      const wpm = timeElapsed > 0 ? Math.round((correctChars / 5) / timeElapsed) : 0
      
      setStats(prev => ({
        ...prev,
        wpm,
        accuracy,
        currentTime
      }))

      // Auto-complete when progress reaches exactly 100% and text matches
      if (progress >= 100 && userInput === cleanTargetText && !missionComplete) {
        setMissionComplete(true)
        
        // Safe stats object for onComplete
        const completionStats = {
          wpm: wpm,
          accuracy: accuracy,
          correctChars: correctChars,
          totalChars: userInput.length,
          errors: stats.errors,
          startTime: startTime,
          currentTime: currentTime
        }
        
        onComplete?.(completionStats)
      }
    }
  }, [userInput, cleanTargetText, startTime, stats.errors, missionComplete, onComplete])

  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setUserInput(value)
  }

  // Prevent copy/paste
  const handleCopy = (e: React.ClipboardEvent) => {
    e.preventDefault()
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
  }

  // Render target text with character-by-character highlighting
  const renderTargetText = () => {
    return cleanTargetText.split('').map((char, index) => {
      let className = 'font-dunggeun'
      
      if (index < userInput.length) {
        // Already typed characters
        if (userInput[index] === char) {
          className += ' text-green-400'
        } else {
          className += ' text-red-400 bg-red-900'
        }
      } else if (index === userInput.length) {
        // Current character to type
        className += ` text-yellow-400 ${showCursor ? 'bg-yellow-900' : ''}`
      } else {
        // Future characters
        className += ' text-gray-400'
      }

      return (
        <span key={index} className={className}>
          {char}
        </span>
      )
    })
  }

  // Calculate progress with 100% limit
  const rawProgress = cleanTargetText.length > 0 ? (userInput.length / cleanTargetText.length) * 100 : 0
  const progress = Math.min(100, rawProgress)

  return (
    <div className={`dos-terminal ${className}`}>
      {/* DOS Terminal Window - Larger Size */}
      <div className="dos-window bg-black border-2 border-gray-600 shadow-2xl font-dunggeun resize overflow-auto">
        {/* Window Title Bar */}
        <div className="dos-titlebar bg-gray-700 text-white px-2 py-1 text-xs flex justify-between items-center cursor-move">
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
          style={{ height: '600px', overflow: 'hidden' }}
        >
          {/* Scrollable Output Area */}
          <div 
            ref={outputRef}
            className="dos-output absolute top-0 left-0 right-0 p-4 pr-6 overflow-y-auto font-dunggeun text-sm leading-6"
            style={{ height: 'calc(100% - 80px)' }}
          >
            {/* System Boot Messages */}
            <div className="text-green-400 mb-4">
              <div>HACKNET TERMINAL SYSTEM v3.14.159</div>
              <div>Copyright (C) 2025 Underground Collective</div>
              <div className="text-gray-500">----------------------------------------</div>
              <div>System Status: <span className="text-green-400">ONLINE</span></div>
              <div>Security Level: <span className="text-red-400">COMPROMISED</span></div>
              <div>Target System: <span className="text-yellow-400">CLASSIFIED</span></div>
              <div className="text-gray-500">----------------------------------------</div>
              <div className="mb-4">
                Initiating command sequence... Type the command sequence below.
              </div>
            </div>

            {/* Statistics Display */}
            <div className="text-xs text-gray-400 mb-4 border border-gray-700 p-2">
              <div className="grid grid-cols-4 gap-4">
                <div>WPM: <span className="text-yellow-400">{stats.wpm}</span></div>
                <div>ACC: <span className="text-blue-400">{stats.accuracy}%</span></div>
                <div>ERR: <span className="text-red-400">{stats.errors}</span></div>
                <div>PROG: <span className="text-green-400">{Math.round(progress)}%</span></div>
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
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            {/* Completion Message */}
            {missionComplete && (
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

            {/* Instructions */}
            {!missionComplete && (
              <div className="mb-4">
                <div className="text-yellow-400 text-xs">
                  INSTRUCTIONS: Type the command sequence above. Mission completes automatically at 100%.
                </div>
                <div className="text-gray-400 text-xs mt-1">
                  Match exactly including spaces. Copy/Paste disabled.
                </div>
              </div>
            )}

            {/* Spacer for scrolling */}
            <div style={{ height: '20px' }}></div>
          </div>

          {/* Fixed C:\HACK> Input at Bottom */}
          <div className="dos-input absolute bottom-0 left-0 right-0 bg-black border-t border-gray-700 p-4">
            <div className="font-dunggeun text-green-400 flex items-center">
              <span className="text-green-400 mr-2">C:\HACK&gt;</span>
              <input
                ref={inputRef}
                type="text"
                value={userInput}
                onChange={handleInputChange}
                onCopy={handleCopy}
                onPaste={handlePaste}
                className="flex-1 bg-transparent border-none outline-none text-green-400 font-dunggeun text-sm"
                disabled={!isActive || missionComplete}
                autoComplete="off"
                spellCheck={false}
                placeholder={missionComplete ? "Mission Complete" : "Type command sequence here..."}
              />
              {showCursor && !missionComplete && userInput.length === 0 && (
                <span className="text-green-400 animate-pulse">_</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Control Buttons Below Terminal */}
      <div className="flex justify-center space-x-4 mt-4">
        <button 
          onClick={() => {
            setUserInput('')
            setMissionComplete(false)
            setStats({
              wpm: 0,
              accuracy: 100,
              errors: 0,
              startTime: new Date(),
              currentTime: new Date()
            })
            inputRef.current?.focus()
          }}
          className="retro-button border-yellow-400 text-yellow-400 hover:bg-yellow-400 hover:text-black px-6 py-2 font-bold"
        >
          RESET SYSTEM
        </button>
      </div>

      {/* Instructions */}
      <div className="text-center text-gray-400 text-sm mt-4 font-dunggeun">
        <div>Type the command sequence - mission completes automatically when you reach 100%</div>
        <div className="text-xs mt-1">Window is resizable and draggable | Copy/Paste disabled</div>
      </div>

      {/* CSS Styles */}
      <style jsx>{`
        .dos-terminal {
          font-family: 'NeoDunggeunmo', 'Courier New', monospace;
        }
        
        .dos-window {
          width: 900px;
          min-width: 600px;
          max-width: 1200px;
          margin: 0 auto;
          border-radius: 0;
          box-shadow: 0 0 20px rgba(0, 255, 65, 0.3);
          resize: both;
          overflow: auto;
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
          min-height: 60px;
        }
        
        .dos-input input::placeholder {
          color: #666;
          opacity: 0.7;
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
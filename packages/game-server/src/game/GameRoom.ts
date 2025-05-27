import { Server, Socket } from 'socket.io';
import { PhysicsEngine } from '../physics/PhysicsEngine';

interface Player {
  id: string;
  socket: Socket;
  username: string;
  displayName: string;
  color: string;
  position: { x: number; y: number };
  velocity: { x: number; y: number };
  direction: number;
  isAlive: boolean;
  isThrusting: boolean;
}

export class GameRoom {
  private id: string;
  private roomCode: string;
  private roomName: string;
  private io: Server;
  private players: Map<string, Player> = new Map();
  private hostId: string | null = null;
  private status: 'waiting' | 'playing' | 'finished' = 'waiting';
  private maxPlayers: number = 8;
  private physicsEngine: PhysicsEngine | null = null;
  private gameLoopInterval: NodeJS.Timeout | null = null;

  constructor(id: string, roomCode: string, roomName: string, io: Server) {
    this.id = id;
    this.roomCode = roomCode;
    this.roomName = roomName;
    this.io = io;
  }

  addPlayer(socket: Socket, playerData: any): boolean {
    if (this.players.size >= this.maxPlayers) {
      return false;
    }

    // Set first player as host
    if (this.players.size === 0) {
      this.hostId = socket.id;
    }

    const player: Player = {
      id: socket.id,
      socket: socket,
      username: playerData.username,
      displayName: playerData.displayName,
      color: this.getPlayerColor(),
      position: { x: 400, y: 300 }, // Default spawn
      velocity: { x: 0, y: 0 },
      direction: 0,
      isAlive: true,
      isThrusting: false
    };

    this.players.set(socket.id, player);
    socket.join(this.id);

    // Notify all players in room
    this.io.to(this.id).emit('playerJoined', {
      player: this.getPlayerData(player),
      room: this.getRoomData()
    });

    console.log(`Player ${playerData.displayName} joined room ${this.roomCode}`);
    return true;
  }

  removePlayer(socketId: string) {
    const player = this.players.get(socketId);
    if (!player) return;

    this.players.delete(socketId);
    player.socket.leave(this.id);

    // If host left, assign new host
    if (this.hostId === socketId && this.players.size > 0) {
      this.hostId = this.players.keys().next().value;
    }

    // Notify remaining players
    this.io.to(this.id).emit('playerLeft', {
      playerId: socketId,
      room: this.getRoomData()
    });

    console.log(`Player ${player.displayName} left room ${this.roomCode}`);
  }

  startGame() {
    if (this.status !== 'waiting' || this.players.size < 2) {
      return;
    }

    this.status = 'playing';
    this.physicsEngine = new PhysicsEngine();

    // Initialize players in physics world
    this.initializePhysics();

    // Start game loop
    this.startGameLoop();

    // Notify all players
    this.io.to(this.id).emit('gameStarted', {
      room: this.getRoomData(),
      players: Array.from(this.players.values()).map(p => this.getPlayerData(p))
    });

    console.log(`Game started in room ${this.roomCode}`);
  }

  handlePlayerInput(socketId: string, inputData: any) {
    if (this.status !== 'playing') return;

    const player = this.players.get(socketId);
    if (!player || !player.isAlive) return;

    // Update player based on input
    switch (inputData.type) {
      case 'rotate_left':
        player.direction -= 3;
        if (player.direction < 0) player.direction += 360;
        break;
      case 'rotate_right':
        player.direction += 3;
        if (player.direction >= 360) player.direction -= 360;
        break;
      case 'thrust':
        const radians = ((player.direction - 90) * Math.PI) / 180;
        const thrustForce = 0.5;
        player.velocity.x += Math.cos(radians) * thrustForce;
        player.velocity.y += Math.sin(radians) * thrustForce;
        player.isThrusting = true;
        break;
    }
  }

  private initializePhysics() {
    if (!this.physicsEngine) return;

    // Add players to physics world with distributed spawn points
    const spawnPoints = this.generateSpawnPoints();
    let spawnIndex = 0;

    for (const player of this.players.values()) {
      const spawn = spawnPoints[spawnIndex % spawnPoints.length];
      player.position = { x: spawn.x, y: spawn.y };
      player.direction = spawn.direction;
      spawnIndex++;
    }
  }

  private generateSpawnPoints() {
    const centerX = 400;
    const centerY = 300;
    const radius = 200;
    const points = [];

    for (let i = 0; i < 8; i++) {
      const angle = (i * 45) * (Math.PI / 180);
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;
      const direction = (angle + Math.PI) * (180 / Math.PI); // Face center

      points.push({
        x: Math.max(50, Math.min(750, x)),
        y: Math.max(50, Math.min(550, y)),
        direction
      });
    }

    return points;
  }

  private startGameLoop() {
    this.gameLoopInterval = setInterval(() => {
      this.updateGameState();
      this.broadcastGameState();
    }, 1000 / 60); // 60 FPS
  }

  private updateGameState() {
    for (const player of this.players.values()) {
      if (!player.isAlive) continue;

      // Apply physics
      player.position.x += player.velocity.x;
      player.position.y += player.velocity.y;

      // Apply friction
      player.velocity.x *= 0.99;
      player.velocity.y *= 0.99;

      // Reset thrust
      player.isThrusting = false;

      // Check boundaries (death walls)
      if (player.position.x < 0 || player.position.x > 800 || 
          player.position.y < 0 || player.position.y > 600) {
        player.isAlive = false;
        this.io.to(this.id).emit('playerDied', { playerId: player.id });
      }
    }

    // Check win condition
    const alivePlayers = Array.from(this.players.values()).filter(p => p.isAlive);
    if (alivePlayers.length <= 1 && this.status === 'playing') {
      this.endGame(alivePlayers[0]?.displayName || 'Nobody');
    }
  }

  private broadcastGameState() {
    const gameState = {
      players: Array.from(this.players.values()).map(p => this.getPlayerData(p)),
      timestamp: Date.now()
    };

    this.io.to(this.id).emit('gameStateUpdate', gameState);
  }

  private endGame(winner: string) {
    this.status = 'finished';
    
    if (this.gameLoopInterval) {
      clearInterval(this.gameLoopInterval);
      this.gameLoopInterval = null;
    }

    this.io.to(this.id).emit('gameEnded', { winner });

    // Reset room after delay
    setTimeout(() => {
      this.resetRoom();
    }, 5000);
  }

  private resetRoom() {
    this.status = 'waiting';
    
    // Reset all players
    for (const player of this.players.values()) {
      player.isAlive = true;
      player.position = { x: 400, y: 300 };
      player.velocity = { x: 0, y: 0 };
      player.direction = 0;
      player.isThrusting = false;
    }

    this.io.to(this.id).emit('roomReset', { room: this.getRoomData() });
  }

  private getPlayerColor(): string {
    const colors = ['#ff0000', '#0000ff', '#ffff00', '#ff00ff', '#00ffff', '#ffa500', '#800080', '#00ff00'];
    return colors[this.players.size % colors.length];
  }

  private getPlayerData(player: Player) {
    return {
      id: player.id,
      username: player.username,
      displayName: player.displayName,
      color: player.color,
      position: player.position,
      velocity: player.velocity,
      direction: player.direction,
      isAlive: player.isAlive,
      isThrusting: player.isThrusting
    };
  }

  // Public getters
  getId(): string { return this.id; }
  getRoomCode(): string { return this.roomCode; }
  getPlayerCount(): number { return this.players.size; }
  isFull(): boolean { return this.players.size >= this.maxPlayers; }
  isHost(socketId: string): boolean { return this.hostId === socketId; }

  getRoomData() {
    return {
      id: this.id,
      roomCode: this.roomCode,
      roomName: this.roomName,
      currentPlayers: this.players.size,
      maxPlayers: this.maxPlayers,
      status: this.status,
      hostId: this.hostId
    };
  }

  shutdown() {
    if (this.gameLoopInterval) {
      clearInterval(this.gameLoopInterval);
    }
    
    // Notify all players
    this.io.to(this.id).emit('roomShutdown');
    
    // Disconnect all players
    for (const player of this.players.values()) {
      player.socket.leave(this.id);
    }
    
    this.players.clear();
  }
}

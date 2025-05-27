'use client';

import { Spaceship, Asteroid, Satellite } from '../../../lib/physics/GameObject';

interface GamePlayer {
  id: string;
  user_id: string;
  username: string;
  display_name: string;
  position_x: number;
  position_y: number;
  velocity_x: number;
  velocity_y: number;
  direction: number;
  is_alive: boolean;
  is_thrusting: boolean;
  color: string;
}

interface SpawnPoint {
  x: number;
  y: number;
  direction: number; // 중앙을 향하는 방향
}

export default class MultiplayerPhysicsEngine {
  private engine: any;
  private render: any;
  private runner: any;
  private canvas: HTMLCanvasElement;
  private players: { [playerId: string]: Spaceship } = {};
  private obstacles: (Asteroid | Satellite)[] = [];
  private Matter: any = null;
  private isInitialized: boolean = false;
  private currentPlayerId: string;
  private onPlayerUpdate: (playerId: string, data: any) => void;
  private onPlayerDeath: (playerId: string) => void;
  private spawnPoints: SpawnPoint[] = [];
  private usedSpawnPoints: Set<number> = new Set();

  constructor(
    canvas: HTMLCanvasElement, 
    currentPlayerId: string,
    onPlayerUpdate: (playerId: string, data: any) => void,
    onPlayerDeath: (playerId: string) => void
  ) {
    this.canvas = canvas;
    this.currentPlayerId = currentPlayerId;
    this.onPlayerUpdate = onPlayerUpdate;
    this.onPlayerDeath = onPlayerDeath;
    this.initializeSpawnPoints();
    this.initializeMatter();
  }

  // 8방향 스폰 포인트 초기화
  private initializeSpawnPoints() {
    const centerX = 400;
    const centerY = 300;
    const spawnRadius = 200; // 중앙에서 200픽셀 떨어진 거리
    
    // 8방향으로 스폰 포인트 생성
    for (let i = 0; i < 8; i++) {
      const angle = (i * 45) * (Math.PI / 180); // 45도씩 분할
      const x = centerX + Math.cos(angle) * spawnRadius;
      const y = centerY + Math.sin(angle) * spawnRadius;
      
      // 중앙을 향하는 방향 계산 (스폰 시 플레이어가 중앙을 바라보도록)
      const directionToCenter = (angle + Math.PI) * (180 / Math.PI); // 반대 방향
      
      this.spawnPoints.push({
        x: Math.max(50, Math.min(750, x)), // 화면 경계 안전 범위
        y: Math.max(50, Math.min(550, y)),
        direction: directionToCenter
      });
    }
  }

  // 사용 가능한 스폰 포인트 선택
  private getAvailableSpawnPoint(): SpawnPoint {
    // 사용되지 않은 스폰 포인트 찾기
    for (let i = 0; i < this.spawnPoints.length; i++) {
      if (!this.usedSpawnPoints.has(i)) {
        this.usedSpawnPoints.add(i);
        return this.spawnPoints[i];
      }
    }
    
    // 모든 스폰 포인트가 사용된 경우, 가장 오래된 것 재사용
    const oldestIndex = Math.min(...this.usedSpawnPoints);
    return this.spawnPoints[oldestIndex];
  }

  // 스폰 포인트 해제
  private releaseSpawnPoint(position: { x: number, y: number }) {
    const threshold = 50; // 허용 오차
    for (let i = 0; i < this.spawnPoints.length; i++) {
      const spawn = this.spawnPoints[i];
      const distance = Math.sqrt(
        Math.pow(spawn.x - position.x, 2) + Math.pow(spawn.y - position.y, 2)
      );
      
      if (distance < threshold) {
        this.usedSpawnPoints.delete(i);
        break;
      }
    }
  }

  private async initializeMatter() {
    try {
      // Dynamic import for browser compatibility
      const MatterModule = await import('matter-js');
      this.Matter = MatterModule.default;
      
      // Now initialize the physics engine
      await this.setupPhysics();
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to load Matter.js in multiplayer:', error);
    }
  }

  private async setupPhysics() {
    if (!this.Matter) return;

    // Create Matter.js engine
    this.engine = this.Matter.Engine.create();
    this.engine.world.gravity.y = 0; // Zero gravity
    this.engine.world.gravity.x = 0;

    // Create boundaries (death walls)
    this.createBoundaries();
    
    // Create obstacles
    await this.createObstacles();

    // Start physics runner (no renderer, we'll use custom Canvas)
    this.runner = this.Matter.Runner.create();
    this.Matter.Runner.run(this.runner, this.engine);
    
    // Set up collision detection
    this.setupCollisionDetection();
  }

  private createBoundaries() {
    if (!this.Matter) return;
    
    const thickness = 10;
    const walls = [
      // Top wall
      this.Matter.Bodies.rectangle(400, -thickness/2, 800, thickness, { 
        isStatic: true,
        render: { fillStyle: '#00ffff' },
        label: 'death_boundary'
      }),
      // Bottom wall  
      this.Matter.Bodies.rectangle(400, 600 + thickness/2, 800, thickness, { 
        isStatic: true,
        render: { fillStyle: '#00ffff' },
        label: 'death_boundary'
      }),
      // Left wall
      this.Matter.Bodies.rectangle(-thickness/2, 300, thickness, 600, { 
        isStatic: true,
        render: { fillStyle: '#00ffff' },
        label: 'death_boundary'
      }),
      // Right wall
      this.Matter.Bodies.rectangle(800 + thickness/2, 300, thickness, 600, { 
        isStatic: true,
        render: { fillStyle: '#00ffff' },
        label: 'death_boundary'
      })
    ];

    this.Matter.Composite.add(this.engine.world, walls);
  }

  private async createObstacles() {
    if (!this.Matter) return;
    
    // Create a satellite (heavy, slow-moving obstacle) - 중앙에 배치
    const satellite = new Satellite(400, 300, 30);
    await satellite.createMatterBody(this.Matter);
    this.Matter.Composite.add(this.engine.world, satellite.body);
    this.obstacles.push(satellite);

    // Create some asteroids - 스폰 포인트와 겹치지 않는 위치에 배치
    const asteroid1 = new Asteroid(250, 200, 15, 'medium');
    const asteroid2 = new Asteroid(550, 400, 10, 'small');
    const asteroid3 = new Asteroid(350, 450, 12, 'small');
    
    await asteroid1.createMatterBody(this.Matter);
    await asteroid2.createMatterBody(this.Matter);
    await asteroid3.createMatterBody(this.Matter);
    
    this.Matter.Composite.add(this.engine.world, [asteroid1.body, asteroid2.body, asteroid3.body]);
    this.obstacles.push(asteroid1, asteroid2, asteroid3);
  }

  private setupCollisionDetection() {
    if (!this.Matter) return;
    
    this.Matter.Events.on(this.engine, 'collisionStart', (event: any) => {
      const pairs = event.pairs;
      
      for (let pair of pairs) {
        const { bodyA, bodyB } = pair;
        
        // Find which body is a player
        const playerBody = Object.values(this.players).find(p => p.body === bodyA || p.body === bodyB);
        if (!playerBody) continue;

        const otherBody = playerBody.body === bodyA ? bodyB : bodyA;
        
        // Check if hit death boundary
        if (otherBody.label === 'death_boundary') {
          playerBody.isAlive = false;
          
          // Release spawn point when player dies
          this.releaseSpawnPoint(playerBody.body.position);
          
          // Find player ID and notify
          const playerId = Object.keys(this.players).find(id => this.players[id] === playerBody);
          if (playerId) {
            this.onPlayerDeath(playerId);
          }
        }
      }
    });
  }

  // Add or update a player in the physics world
  async addOrUpdatePlayer(playerData: GamePlayer) {
    if (!this.Matter || !this.isInitialized) return;

    let player = this.players[playerData.id];
    
    if (!player) {
      // Create new player with spawn point
      const spawnPoint = this.getAvailableSpawnPoint();
      
      player = new Spaceship(spawnPoint.x, spawnPoint.y);
      await player.createMatterBody(this.Matter);
      
      // Set initial direction to face center
      player.direction = spawnPoint.direction;
      
      // Set player color
      if (player.body && player.body.render) {
        player.body.render.fillStyle = playerData.color;
      }
      
      this.Matter.Composite.add(this.engine.world, player.body);
      this.players[playerData.id] = player;
      
      console.log(`Player ${playerData.display_name} spawned at (${Math.round(spawnPoint.x)}, ${Math.round(spawnPoint.y)}) facing ${Math.round(spawnPoint.direction)}°`);
    } else {
      // Update existing player position and state (only if significant change)
      const currentPos = player.body.position;
      const distance = Math.sqrt(
        Math.pow(currentPos.x - playerData.position_x, 2) + 
        Math.pow(currentPos.y - playerData.position_y, 2)
      );
      
      // Only update if position changed significantly (prevents jitter)
      if (distance > 5) {
        this.Matter.Body.setPosition(player.body, {
          x: playerData.position_x,
          y: playerData.position_y
        });
        
        this.Matter.Body.setVelocity(player.body, {
          x: playerData.velocity_x,
          y: playerData.velocity_y
        });
      }
      
      this.Matter.Body.setAngle(player.body, ((playerData.direction - 90) * Math.PI) / 180);
      
      player.direction = playerData.direction;
      player.isAlive = playerData.is_alive;
      player.isThrusting = playerData.is_thrusting;
    }
  }

  // Remove a player from physics world
  removePlayer(playerId: string) {
    const player = this.players[playerId];
    if (player && player.body && this.Matter) {
      // Release spawn point
      this.releaseSpawnPoint(player.body.position);
      
      this.Matter.Composite.remove(this.engine.world, player.body);
      delete this.players[playerId];
    }
  }

  // Handle input for current player
  handlePlayerInput(inputType: 'rotate_left' | 'rotate_right' | 'thrust') {
    const currentPlayer = this.players[this.currentPlayerId];
    if (!currentPlayer || !currentPlayer.isAlive || !this.Matter) return;

    const rotationSpeed = 3; // degrees per frame
    const thrustForce = 0.001;

    switch (inputType) {
      case 'rotate_left':
        currentPlayer.direction -= rotationSpeed;
        if (currentPlayer.direction < 0) currentPlayer.direction += 360;
        break;
        
      case 'rotate_right':
        currentPlayer.direction += rotationSpeed;
        if (currentPlayer.direction >= 360) currentPlayer.direction -= 360;
        break;
        
      case 'thrust':
        const radians = ((currentPlayer.direction - 90) * Math.PI) / 180;
        const thrust = {
          x: Math.cos(radians) * thrustForce,
          y: Math.sin(radians) * thrustForce
        };
        
        this.Matter.Body.applyForce(currentPlayer.body, currentPlayer.body.position, thrust);
        currentPlayer.isThrusting = true;
        break;
    }

    // Update visual angle
    if (currentPlayer.body) {
      this.Matter.Body.setAngle(currentPlayer.body, ((currentPlayer.direction - 90) * Math.PI) / 180);
    }
  }

  // Get current player data for server sync
  getCurrentPlayerData() {
    const player = this.players[this.currentPlayerId];
    if (!player || !player.body) return null;

    return {
      position_x: player.body.position.x,
      position_y: player.body.position.y,
      velocity_x: player.body.velocity.x,
      velocity_y: player.body.velocity.y,
      direction: player.direction,
      is_alive: player.isAlive,
      is_thrusting: player.isThrusting
    };
  }

  // Update physics simulation
  update() {
    if (!this.isInitialized) return;

    // Update all players
    Object.values(this.players).forEach(player => {
      player.update();
      
      // Reset thrusting after each frame
      if (player.isThrusting) {
        player.isThrusting = false;
      }
    });

    // Update obstacles
    this.obstacles.forEach(obstacle => obstacle.update());

    // Send current player data to server
    const currentPlayerData = this.getCurrentPlayerData();
    if (currentPlayerData) {
      this.onPlayerUpdate(this.currentPlayerId, currentPlayerData);
    }
  }

  // Get all players for rendering
  getAllPlayers() {
    return Object.entries(this.players).map(([id, player]) => ({
      id,
      player,
      body: player.body
    }));
  }

  // Get obstacles for rendering
  getObstacles() {
    return this.obstacles;
  }

  // Get spawn points for debugging (optional)
  getSpawnPoints() {
    return this.spawnPoints;
  }

  // Clean up
  destroy() {
    if (!this.Matter || !this.runner) return;
    
    this.Matter.Runner.stop(this.runner);
    this.Matter.Engine.clear(this.engine);
    this.usedSpawnPoints.clear();
  }
}
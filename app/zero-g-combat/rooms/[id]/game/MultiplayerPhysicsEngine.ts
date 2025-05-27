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
    this.initializeMatter();
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
    
    // Create a satellite (heavy, slow-moving obstacle)
    const satellite = new Satellite(400, 200, 30);
    await satellite.createMatterBody(this.Matter);
    this.Matter.Composite.add(this.engine.world, satellite.body);
    this.obstacles.push(satellite);

    // Create some asteroids
    const asteroid1 = new Asteroid(200, 400, 15, 'medium');
    const asteroid2 = new Asteroid(600, 150, 10, 'small');
    
    await asteroid1.createMatterBody(this.Matter);
    await asteroid2.createMatterBody(this.Matter);
    
    this.Matter.Composite.add(this.engine.world, [asteroid1.body, asteroid2.body]);
    this.obstacles.push(asteroid1, asteroid2);
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
      // Create new player
      player = new Spaceship(playerData.position_x, playerData.position_y);
      await player.createMatterBody(this.Matter);
      
      // Set player color
      if (player.body && player.body.render) {
        player.body.render.fillStyle = playerData.color;
      }
      
      this.Matter.Composite.add(this.engine.world, player.body);
      this.players[playerData.id] = player;
    } else {
      // Update existing player position and state
      if (player.body) {
        this.Matter.Body.setPosition(player.body, {
          x: playerData.position_x,
          y: playerData.position_y
        });
        
        this.Matter.Body.setVelocity(player.body, {
          x: playerData.velocity_x,
          y: playerData.velocity_y
        });
        
        this.Matter.Body.setAngle(player.body, (playerData.direction * Math.PI) / 180);
      }
      
      player.direction = playerData.direction;
      player.isAlive = playerData.is_alive;
      player.isThrusting = playerData.is_thrusting;
    }
  }

  // Remove a player from physics world
  removePlayer(playerId: string) {
    const player = this.players[playerId];
    if (player && player.body && this.Matter) {
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

  // Clean up
  destroy() {
    if (!this.Matter || !this.runner) return;
    
    this.Matter.Runner.stop(this.runner);
    this.Matter.Engine.clear(this.engine);
  }
}
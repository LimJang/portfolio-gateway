'use client';

import { Spaceship, Asteroid, Satellite } from './GameObject';

export default class PhysicsEngine {
  private engine: any;
  private render: any;
  private runner: any;
  private canvas: HTMLCanvasElement;
  private player: Spaceship | null = null;
  private obstacles: (Asteroid | Satellite)[] = [];
  private keys: { [key: string]: boolean } = {};
  private Matter: any = null;
  private isInitialized: boolean = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
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
      console.error('Failed to load Matter.js:', error);
      // Show error message on canvas
      this.showError('Failed to load physics engine');
    }
  }

  private async setupPhysics() {
    if (!this.Matter) return;

    // Create Matter.js engine
    this.engine = this.Matter.Engine.create();
    this.engine.world.gravity.y = 0; // Zero gravity
    this.engine.world.gravity.x = 0;

    // Create renderer
    this.render = this.Matter.Render.create({
      canvas: this.canvas,
      engine: this.engine,
      options: {
        width: 800,
        height: 600,
        wireframes: false,
        background: 'transparent',
        showVelocity: false,
        showAngleIndicator: false,
        showCollisions: false,
      }
    });

    // Create boundaries
    this.createBoundaries();
    
    // Create obstacles
    await this.createObstacles();

    // Start renderer and runner
    this.Matter.Render.run(this.render);
    this.runner = this.Matter.Runner.create();
    this.Matter.Runner.run(this.runner, this.engine);

    // Set up input handling
    this.setupInputHandling();
    
    // Set up collision detection
    this.setupCollisionDetection();
  }

  private showError(message: string) {
    const ctx = this.canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#ff0000';
      ctx.font = '20px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(message, 400, 300);
      ctx.fillText('Please install Matter.js', 400, 330);
    }
  }

  private createBoundaries() {
    if (!this.Matter) return;
    
    const thickness = 10;
    const walls = [
      // Top wall
      this.Matter.Bodies.rectangle(400, -thickness/2, 800, thickness, { 
        isStatic: true,
        render: { fillStyle: '#00ffff' }
      }),
      // Bottom wall  
      this.Matter.Bodies.rectangle(400, 600 + thickness/2, 800, thickness, { 
        isStatic: true,
        render: { fillStyle: '#00ffff' }
      }),
      // Left wall
      this.Matter.Bodies.rectangle(-thickness/2, 300, thickness, 600, { 
        isStatic: true,
        render: { fillStyle: '#00ffff' }
      }),
      // Right wall
      this.Matter.Bodies.rectangle(800 + thickness/2, 300, thickness, 600, { 
        isStatic: true,
        render: { fillStyle: '#00ffff' }
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

  private setupInputHandling() {
    // Keyboard event listeners
    const handleKeyDown = (event: KeyboardEvent) => {
      this.keys[event.key.toLowerCase()] = true;
      // Prevent space bar from scrolling the page
      if (event.key === ' ') {
        event.preventDefault();
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      this.keys[event.key.toLowerCase()] = false;
      if (event.key === ' ') {
        event.preventDefault();
      }
    };

    this.canvas.addEventListener('keydown', handleKeyDown);
    this.canvas.addEventListener('keyup', handleKeyUp);
    
    // Make canvas focusable
    this.canvas.tabIndex = 0;
    this.canvas.focus();
  }

  private setupCollisionDetection() {
    if (!this.Matter) return;
    
    this.Matter.Events.on(this.engine, 'collisionStart', (event: any) => {
      const pairs = event.pairs;
      
      for (let pair of pairs) {
        const { bodyA, bodyB } = pair;
        
        // Check if player hit boundary (cyan walls)
        if (this.player && (bodyA === this.player.body || bodyB === this.player.body)) {
          const otherBody = bodyA === this.player.body ? bodyB : bodyA;
          
          // Check if hit boundary wall (they have cyan color)
          if (otherBody.render.fillStyle === '#00ffff') {
            this.player.isAlive = false;
          }
        }
      }
    });
  }

  async createPlayer(x: number, y: number): Promise<Spaceship | null> {
    if (!this.Matter) return null;
    
    this.player = new Spaceship(x, y);
    await this.player.createMatterBody(this.Matter);
    this.Matter.Composite.add(this.engine.world, this.player.body);
    return this.player;
  }

  update() {
    if (!this.player || !this.Matter || !this.isInitialized) return;

    // Handle input
    this.handlePlayerInput();
    
    // Update all game objects
    this.player.update();
    this.obstacles.forEach(obstacle => obstacle.update());
  }

  private handlePlayerInput() {
    if (!this.player || !this.Matter) return;

    const rotationSpeed = 3; // degrees per frame
    const thrustForce = 0.001;
    
    // A/D keys for rotation
    if (this.keys['a']) {
      this.player.direction -= rotationSpeed;
      if (this.player.direction < 0) this.player.direction += 360;
    }
    if (this.keys['d']) {
      this.player.direction += rotationSpeed;
      if (this.player.direction >= 360) this.player.direction -= 360;
    }

    // SPACE for thrust in current direction
    if (this.keys[' ']) {
      // 삼각형이 위쪽(0도)을 향하도록 설정되어 있으므로
      // direction에서 90도를 빼서 올바른 방향으로 추진
      const radians = ((this.player.direction - 90) * Math.PI) / 180;
      const thrust = {
        x: Math.cos(radians) * thrustForce,
        y: Math.sin(radians) * thrustForce
      };
      
      this.Matter.Body.applyForce(this.player.body, this.player.body.position, thrust);
      this.player.isThrusting = true;
    } else {
      this.player.isThrusting = false;
    }
  }

  getPlayerData() {
    if (!this.player) return null;
    
    return {
      position: this.player.body.position || { x: 0, y: 0 },
      velocity: this.player.body.velocity || { x: 0, y: 0 },
      direction: this.player.direction,
      isAlive: this.player.isAlive
    };
  }

  destroy() {
    if (!this.Matter || !this.render || !this.runner) return;
    
    this.Matter.Render.stop(this.render);
    this.Matter.Runner.stop(this.runner);
    this.Matter.Engine.clear(this.engine);
  }
}
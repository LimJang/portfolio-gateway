'use client';

import Matter from 'matter-js';
import { Spaceship, Asteroid, Satellite } from './GameObject';

export default class PhysicsEngine {
  private engine: Matter.Engine;
  private render: Matter.Render;
  private runner: Matter.Runner;
  private canvas: HTMLCanvasElement;
  private player: Spaceship | null = null;
  private obstacles: (Asteroid | Satellite)[] = [];
  private keys: { [key: string]: boolean } = {};

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    
    // Create Matter.js engine
    this.engine = Matter.Engine.create();
    this.engine.world.gravity.y = 0; // Zero gravity
    this.engine.world.gravity.x = 0;

    // Create renderer
    this.render = Matter.Render.create({
      canvas: canvas,
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
    this.createObstacles();

    // Start renderer and runner
    Matter.Render.run(this.render);
    this.runner = Matter.Runner.create();
    Matter.Runner.run(this.runner, this.engine);

    // Set up input handling
    this.setupInputHandling();
    
    // Set up collision detection
    this.setupCollisionDetection();
  }

  private createBoundaries() {
    const thickness = 10;
    const walls = [
      // Top wall
      Matter.Bodies.rectangle(400, -thickness/2, 800, thickness, { 
        isStatic: true,
        render: { fillStyle: '#ff0000' }
      }),
      // Bottom wall  
      Matter.Bodies.rectangle(400, 600 + thickness/2, 800, thickness, { 
        isStatic: true,
        render: { fillStyle: '#ff0000' }
      }),
      // Left wall
      Matter.Bodies.rectangle(-thickness/2, 300, thickness, 600, { 
        isStatic: true,
        render: { fillStyle: '#ff0000' }
      }),
      // Right wall
      Matter.Bodies.rectangle(800 + thickness/2, 300, thickness, 600, { 
        isStatic: true,
        render: { fillStyle: '#ff0000' }
      })
    ];

    Matter.Composite.add(this.engine.world, walls);
  }

  private createObstacles() {
    // Create a satellite (heavy, slow-moving obstacle)
    const satellite = new Satellite(400, 200, 30);
    Matter.Composite.add(this.engine.world, satellite.body);
    this.obstacles.push(satellite);

    // Create some asteroids
    const asteroid1 = new Asteroid(200, 400, 15, 'medium');
    const asteroid2 = new Asteroid(600, 150, 10, 'small');
    
    Matter.Composite.add(this.engine.world, [asteroid1.body, asteroid2.body]);
    this.obstacles.push(asteroid1, asteroid2);
  }

  private setupInputHandling() {
    // Keyboard event listeners
    const handleKeyDown = (event: KeyboardEvent) => {
      this.keys[event.key.toLowerCase()] = true;
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      this.keys[event.key.toLowerCase()] = false;
    };

    this.canvas.addEventListener('keydown', handleKeyDown);
    this.canvas.addEventListener('keyup', handleKeyUp);
    
    // Make canvas focusable
    this.canvas.tabIndex = 0;
    this.canvas.focus();
  }

  private setupCollisionDetection() {
    Matter.Events.on(this.engine, 'collisionStart', (event) => {
      const pairs = event.pairs;
      
      for (let pair of pairs) {
        const { bodyA, bodyB } = pair;
        
        // Check if player hit boundary (red walls)
        if (this.player && (bodyA === this.player.body || bodyB === this.player.body)) {
          const otherBody = bodyA === this.player.body ? bodyB : bodyA;
          
          // Check if hit boundary wall (they have red color)
          if (otherBody.render.fillStyle === '#ff0000') {
            this.player.isAlive = false;
          }
        }
      }
    });
  }

  createPlayer(x: number, y: number): Spaceship {
    this.player = new Spaceship(x, y);
    Matter.Composite.add(this.engine.world, this.player.body);
    return this.player;
  }

  update() {
    if (!this.player) return;

    // Handle input
    this.handlePlayerInput();
    
    // Update all game objects
    this.player.update();
    this.obstacles.forEach(obstacle => obstacle.update());
  }

  private handlePlayerInput() {
    if (!this.player) return;

    const thrustForce = 0.001;
    let thrust = { x: 0, y: 0 };
    
    // Update direction based on WASD
    if (this.keys['w']) this.player.direction = 270; // Up
    if (this.keys['s']) this.player.direction = 90;  // Down  
    if (this.keys['a']) this.player.direction = 180; // Left
    if (this.keys['d']) this.player.direction = 0;   // Right
    
    // Diagonal directions
    if (this.keys['w'] && this.keys['a']) this.player.direction = 225; // Up-Left
    if (this.keys['w'] && this.keys['d']) this.player.direction = 315; // Up-Right
    if (this.keys['s'] && this.keys['a']) this.player.direction = 135; // Down-Left
    if (this.keys['s'] && this.keys['d']) this.player.direction = 45;  // Down-Right

    // Apply thrust with SPACE
    if (this.keys[' ']) {
      const radians = (this.player.direction * Math.PI) / 180;
      thrust.x = Math.cos(radians) * thrustForce;
      thrust.y = Math.sin(radians) * thrustForce;
      
      Matter.Body.applyForce(this.player.body, this.player.body.position, thrust);
      this.player.isThrusting = true;
    } else {
      this.player.isThrusting = false;
    }
  }

  getPlayerData() {
    if (!this.player) return null;
    
    return {
      position: this.player.body.position,
      velocity: this.player.body.velocity,
      direction: this.player.direction,
      isAlive: this.player.isAlive
    };
  }

  destroy() {
    Matter.Render.stop(this.render);
    Matter.Runner.stop(this.runner);
    Matter.Engine.clear(this.engine);
  }
}

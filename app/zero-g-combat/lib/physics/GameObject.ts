import Matter from 'matter-js';

export abstract class GameObject {
  public body: Matter.Body;
  public mass: number;
  
  constructor(x: number, y: number, mass: number) {
    this.mass = mass;
    this.body = this.createBody(x, y);
  }

  protected abstract createBody(x: number, y: number): Matter.Body;
  
  public update() {
    // Override in subclasses for specific behavior
  }
}

export class Spaceship extends GameObject {
  public direction: number = 0; // 0-360 degrees
  public isAlive: boolean = true;
  public isThrusting: boolean = false;

  constructor(x: number, y: number) {
    super(x, y, 10); // Base mass of 10
  }

  protected createBody(x: number, y: number): Matter.Body {
    const body = Matter.Bodies.circle(x, y, 12, {
      density: 0.001,
      frictionAir: 0.001, // Very minimal air resistance
      restitution: 0.8,   // Bouncy
      render: {
        fillStyle: '#00ff00',
        strokeStyle: '#ffffff',
        lineWidth: 2
      }
    });

    return body;
  }

  public update() {
    // Update visual representation based on thrust
    if (this.isThrusting) {
      this.body.render.fillStyle = '#ffff00'; // Yellow when thrusting
    } else {
      this.body.render.fillStyle = this.isAlive ? '#00ff00' : '#ff0000';
    }

    // Add direction indicator (small line)
    // This would be better handled in a custom render function
  }
}

export class Satellite extends GameObject {
  private driftVelocity: { x: number, y: number };

  constructor(x: number, y: number, radius: number) {
    super(x, y, 50); // Heavy mass
    
    // Set random slow drift
    this.driftVelocity = {
      x: (Math.random() - 0.5) * 0.5,
      y: (Math.random() - 0.5) * 0.5
    };
  }

  protected createBody(x: number, y: number): Matter.Body {
    const body = Matter.Bodies.rectangle(x, y, 40, 60, {
      density: 0.01,
      frictionAir: 0.001,
      restitution: 0.6,
      render: {
        fillStyle: '#888888',
        strokeStyle: '#ffffff',
        lineWidth: 1
      }
    });

    return body;
  }

  public update() {
    // Apply slow drift movement
    Matter.Body.applyForce(
      this.body, 
      this.body.position, 
      {
        x: this.driftVelocity.x * 0.0001,
        y: this.driftVelocity.y * 0.0001
      }
    );
  }
}

export class Asteroid extends GameObject {
  private rotationSpeed: number;
  private size: 'small' | 'medium' | 'large';

  constructor(x: number, y: number, mass: number, size: 'small' | 'medium' | 'large') {
    super(x, y, mass);
    this.size = size;
    this.rotationSpeed = (Math.random() - 0.5) * 0.02;
  }

  protected createBody(x: number, y: number): Matter.Body {
    const sizeMap = {
      'small': 8,
      'medium': 15,
      'large': 25
    };
    
    const radius = sizeMap[this.size];
    
    const body = Matter.Bodies.polygon(x, y, 6, radius, {
      density: 0.005,
      frictionAir: 0.001,
      restitution: 0.7,
      render: {
        fillStyle: '#8B4513',
        strokeStyle: '#CD853F',
        lineWidth: 1
      }
    });

    // Give it some initial random velocity
    Matter.Body.setVelocity(body, {
      x: (Math.random() - 0.5) * 2,
      y: (Math.random() - 0.5) * 2
    });

    return body;
  }

  public update() {
    // Rotate the asteroid
    Matter.Body.rotate(this.body, this.rotationSpeed);
  }
}

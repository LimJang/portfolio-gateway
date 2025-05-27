// GameObject.ts - Browser-safe implementation

export abstract class GameObject {
  public body: any;
  public mass: number;
  
  constructor(x: number, y: number, mass: number) {
    this.mass = mass;
    this.body = this.createBody(x, y);
  }

  protected abstract createBody(x: number, y: number): any;
  
  public update() {
    // Override in subclasses for specific behavior
  }
}

export class Spaceship extends GameObject {
  public direction: number = 0; // 0-360 degrees
  public isAlive: boolean = true;
  public isThrusting: boolean = false;
  private Matter: any = null;

  constructor(x: number, y: number) {
    super(x, y, 10); // Base mass of 10
    this.initMatter();
  }

  private async initMatter() {
    try {
      const MatterModule = await import('matter-js');
      this.Matter = MatterModule.default;
    } catch (error) {
      console.error('Failed to load Matter.js in Spaceship:', error);
    }
  }

  protected createBody(x: number, y: number): any {
    // Return a placeholder until Matter.js loads
    return {
      position: { x, y },
      velocity: { x: 0, y: 0 },
      render: {
        fillStyle: '#00ff00',
        strokeStyle: '#ffffff',
        lineWidth: 2
      }
    };
  }

  public async createMatterBody(Matter: any): Promise<any> {
    if (!Matter) return this.body;

    // Create triangle shape for directional visibility
    // 삼각형이 위쪽(0도)을 향하도록 설정
    const vertices = [
      { x: 0, y: -15 },    // Front point (위쪽)
      { x: -8, y: 10 },    // Back left (아래쪽 왼쪽)
      { x: 8, y: 10 }      // Back right (아래쪽 오른쪽)
    ];

    this.body = Matter.Bodies.fromVertices(this.body.position.x, this.body.position.y, [vertices], {
      density: 0.001,
      frictionAir: 0.001, // Very minimal air resistance
      restitution: 0.8,   // Bouncy
      render: {
        fillStyle: '#00ff00',
        strokeStyle: '#ffffff',
        lineWidth: 2
      }
    });

    return this.body;
  }

  public update() {
    if (!this.body || !this.body.render || !this.Matter) return;
    
    // 삼각형의 앞쪽이 direction과 일치하도록 회전
    // direction 0도 = 위쪽, 90도 = 오른쪽, 180도 = 아래쪽, 270도 = 왼쪽
    const targetAngle = ((this.direction - 90) * Math.PI) / 180;
    this.Matter.Body.setAngle(this.body, targetAngle);
    
    // Update visual representation based on thrust
    if (this.isThrusting) {
      this.body.render.fillStyle = '#ffff00'; // Yellow when thrusting
    } else {
      this.body.render.fillStyle = this.isAlive ? '#00ff00' : '#ff0000';
    }
  }
}

export class Satellite extends GameObject {
  private driftVelocity: { x: number, y: number };
  private Matter: any = null;

  constructor(x: number, y: number, radius: number) {
    super(x, y, 50); // Heavy mass
    
    // Set random slow drift
    this.driftVelocity = {
      x: (Math.random() - 0.5) * 0.5,
      y: (Math.random() - 0.5) * 0.5
    };
    
    this.initMatter();
  }

  private async initMatter() {
    try {
      const MatterModule = await import('matter-js');
      this.Matter = MatterModule.default;
    } catch (error) {
      console.error('Failed to load Matter.js in Satellite:', error);
    }
  }

  protected createBody(x: number, y: number): any {
    // Return a placeholder until Matter.js loads
    return {
      position: { x, y },
      velocity: { x: 0, y: 0 },
      render: {
        fillStyle: '#888888',
        strokeStyle: '#ffffff',
        lineWidth: 1
      }
    };
  }

  public async createMatterBody(Matter: any): Promise<any> {
    if (!Matter) return this.body;

    this.body = Matter.Bodies.rectangle(this.body.position.x, this.body.position.y, 40, 60, {
      density: 0.01,
      frictionAir: 0.001,
      restitution: 0.6,
      render: {
        fillStyle: '#888888',
        strokeStyle: '#ffffff',
        lineWidth: 1
      }
    });

    return this.body;
  }

  public update() {
    if (!this.body || !this.Matter) return;
    
    // Apply slow drift movement
    this.Matter.Body.applyForce(
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
  private Matter: any = null;

  constructor(x: number, y: number, mass: number, size: 'small' | 'medium' | 'large') {
    super(x, y, mass);
    this.size = size;
    this.rotationSpeed = (Math.random() - 0.5) * 0.02;
    this.initMatter();
  }

  private async initMatter() {
    try {
      const MatterModule = await import('matter-js');
      this.Matter = MatterModule.default;
    } catch (error) {
      console.error('Failed to load Matter.js in Asteroid:', error);
    }
  }

  protected createBody(x: number, y: number): any {
    // Return a placeholder until Matter.js loads
    return {
      position: { x, y },
      velocity: { x: 0, y: 0 },
      render: {
        fillStyle: '#8B4513',
        strokeStyle: '#CD853F',
        lineWidth: 1
      }
    };
  }

  public async createMatterBody(Matter: any): Promise<any> {
    if (!Matter) return this.body;

    const sizeMap = {
      'small': 8,
      'medium': 15,
      'large': 25
    };
    
    const radius = sizeMap[this.size];
    
    this.body = Matter.Bodies.polygon(this.body.position.x, this.body.position.y, 6, radius, {
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
    Matter.Body.setVelocity(this.body, {
      x: (Math.random() - 0.5) * 2,
      y: (Math.random() - 0.5) * 2
    });

    return this.body;
  }

  public update() {
    if (!this.body || !this.Matter) return;
    
    // Rotate the asteroid
    this.Matter.Body.rotate(this.body, this.rotationSpeed);
  }
}
// Game Constants
export const GAME_CONFIG = {
  MAX_PLAYERS: 8,
  ROOM_CODE_LENGTH: 6,
  GAME_LOOP_FPS: 60,
  SPAWN_RADIUS: 200,
  MAP_WIDTH: 800,
  MAP_HEIGHT: 600,
  THRUST_FORCE: 0.001,
  ROTATION_SPEED: 3, // degrees per frame
} as const;

// Player Colors
export const PLAYER_COLORS = [
  '#ff0000', // Red
  '#0000ff', // Blue  
  '#ffff00', // Yellow
  '#ff00ff', // Magenta
  '#00ffff', // Cyan
  '#ffa500', // Orange
  '#800080', // Purple
  '#00ff00', // Green
] as const;

// Physics Constants
export const PHYSICS_CONFIG = {
  GRAVITY_X: 0,
  GRAVITY_Y: 0,
  BOUNDARY_THICKNESS: 10,
  SPACESHIP_MASS: 10,
  SATELLITE_MASS: 50,
  ASTEROID_MASS_RANGE: [5, 30],
} as const;

// Network Constants
export const NETWORK_CONFIG = {
  UPDATE_RATE: 20, // FPS for network updates
  INTERPOLATION_DELAY: 100, // ms
  MAX_PREDICTION_TIME: 200, // ms
} as const;

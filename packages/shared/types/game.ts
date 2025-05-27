// Game Types
export interface GameRoom {
  id: string;
  room_code: string;
  room_name: string;
  max_players: number;
  current_players: number;
  status: 'waiting' | 'playing' | 'finished';
  host_user_id: string;
  host_username: string;
  created_at: string;
}

export interface GamePlayer {
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
  joined_at: string;
}

export interface SpawnPoint {
  x: number;
  y: number;
  direction: number;
}

// Physics Types
export interface Vector2 {
  x: number;
  y: number;
}

export interface PhysicsObject {
  position: Vector2;
  velocity: Vector2;
  direction: number;
  mass: number;
}

// Socket Events
export interface ServerToClientEvents {
  gameStateUpdate: (gameState: GameState) => void;
  playerJoined: (player: GamePlayer) => void;
  playerLeft: (playerId: string) => void;
  playerDied: (playerId: string) => void;
  gameStarted: () => void;
  gameEnded: (winner: string) => void;
  roomUpdated: (room: GameRoom) => void;
}

export interface ClientToServerEvents {
  joinRoom: (roomCode: string, playerData: Partial<GamePlayer>) => void;
  leaveRoom: () => void;
  playerInput: (input: PlayerInput) => void;
  startGame: () => void;
}

export interface GameState {
  room: GameRoom;
  players: GamePlayer[];
  obstacles: PhysicsObject[];
  gameTime: number;
}

export interface PlayerInput {
  type: 'rotate_left' | 'rotate_right' | 'thrust';
  timestamp: number;
}

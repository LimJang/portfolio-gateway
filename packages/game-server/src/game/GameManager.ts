import { Server, Socket } from 'socket.io';
import { GameRoom } from './GameRoom';
import { v4 as uuidv4 } from 'uuid';

export class GameManager {
  private io: Server;
  private rooms: Map<string, GameRoom> = new Map();
  private playerRooms: Map<string, string> = new Map(); // socketId -> roomId

  constructor(io: Server) {
    this.io = io;
  }

  handleConnection(socket: Socket) {
    // Join room by code
    socket.on('joinRoom', (roomCode: string, playerData: any) => {
      this.handleJoinRoom(socket, roomCode, playerData);
    });

    // Create new room
    socket.on('createRoom', (roomData: any) => {
      this.handleCreateRoom(socket, roomData);
    });

    // Player input
    socket.on('playerInput', (inputData: any) => {
      this.handlePlayerInput(socket, inputData);
    });

    // Start game
    socket.on('startGame', () => {
      this.handleStartGame(socket);
    });

    // Leave room
    socket.on('leaveRoom', () => {
      this.handleLeaveRoom(socket);
    });
  }

  handleDisconnection(socket: Socket) {
    const roomId = this.playerRooms.get(socket.id);
    if (roomId) {
      const room = this.rooms.get(roomId);
      if (room) {
        room.removePlayer(socket.id);
        
        // Clean up empty rooms
        if (room.getPlayerCount() === 0) {
          this.rooms.delete(roomId);
          console.log(`Room ${roomId} deleted (empty)`);
        }
      }
      this.playerRooms.delete(socket.id);
    }
  }

  private handleJoinRoom(socket: Socket, roomCode: string, playerData: any) {
    // Find room by code
    let targetRoom: GameRoom | undefined;
    for (const room of this.rooms.values()) {
      if (room.getRoomCode() === roomCode.toUpperCase()) {
        targetRoom = room;
        break;
      }
    }

    if (!targetRoom) {
      socket.emit('error', { message: 'Room not found' });
      return;
    }

    if (targetRoom.isFull()) {
      socket.emit('error', { message: 'Room is full' });
      return;
    }

    // Add player to room
    const success = targetRoom.addPlayer(socket, playerData);
    if (success) {
      this.playerRooms.set(socket.id, targetRoom.getId());
      socket.emit('joinedRoom', { room: targetRoom.getRoomData() });
    } else {
      socket.emit('error', { message: 'Failed to join room' });
    }
  }

  private handleCreateRoom(socket: Socket, roomData: any) {
    const roomId = uuidv4();
    const roomCode = this.generateRoomCode();
    
    const room = new GameRoom(roomId, roomCode, roomData.roomName, this.io);
    this.rooms.set(roomId, room);

    // Add creator as first player
    const success = room.addPlayer(socket, roomData.hostPlayer);
    if (success) {
      this.playerRooms.set(socket.id, roomId);
      socket.emit('roomCreated', { room: room.getRoomData() });
      console.log(`Room created: ${roomCode} (${roomId})`);
    } else {
      this.rooms.delete(roomId);
      socket.emit('error', { message: 'Failed to create room' });
    }
  }

  private handlePlayerInput(socket: Socket, inputData: any) {
    const roomId = this.playerRooms.get(socket.id);
    if (roomId) {
      const room = this.rooms.get(roomId);
      if (room) {
        room.handlePlayerInput(socket.id, inputData);
      }
    }
  }

  private handleStartGame(socket: Socket) {
    const roomId = this.playerRooms.get(socket.id);
    if (roomId) {
      const room = this.rooms.get(roomId);
      if (room && room.isHost(socket.id)) {
        room.startGame();
      }
    }
  }

  private handleLeaveRoom(socket: Socket) {
    const roomId = this.playerRooms.get(socket.id);
    if (roomId) {
      const room = this.rooms.get(roomId);
      if (room) {
        room.removePlayer(socket.id);
        
        if (room.getPlayerCount() === 0) {
          this.rooms.delete(roomId);
        }
      }
      this.playerRooms.delete(socket.id);
    }
  }

  private generateRoomCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    // Ensure uniqueness
    for (const room of this.rooms.values()) {
      if (room.getRoomCode() === result) {
        return this.generateRoomCode(); // Recursive retry
      }
    }
    
    return result;
  }

  getActiveRoomsCount(): number {
    return this.rooms.size;
  }

  getActivePlayersCount(): number {
    let count = 0;
    for (const room of this.rooms.values()) {
      count += room.getPlayerCount();
    }
    return count;
  }

  shutdown() {
    console.log('Shutting down GameManager...');
    for (const room of this.rooms.values()) {
      room.shutdown();
    }
    this.rooms.clear();
    this.playerRooms.clear();
  }
}

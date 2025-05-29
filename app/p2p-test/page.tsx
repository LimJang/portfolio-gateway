'use client';

import { useState, useEffect, useRef } from 'react';
import Peer, { DataConnection } from 'peerjs';

interface ConnectionLog {
  time: string;
  status: 'info' | 'success' | 'error' | 'warning';
  message: string;
}

export default function P2PNATTestPage() {
  const [myPeerId, setMyPeerId] = useState<string>('');
  const [targetPeerId, setTargetPeerId] = useState<string>('');
  const [peer, setPeer] = useState<Peer | null>(null);
  const [connection, setConnection] = useState<DataConnection | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<string>('초기화');
  const [logs, setLogs] = useState<ConnectionLog[]>([]);
  const [natType, setNatType] = useState<string>('');
  const [messageInput, setMessageInput] = useState<string>('');
  const [messages, setMessages] = useState<string[]>([]);
  const [currentAttempt, setCurrentAttempt] = useState<number>(0);
  const [maxAttempts] = useState<number>(3);

  const addLog = (status: 'info' | 'success' | 'error' | 'warning', message: string) => {
    const log: ConnectionLog = {
      time: new Date().toLocaleTimeString(),
      status,
      message
    };
    setLogs(prev => [...prev.slice(-15), log]);
  };

  // 고급 ICE 서버 설정 (NAT 통과 최적화)
  const getICEServers = () => [
    // Google STUN (가장 신뢰성 높음)
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    
    // 추가 STUN 서버들
    { urls: 'stun:stun.ekiga.net:3478' },
    { urls: 'stun:stun.voipcheap.co.uk:3478' },
    { urls: 'stun:stun.voipbuster.com:3478' },
    
    // 무료 TURN 서버들 (NAT 통과 핵심)
    {
      urls: 'turn:openrelay.metered.ca:80',
      username: 'openrelayproject',
      credential: 'openrelayproject'
    },
    {
      urls: 'turn:openrelay.metered.ca:443',
      username: 'openrelayproject',
      credential: 'openrelayproject'
    },
    {
      urls: 'turn:openrelay.metered.ca:443?transport=tcp',
      username: 'openrelayproject',
      credential: 'openrelayproject'
    }
  ];

  // NAT 타입 탐지
  const detectNAT = async () => {
    addLog('info', '🔍 NAT 타입 탐지 시작...');
    
    try {
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      });
      
      pc.createDataChannel('test');
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      
      let hostFound = false;
      let srflxFound = false;
      let relayFound = false;
      
      await new Promise<void>((resolve) => {
        pc.onicecandidate = (event) => {
          if (event.candidate) {
            const candidate = event.candidate.candidate;
            if (candidate.includes('typ host')) hostFound = true;
            if (candidate.includes('typ srflx')) srflxFound = true;
            if (candidate.includes('typ relay')) relayFound = true;
            
            addLog('info', `ICE 후보: ${candidate.split(' ')[2]} (${candidate.split(' ')[7]})`);
          } else {
            let natResult = '';
            if (srflxFound && hostFound) {
              natResult = '🟢 Cone NAT - 연결 가능성 높음';
            } else if (hostFound && !srflxFound) {
              natResult = '🟡 Symmetric NAT - TURN 서버 필요';
            } else if (!hostFound && !srflxFound) {
              natResult = '🔴 방화벽/차단 - 연결 매우 어려움';
            } else {
              natResult = '🟠 알 수 없는 NAT 타입';
            }
            
            setNatType(natResult);
            addLog('success', `NAT 타입: ${natResult}`);
            resolve();
          }
        };
        
        setTimeout(() => {
          setNatType('⏰ NAT 탐지 타임아웃');
          addLog('error', 'NAT 탐지 타임아웃 (5초)');
          resolve();
        }, 5000);
      });
      
      pc.close();
    } catch (error) {
      addLog('error', `NAT 탐지 실패: ${error}`);
      setNatType('❌ NAT 탐지 실패');
    }
  };

  // Peer 생성 (NAT 통과 최적화)
  const createPeer = async () => {
    if (peer) {
      peer.destroy();
    }

    const newPeerId = 'NAT_' + Math.random().toString(36).substr(2, 8).toUpperCase();
    
    try {
      addLog('info', `🌐 Peer 생성 시도: ${newPeerId}`);
      setConnectionStatus('Peer 생성 중...');
      
      const newPeer = new Peer(newPeerId, {
        host: 'peerjs-server.herokuapp.com',
        port: 443,
        path: '/',
        secure: true,
        config: {
          iceServers: getICEServers(),
          // NAT 통과 최적화 설정
          iceCandidatePoolSize: 15,  // 더 많은 연결 경로
          iceTransportPolicy: 'all', // 모든 프로토콜 시도
          bundlePolicy: 'max-bundle',
          rtcpMuxPolicy: 'require'
        },
        debug: 2 // PeerJS 디버그 로그
      });

      newPeer.on('open', (id) => {
        setMyPeerId(id);
        setConnectionStatus('연결 준비 완료');
        addLog('success', `✅ Peer 생성 성공: ${id}`);
        addLog('info', `📋 위 ID를 복사해서 다른 기기에서 연결하세요`);
        
        // NAT 타입 탐지 시작
        detectNAT();
      });

      newPeer.on('error', (error) => {
        addLog('error', `❌ Peer 오류: ${error.type} - ${error.message}`);
        setConnectionStatus('Peer 생성 실패');
      });

      // 수신 연결 처리
      newPeer.on('connection', (conn) => {
        addLog('info', `📞 수신 연결: ${conn.peer}`);
        setupConnection(conn);
      });

      newPeer.on('disconnected', () => {
        addLog('warning', '⚠️ PeerJS 서버 연결 끊김');
        setTimeout(() => {
          if (newPeer && !newPeer.destroyed) {
            addLog('info', '🔄 자동 재연결 시도');
            newPeer.reconnect();
          }
        }, 3000);
      });

      setPeer(newPeer);

    } catch (error) {
      addLog('error', `Peer 생성 실패: ${error}`);
      setConnectionStatus('생성 실패');
    }
  };

  // 연결 설정
  const setupConnection = (conn: DataConnection) => {
    setConnection(conn);
    
    conn.on('open', () => {
      addLog('success', `🎉 P2P 연결 성공! ${conn.peer}`);
      setConnectionStatus('연결됨');
      
      // 연결 품질 테스트
      const pingData = { type: 'ping', timestamp: Date.now() };
      conn.send(pingData);
    });

    conn.on('data', (data: any) => {
      if (data.type === 'ping') {
        const latency = Date.now() - data.timestamp;
        addLog('success', `🏓 Ping: ${latency}ms`);
        // Pong 응답
        conn.send({ type: 'pong', timestamp: Date.now() });
      } else if (data.type === 'pong') {
        const latency = Date.now() - data.timestamp;
        addLog('success', `🏓 Pong: ${latency}ms`);
      } else if (data.type === 'message') {
        setMessages(prev => [...prev.slice(-10), `상대방: ${data.text}`]);
        addLog('info', `📨 메시지 수신: ${data.text}`);
      }
    });

    conn.on('close', () => {
      addLog('warning', '🔴 연결 종료');
      setConnectionStatus('연결 끊김');
      setConnection(null);
    });

    conn.on('error', (error) => {
      addLog('error', `연결 오류: ${error}`);
    });
  };

  // NAT 통과 연결 시도 (다단계 전략)
  const connectToPeer = async () => {
    if (!peer || !targetPeerId.trim()) {
      addLog('error', '❌ Peer ID를 입력하세요');
      return;
    }

    const cleanTargetId = targetPeerId.trim();
    setCurrentAttempt(prev => prev + 1);
    
    addLog('info', `🔗 NAT 통과 연결 시도 ${currentAttempt + 1}/${maxAttempts}`);
    addLog('info', `🎯 대상: ${cleanTargetId}`);
    setConnectionStatus('NAT 통과 시도 중...');

    try {
      // 고급 연결 옵션 (NAT 통과 최적화)
      const conn = peer.connect(cleanTargetId, {
        reliable: true,
        serialization: 'json',
        metadata: {
          natType: natType,
          timestamp: Date.now()
        }
      });

      // 연결 진행상황 모니터링
      const progressTimer = setInterval(() => {
        if (!conn.open) {
          const elapsed = Math.floor((Date.now() - Date.now()) / 1000);
          addLog('info', `⏳ NAT 통과 시도 중... (ICE 협상)`);
        } else {
          clearInterval(progressTimer);
        }
      }, 3000);

      // 연결 성공 처리
      conn.on('open', () => {
        clearInterval(progressTimer);
        addLog('success', '🎉 NAT 통과 성공! 연결 완료!');
        setupConnection(conn);
      });

      // 연결 실패 처리
      conn.on('error', (error) => {
        clearInterval(progressTimer);
        addLog('error', `❌ 연결 실패: ${error}`);
        
        if (currentAttempt < maxAttempts) {
          addLog('warning', `🔄 ${3}초 후 재시도 (${currentAttempt + 1}/${maxAttempts})`);
          setTimeout(() => connectToPeer(), 3000);
        } else {
          addLog('error', '💥 모든 연결 시도 실패');
          addLog('info', '🔧 해결책:');
          addLog('info', '  1. 양쪽 모두 모바일 핫스팟 사용');
          addLog('info', '  2. VPN 연결 후 재시도');
          addLog('info', '  3. 다른 네트워크에서 시도');
          setCurrentAttempt(0);
        }
      });

      // 30초 타임아웃 (NAT 통과는 시간이 오래 걸림)
      setTimeout(() => {
        if (!conn.open) {
          clearInterval(progressTimer);
          addLog('warning', '⏰ NAT 통과 타임아웃 (30초)');
        }
      }, 30000);

    } catch (error) {
      addLog('error', `연결 시도 실패: ${error}`);
    }
  };

  // 메시지 전송
  const sendMessage = () => {
    if (!connection || !messageInput.trim()) return;

    const messageData = {
      type: 'message',
      text: messageInput,
      timestamp: Date.now()
    };

    connection.send(messageData);
    setMessages(prev => [...prev.slice(-10), `나: ${messageInput}`]);
    addLog('info', `📤 메시지 전송: ${messageInput}`);
    setMessageInput('');
  };

  // 페이지 로드 시 자동으로 Peer 생성
  useEffect(() => {
    createPeer();
    return () => {
      if (peer) peer.destroy();
    };
  }, []);

  return (
    <div className="min-h-screen bg-black text-green-500 font-mono p-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8 text-green-400">
          🔥 P2P NAT 통과 마스터 테스트
        </h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 연결 제어 패널 */}
          <div className="bg-gray-900 border-2 border-green-500 rounded-lg p-4">
            <h2 className="text-xl font-bold mb-4 text-green-400">🎮 연결 제어</h2>
            
            {/* 내 Peer ID */}
            <div className="mb-4">
              <label className="block text-sm mb-2">내 Peer ID:</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={myPeerId}
                  readOnly
                  className="flex-1 p-2 bg-gray-800 border border-gray-600 rounded text-yellow-400 font-bold"
                  placeholder="Peer 생성 중..."
                />
                <button
                  onClick={() => navigator.clipboard.writeText(myPeerId)}
                  className="px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white text-sm"
                  disabled={!myPeerId}
                >
                  📋 복사
                </button>
              </div>
            </div>

            {/* NAT 상태 */}
            <div className="mb-4 p-2 bg-gray-800 rounded">
              <div className="text-sm text-gray-400">NAT 상태:</div>
              <div className="text-sm">{natType || '탐지 중...'}</div>
            </div>

            {/* 연결 상태 */}
            <div className="mb-4 p-2 bg-gray-800 rounded">
              <div className="text-sm text-gray-400">연결 상태:</div>
              <div className="text-sm">{connectionStatus}</div>
            </div>

            {/* 대상 Peer ID */}
            <div className="mb-4">
              <label className="block text-sm mb-2">연결할 Peer ID:</label>
              <input
                type="text"
                value={targetPeerId}
                onChange={(e) => setTargetPeerId(e.target.value)}
                className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white"
                placeholder="NAT_XXXXXXXX"
              />
            </div>

            {/* 연결 버튼 */}
            <button
              onClick={connectToPeer}
              disabled={!peer || !targetPeerId.trim() || connection?.open}
              className="w-full py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 rounded text-white font-bold"
            >
              🚀 NAT 통과 연결 시도
            </button>

            {/* 메시지 테스트 */}
            {connection?.open && (
              <div className="mt-4 pt-4 border-t border-gray-600">
                <h3 className="text-lg font-bold mb-2">💬 메시지 테스트</h3>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                    className="flex-1 p-2 bg-gray-800 border border-gray-600 rounded text-white"
                    placeholder="메시지 입력..."
                  />
                  <button
                    onClick={sendMessage}
                    className="px-3 py-2 bg-green-600 hover:bg-green-700 rounded text-white"
                  >
                    전송
                  </button>
                </div>
                
                {/* 메시지 목록 */}
                <div className="bg-gray-800 rounded p-2 h-32 overflow-y-auto">
                  {messages.map((msg, i) => (
                    <div key={i} className="text-sm text-gray-300">{msg}</div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 연결 로그 */}
          <div className="bg-gray-900 border-2 border-blue-500 rounded-lg p-4">
            <h2 className="text-xl font-bold mb-4 text-blue-400">📊 연결 로그</h2>
            
            <div className="bg-black border border-gray-600 rounded p-2 h-96 overflow-y-auto">
              {logs.map((log, i) => (
                <div key={i} className="text-xs mb-1">
                  <span className="text-gray-500">[{log.time}]</span>
                  <span className={`ml-2 ${
                    log.status === 'success' ? 'text-green-400' :
                    log.status === 'error' ? 'text-red-400' :
                    log.status === 'warning' ? 'text-yellow-400' :
                    'text-gray-300'
                  }`}>
                    {log.message}
                  </span>
                </div>
              ))}
            </div>
            
            <button
              onClick={() => setLogs([])}
              className="mt-2 px-3 py-1 bg-gray-600 hover:bg-gray-700 rounded text-white text-sm"
            >
              로그 클리어
            </button>
          </div>
        </div>

        {/* 사용 방법 */}
        <div className="mt-8 bg-gray-900 border-2 border-yellow-500 rounded-lg p-4">
          <h2 className="text-xl font-bold mb-4 text-yellow-400">📋 NAT 통과 테스트 방법</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h3 className="font-bold text-green-400 mb-2">1단계: 호스트 설정</h3>
              <ul className="space-y-1 text-gray-300">
                <li>• 페이지 로드 시 자동으로 Peer ID 생성</li>
                <li>• NAT 타입 자동 탐지</li>
                <li>• Peer ID 복사 버튼 클릭</li>
                <li>• 상대방에게 ID 전달</li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold text-green-400 mb-2">2단계: 클라이언트 연결</h3>
              <ul className="space-y-1 text-gray-300">
                <li>• 다른 기기에서 이 페이지 접속</li>
                <li>• 받은 Peer ID 입력</li>
                <li>• "NAT 통과 연결 시도" 클릭</li>
                <li>• 30초 대기 (NAT 통과 시간)</li>
              </ul>
            </div>
          </div>
          
          <div className="mt-4 p-3 bg-red-900 border border-red-500 rounded">
            <h3 className="font-bold text-red-400 mb-2">⚠️ NAT 통과 실패 시 해결책</h3>
            <ul className="space-y-1 text-sm text-gray-300">
              <li>• 양쪽 모두 모바일 핫스팟 사용 (다른 네트워크)</li>
              <li>• VPN 연결 후 재시도</li>
              <li>• 공용 Wi-Fi에서 테스트</li>
              <li>• 방화벽/보안 프로그램 임시 해제</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
'use client';

import { useState, useCallback } from 'react';

// 🩺 네트워크 진단 인터페이스
interface NetworkDiagnostic {
  natType: 'Unknown' | 'Open' | 'Moderate' | 'Strict' | 'Symmetric';
  localIP: string;
  publicIP: string;
  stunResults: { server: string; success: boolean; candidate?: string; latency?: number }[];
  turnResults: { server: string; success: boolean; error?: string; latency?: number }[];
  iceStats: {
    host: number;
    srflx: number;
    relay: number;
    errors: number;
  };
  recommendation: string;
  connectionProbability: number; // 0-100
}

interface TestResult {
  server: string;
  type: 'STUN' | 'TURN';
  status: 'testing' | 'success' | 'failed';
  latency?: number;
  error?: string;
  details?: string;
}

// 🌐 테스트할 서버 목록
const TEST_SERVERS = {
  stun: [
    'stun:stun.l.google.com:19302',
    'stun:stun1.l.google.com:19302',
    'stun:stun.cloudflare.com:3478',
    'stun:global.stun.twilio.com:3478',
    'stun:stun.nextcloud.com:443',
    'stun:stun.stunprotocol.org:3478'
  ],
  turn: [
    { 
      url: 'turn:coturn-railway-server-production.up.railway.app:3478', 
      username: 'railway', 
      credential: 'RailwayP2P123!',
      name: 'Railway CoTURN'
    },
    { 
      url: 'turn:openrelay.metered.ca:80', 
      username: 'openrelayproject', 
      credential: 'openrelayproject',
      name: 'Metered OpenRelay'
    },
    { 
      url: 'turn:relay.metered.ca:80', 
      username: 'openrelayproject', 
      credential: 'openrelayproject',
      name: 'Metered Relay'
    },
    { 
      url: 'turn:numb.viagenie.ca', 
      username: 'webrtc@live.com', 
      credential: 'muazkh',
      name: 'Numb Viagenie'
    },
    { 
      url: 'turn:turn.bistri.com:80', 
      username: 'homeo', 
      credential: 'homeo',
      name: 'Bistri'
    }
  ]
};

export default function NetworkDiagnosticPage() {
  const [diagnostic, setDiagnostic] = useState<NetworkDiagnostic>({
    natType: 'Unknown',
    localIP: '감지 중...',
    publicIP: '감지 중...',
    stunResults: [],
    turnResults: [],
    iceStats: { host: 0, srflx: 0, relay: 0, errors: 0 },
    recommendation: '진단을 시작하세요',
    connectionProbability: 0
  });

  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isDiagnosing, setIsDiagnosing] = useState<boolean>(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [currentTest, setCurrentTest] = useState<string>('');
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);

  // 로그 추가
  const addLog = useCallback((message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    const emoji = {
      info: '📡',
      success: '✅',
      warning: '⚠️',
      error: '❌'
    }[type];
    
    setLogs(prev => [...prev.slice(-15), `[${timestamp}] ${emoji} ${message}`]);
    console.log(`[NETWORK-DIAG] ${message}`);
  }, []);

  // 🔍 로컬 IP 감지
  const detectLocalIP = useCallback(async (): Promise<string> => {
    try {
      const pc = new RTCPeerConnection();
      pc.createDataChannel('');
      await pc.createOffer();
      await pc.setLocalDescription(await pc.createOffer());
      
      const localDescription = pc.localDescription?.sdp || '';
      const ipMatch = localDescription.match(/c=IN IP4 ([^\s]+)/);
      pc.close();
      
      if (ipMatch) {
        return ipMatch[1];
      }
      return '감지 실패';
    } catch (error) {
      return '감지 실패';
    }
  }, []);

  // 🌐 STUN 서버 테스트
  const testStunServer = useCallback(async (stunUrl: string): Promise<TestResult> => {
    const startTime = Date.now();
    
    try {
      const pc = new RTCPeerConnection({ iceServers: [{ urls: stunUrl }] });
      
      const candidatePromise = new Promise<{ candidate: string; latency: number }>((resolve, reject) => {
        let resolved = false;
        
        pc.onicecandidate = (event) => {
          if (event.candidate && event.candidate.type === 'srflx' && !resolved) {
            resolved = true;
            const latency = Date.now() - startTime;
            resolve({ candidate: event.candidate.candidate, latency });
          }
        };
        
        setTimeout(() => {
          if (!resolved) {
            resolved = true;
            reject(new Error('타임아웃 (5초)'));
          }
        }, 5000);
      });
      
      pc.createDataChannel('test');
      await pc.setLocalDescription(await pc.createOffer());
      
      try {
        const result = await candidatePromise;
        pc.close();
        
        return {
          server: stunUrl,
          type: 'STUN',
          status: 'success',
          latency: result.latency,
          details: result.candidate
        };
      } catch (error) {
        pc.close();
        return {
          server: stunUrl,
          type: 'STUN',
          status: 'failed',
          error: error instanceof Error ? error.message : '알 수 없는 오류'
        };
      }
    } catch (error) {
      return {
        server: stunUrl,
        type: 'STUN',
        status: 'failed',
        error: error instanceof Error ? error.message : '연결 실패'
      };
    }
  }, []);

  // 🔄 TURN 서버 테스트
  const testTurnServer = useCallback(async (turnConfig: { url: string; username: string; credential: string; name: string }): Promise<TestResult> => {
    const startTime = Date.now();
    
    try {
      const pc = new RTCPeerConnection({
        iceServers: [{
          urls: turnConfig.url,
          username: turnConfig.username,
          credential: turnConfig.credential
        }]
      });
      
      const relayPromise = new Promise<{ success: boolean; latency: number; details?: string }>((resolve) => {
        let hasRelay = false;
        let errorCount = 0;
        let details = '';
        
        pc.onicecandidate = (event) => {
          if (event.candidate) {
            if (event.candidate.type === 'relay') {
              hasRelay = true;
              const latency = Date.now() - startTime;
              details = `Relay candidate: ${event.candidate.candidate}`;
              resolve({ success: true, latency, details });
            }
          } else {
            // ICE gathering 완료
            const latency = Date.now() - startTime;
            resolve({ success: hasRelay, latency, details: hasRelay ? details : `No relay candidates found` });
          }
        };
        
        pc.onicecandidateerror = (event) => {
          errorCount++;
          details += `ICE Error ${errorCount}: ${event.errorText || 'Unknown error'}; `;
          if (errorCount > 3) {
            const latency = Date.now() - startTime;
            resolve({ success: false, latency, details });
          }
        };
        
        setTimeout(() => {
          const latency = Date.now() - startTime;
          resolve({ success: hasRelay, latency, details: hasRelay ? details : `Timeout after 8 seconds` });
        }, 8000);
      });
      
      pc.createDataChannel('test');
      await pc.setLocalDescription(await pc.createOffer());
      
      const result = await relayPromise;
      pc.close();
      
      return {
        server: turnConfig.name,
        type: 'TURN',
        status: result.success ? 'success' : 'failed',
        latency: result.latency,
        error: result.success ? undefined : 'Relay 후보 생성 실패',
        details: result.details
      };
    } catch (error) {
      return {
        server: turnConfig.name,
        type: 'TURN',
        status: 'failed',
        error: error instanceof Error ? error.message : '연결 실패'
      };
    }
  }, []);

  // 📊 전체 ICE 후보 통계 수집
  const collectICEStats = useCallback(async (): Promise<typeof diagnostic.iceStats> => {
    try {
      const allServers = [
        ...TEST_SERVERS.stun.map(url => ({ urls: url })),
        ...TEST_SERVERS.turn.map(config => ({
          urls: config.url,
          username: config.username,
          credential: config.credential
        }))
      ];
      
      const pc = new RTCPeerConnection({ iceServers: allServers });
      
      const statsPromise = new Promise<typeof diagnostic.iceStats>((resolve) => {
        const stats = { host: 0, srflx: 0, relay: 0, errors: 0 };
        
        pc.onicecandidate = (event) => {
          if (event.candidate) {
            switch (event.candidate.type) {
              case 'host': stats.host++; break;
              case 'srflx': stats.srflx++; break;
              case 'relay': stats.relay++; break;
            }
          } else {
            // ICE gathering 완료
            resolve(stats);
          }
        };
        
        pc.onicecandidateerror = () => {
          stats.errors++;
        };
        
        setTimeout(() => resolve(stats), 15000); // 15초 타임아웃
      });
      
      pc.createDataChannel('test');
      await pc.setLocalDescription(await pc.createOffer());
      
      const result = await statsPromise;
      pc.close();
      
      return result;
    } catch (error) {
      addLog('ICE 통계 수집 실패', 'error');
      return { host: 0, srflx: 0, relay: 0, errors: 0 };
    }
  }, [addLog]);

  // 🏷️ NAT 타입 분석
  const analyzeNATType = useCallback((stunResults: any[], turnResults: any[], localIP: string, publicIP: string) => {
    const successfulStun = stunResults.filter(r => r.success).length;
    const successfulTurn = turnResults.filter(r => r.success).length;
    
    let natType: NetworkDiagnostic['natType'] = 'Unknown';
    let recommendation = '';
    let connectionProbability = 0;
    
    if (localIP === publicIP) {
      natType = 'Open';
      recommendation = '🟢 공개 IP 환경 - 모든 P2P 연결이 직접 가능합니다. STUN/TURN 서버 없이도 연결 가능.';
      connectionProbability = 95;
    } else if (successfulStun > 2 && successfulTurn > 1) {
      natType = 'Moderate';
      recommendation = '🟡 보통 NAT 환경 - STUN 서버로 대부분의 연결 가능. TURN 서버도 일부 작동하여 안정적인 P2P 연결 가능.';
      connectionProbability = 85;
    } else if (successfulStun > 0 && successfulTurn > 0) {
      natType = 'Strict';
      recommendation = '🟠 제한적 NAT 환경 - STUN 서버 일부 작동, TURN 서버 필요. 연결 성공률이 중간 수준.';
      connectionProbability = 60;
    } else if (successfulStun > 0) {
      natType = 'Strict';
      recommendation = '🟠 엄격한 NAT 환경 - STUN만 작동, 모든 TURN 서버 실패. P2P 연결이 어려울 수 있음.';
      connectionProbability = 30;
    } else {
      natType = 'Symmetric';
      recommendation = '🔴 대칭 NAT 또는 방화벽 차단 - 모든 STUN/TURN 서버 실패. P2P 연결이 매우 어려움. 네트워크 설정 확인 필요.';
      connectionProbability = 10;
    }
    
    return { natType, recommendation, connectionProbability };
  }, []);

  // 🩺 종합 네트워크 진단 실행
  const runComprehensiveDiagnostic = useCallback(async () => {
    setIsDiagnosing(true);
    setTestResults([]);
    setCurrentTest('초기화 중...');
    addLog('🩺 종합 네트워크 진단 시작', 'info');
    
    const newDiagnostic: NetworkDiagnostic = {
      natType: 'Unknown',
      localIP: '감지 중...',
      publicIP: '감지 중...',
      stunResults: [],
      turnResults: [],
      iceStats: { host: 0, srflx: 0, relay: 0, errors: 0 },
      recommendation: '진단 중...',
      connectionProbability: 0
    };
    
    try {
      // 1단계: 로컬 IP 감지
      setCurrentTest('로컬 IP 주소 감지 중...');
      addLog('🔍 로컬 IP 주소 감지 시작', 'info');
      const localIP = await detectLocalIP();
      newDiagnostic.localIP = localIP;
      addLog(`📍 로컬 IP: ${localIP}`, localIP !== '감지 실패' ? 'success' : 'error');
      
      // 2단계: STUN 서버 테스트
      setCurrentTest('STUN 서버 테스트 중...');
      addLog(`🌐 STUN 서버 ${TEST_SERVERS.stun.length}개 테스트 시작`, 'info');
      
      for (let i = 0; i < TEST_SERVERS.stun.length; i++) {
        const stunUrl = TEST_SERVERS.stun[i];
        setCurrentTest(`STUN 테스트 (${i + 1}/${TEST_SERVERS.stun.length}): ${stunUrl.split(':')[1]}`);
        
        // 테스트 시작 상태 표시
        setTestResults(prev => [...prev, {
          server: stunUrl,
          type: 'STUN',
          status: 'testing'
        }]);
        
        const result = await testStunServer(stunUrl);
        
        // 결과 업데이트
        setTestResults(prev => prev.map(r => 
          r.server === stunUrl ? result : r
        ));
        
        // 공개 IP 추출
        if (result.status === 'success' && result.details && (newDiagnostic.publicIP === '감지 중...' || newDiagnostic.publicIP === '감지 실패')) {
          const ipMatch = result.details.match(/(\d+\.\d+\.\d+\.\d+)/);
          if (ipMatch) {
            newDiagnostic.publicIP = ipMatch[1];
          }
        }
        
        newDiagnostic.stunResults.push({
          server: stunUrl,
          success: result.status === 'success',
          candidate: result.details,
          latency: result.latency
        });
        
        addLog(`${result.status === 'success' ? '✅' : '❌'} STUN ${stunUrl.split(':')[1]}: ${result.status === 'success' ? `${result.latency}ms` : result.error}`, result.status === 'success' ? 'success' : 'error');
      }
      
      // 3단계: TURN 서버 테스트
      setCurrentTest('TURN 서버 테스트 중...');
      addLog(`🔄 TURN 서버 ${TEST_SERVERS.turn.length}개 테스트 시작`, 'info');
      
      for (let i = 0; i < TEST_SERVERS.turn.length; i++) {
        const turnConfig = TEST_SERVERS.turn[i];
        setCurrentTest(`TURN 테스트 (${i + 1}/${TEST_SERVERS.turn.length}): ${turnConfig.name}`);
        
        // 테스트 시작 상태 표시
        setTestResults(prev => [...prev, {
          server: turnConfig.name,
          type: 'TURN',
          status: 'testing'
        }]);
        
        const result = await testTurnServer(turnConfig);
        
        // 결과 업데이트
        setTestResults(prev => prev.map(r => 
          r.server === turnConfig.name ? result : r
        ));
        
        newDiagnostic.turnResults.push({
          server: turnConfig.url,
          success: result.status === 'success',
          error: result.error,
          latency: result.latency
        });
        
        addLog(`${result.status === 'success' ? '✅' : '❌'} TURN ${turnConfig.name}: ${result.status === 'success' ? `${result.latency}ms` : result.error}`, result.status === 'success' ? 'success' : 'error');
      }
      
      // 4단계: ICE 후보 통계 수집
      setCurrentTest('ICE 후보 통계 수집 중...');
      addLog('📊 전체 ICE 후보 통계 수집 시작', 'info');
      const iceStats = await collectICEStats();
      newDiagnostic.iceStats = iceStats;
      addLog(`📊 ICE 통계: Host=${iceStats.host}, SRFLX=${iceStats.srflx}, Relay=${iceStats.relay}, Errors=${iceStats.errors}`, 'info');
      
      // 5단계: NAT 타입 분석 및 권장사항
      setCurrentTest('NAT 타입 분석 중...');
      addLog('🏷️ NAT 타입 분석 및 권장사항 생성', 'info');
      const analysis = analyzeNATType(newDiagnostic.stunResults, newDiagnostic.turnResults, newDiagnostic.localIP, newDiagnostic.publicIP);
      
      newDiagnostic.natType = analysis.natType;
      newDiagnostic.recommendation = analysis.recommendation;
      newDiagnostic.connectionProbability = analysis.connectionProbability;
      
      setDiagnostic(newDiagnostic);
      setCurrentTest('진단 완료');
      addLog(`🏷️ NAT 타입: ${analysis.natType} (연결 가능성: ${analysis.connectionProbability}%)`, 'success');
      addLog('🩺 종합 네트워크 진단 완료', 'success');
      
    } catch (error) {
      addLog(`❌ 진단 중 오류 발생: ${error}`, 'error');
      newDiagnostic.recommendation = '❌ 진단 실패 - 네트워크 연결을 확인하세요';
      setDiagnostic(newDiagnostic);
    } finally {
      setIsDiagnosing(false);
      setCurrentTest('');
    }
  }, [detectLocalIP, testStunServer, testTurnServer, collectICEStats, analyzeNATType, addLog]);

  // 📋 로그 초기화
  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  return (
    <div className="min-h-screen bg-black text-green-500 font-mono p-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8 text-green-400">
          🩺 P2P 네트워크 종합 진단 센터
        </h1>
        
        <div className="text-center mb-8">
          <p className="text-gray-400 mb-4">
            WebRTC P2P 연결 문제를 종합적으로 진단하고 해결방안을 제시합니다
          </p>
          
          <button
            onClick={runComprehensiveDiagnostic}
            disabled={isDiagnosing}
            className="px-8 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 rounded-lg text-white font-bold text-lg"
          >
            {isDiagnosing ? '🔄 진단 중...' : '🩺 종합 진단 시작'}
          </button>
          
          {isDiagnosing && currentTest && (
            <div className="mt-4 text-yellow-400 font-bold">
              {currentTest}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          
          {/* 📊 진단 결과 요약 */}
          <div className="lg:col-span-2 bg-gray-900 border-2 border-green-500 rounded-lg p-6">
            <h2 className="text-xl font-bold mb-4 text-green-400">📊 진단 결과 요약</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="bg-black border border-gray-600 rounded p-4">
                <h3 className="text-purple-400 font-bold mb-2">기본 정보</h3>
                <div className="space-y-2 text-sm">
                  <div>로컬 IP: <span className="text-cyan-400">{diagnostic.localIP}</span></div>
                  <div>공개 IP: <span className="text-cyan-400">{diagnostic.publicIP}</span></div>
                  <div>NAT 타입: <span className={`font-bold ${
                    diagnostic.natType === 'Open' ? 'text-green-400' :
                    diagnostic.natType === 'Moderate' ? 'text-yellow-400' :
                    diagnostic.natType === 'Strict' ? 'text-orange-400' : 
                    diagnostic.natType === 'Symmetric' ? 'text-red-400' : 'text-gray-400'
                  }`}>{diagnostic.natType}</span></div>
                  <div>연결 가능성: <span className={`font-bold ${
                    diagnostic.connectionProbability > 80 ? 'text-green-400' :
                    diagnostic.connectionProbability > 50 ? 'text-yellow-400' :
                    diagnostic.connectionProbability > 20 ? 'text-orange-400' : 'text-red-400'
                  }`}>{diagnostic.connectionProbability}%</span></div>
                </div>
              </div>
              
              <div className="bg-black border border-gray-600 rounded p-4">
                <h3 className="text-blue-400 font-bold mb-2">ICE 후보 통계</h3>
                <div className="space-y-2 text-sm">
                  <div>Host 후보: <span className="text-cyan-400">{diagnostic.iceStats.host}개</span></div>
                  <div>SRFLX 후보: <span className="text-green-400">{diagnostic.iceStats.srflx}개</span></div>
                  <div>Relay 후보: <span className="text-yellow-400">{diagnostic.iceStats.relay}개</span></div>
                  <div>오류 수: <span className="text-red-400">{diagnostic.iceStats.errors}개</span></div>
                </div>
              </div>
            </div>
            
            <div className="bg-black border border-gray-600 rounded p-4">
              <h3 className="text-cyan-400 font-bold mb-2">💡 권장사항</h3>
              <p className="text-gray-300 text-sm leading-relaxed">{diagnostic.recommendation}</p>
            </div>
          </div>

          {/* 📋 실시간 로그 */}
          <div className="bg-gray-900 border-2 border-yellow-500 rounded-lg p-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-yellow-400">📋 진단 로그</h2>
              <button
                onClick={clearLogs}
                className="text-xs bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded"
              >
                지우기
              </button>
            </div>
            <div className="bg-black border border-gray-600 rounded p-3 h-80 overflow-y-auto">
              {logs.map((log, i) => (
                <div key={i} className="text-xs text-gray-300 mb-1 break-all">{log}</div>
              ))}
              {logs.length === 0 && (
                <div className="text-gray-500 text-sm text-center mt-20">
                  진단을 시작하면 로그가 여기에 표시됩니다
                </div>
              )}
            </div>
          </div>

          {/* 🌐 STUN 서버 테스트 결과 */}
          <div className="bg-gray-900 border-2 border-blue-500 rounded-lg p-4">
            <h2 className="text-lg font-bold mb-4 text-blue-400">🌐 STUN 서버 테스트</h2>
            <div className="space-y-2">
              {TEST_SERVERS.stun.map((server, i) => {
                const result = testResults.find(r => r.server === server && r.type === 'STUN');
                const shortName = server.split(':')[1] || server;
                
                return (
                  <div key={i} className="flex justify-between items-center p-2 bg-black border border-gray-600 rounded">
                    <span className="text-sm">{shortName}</span>
                    <div className="flex items-center space-x-2">
                      {result?.status === 'testing' && <span className="text-yellow-400 text-xs">🔄 테스트 중</span>}
                      {result?.status === 'success' && (
                        <>
                          <span className="text-green-400 text-xs">✅ {result.latency}ms</span>
                        </>
                      )}
                      {result?.status === 'failed' && <span className="text-red-400 text-xs">❌ 실패</span>}
                      {!result && <span className="text-gray-500 text-xs">⏳ 대기</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 🔄 TURN 서버 테스트 결과 */}
          <div className="bg-gray-900 border-2 border-orange-500 rounded-lg p-4">
            <h2 className="text-lg font-bold mb-4 text-orange-400">🔄 TURN 서버 테스트</h2>
            <div className="space-y-2">
              {TEST_SERVERS.turn.map((server, i) => {
                const result = testResults.find(r => r.server === server.name && r.type === 'TURN');
                
                return (
                  <div key={i} className="flex justify-between items-center p-2 bg-black border border-gray-600 rounded">
                    <span className="text-sm">{server.name}</span>
                    <div className="flex items-center space-x-2">
                      {result?.status === 'testing' && <span className="text-yellow-400 text-xs">🔄 테스트 중</span>}
                      {result?.status === 'success' && (
                        <>
                          <span className="text-green-400 text-xs">✅ {result.latency}ms</span>
                        </>
                      )}
                      {result?.status === 'failed' && <span className="text-red-400 text-xs">❌ 실패</span>}
                      {!result && <span className="text-gray-500 text-xs">⏳ 대기</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 🔧 고급 정보 */}
          <div className="bg-gray-900 border-2 border-purple-500 rounded-lg p-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-purple-400">🔧 고급 정보</h2>
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="text-xs bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded"
              >
                {showAdvanced ? '숨기기' : '보기'}
              </button>
            </div>
            
            {showAdvanced && (
              <div className="space-y-3 text-xs">
                <div className="bg-black border border-gray-600 rounded p-3">
                  <h4 className="text-cyan-400 font-bold mb-2">STUN 서버 상세</h4>
                  {diagnostic.stunResults.map((result, i) => (
                    <div key={i} className="mb-2">
                      <div className={result.success ? 'text-green-400' : 'text-red-400'}>
                        {result.success ? '✅' : '❌'} {result.server.split(':')[1]}
                        {result.latency && ` (${result.latency}ms)`}
                      </div>
                      {result.candidate && (
                        <div className="text-gray-500 text-xs ml-4 break-all">
                          {result.candidate}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                
                <div className="bg-black border border-gray-600 rounded p-3">
                  <h4 className="text-yellow-400 font-bold mb-2">TURN 서버 상세</h4>
                  {testResults.filter(r => r.type === 'TURN').map((result, i) => (
                    <div key={i} className="mb-2">
                      <div className={result.status === 'success' ? 'text-green-400' : 'text-red-400'}>
                        {result.status === 'success' ? '✅' : '❌'} {result.server}
                        {result.latency && ` (${result.latency}ms)`}
                      </div>
                      {result.details && (
                        <div className="text-gray-500 text-xs ml-4 break-all">
                          {result.details}
                        </div>
                      )}
                      {result.error && (
                        <div className="text-red-400 text-xs ml-4">
                          오류: {result.error}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 📚 도움말 */}
        <div className="mt-8 bg-gray-900 border border-gray-600 rounded-lg p-6">
          <h2 className="text-lg font-bold mb-4 text-cyan-400">📚 진단 결과 해석 가이드</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
            <div>
              <h3 className="font-bold text-green-400 mb-2">NAT 타입별 특징</h3>
              <ul className="space-y-1 text-gray-300">
                <li><span className="text-green-400">🟢 Open:</span> 공개 IP, 모든 연결 가능</li>
                <li><span className="text-yellow-400">🟡 Moderate:</span> 일반적인 가정용 환경</li>
                <li><span className="text-orange-400">🟠 Strict:</span> 엄격한 방화벽/NAT</li>
                <li><span className="text-red-400">🔴 Symmetric:</span> 매우 제한적인 환경</li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold text-blue-400 mb-2">개선 방안</h3>
              <ul className="space-y-1 text-gray-300">
                <li>• TURN 서버 실패 시: 다른 TURN 서버 시도</li>
                <li>• 모든 서버 실패 시: 방화벽/라우터 설정 확인</li>
                <li>• 지연율 높음: 서버 위치 또는 네트워크 상태 확인</li>
                <li>• 연결 불안정: ICE 후보 수 늘리기</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

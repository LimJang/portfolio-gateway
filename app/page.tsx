import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen bg-black text-green-400 crt-effect">
      {/* Header */}
      <header className="border-b-2 border-green-400 p-4">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <h1 className="text-2xl retro-glow typewriter cursor">
            PORTFOLIO_GATEWAY.EXE
          </h1>
          <div className="flex items-center space-x-4">
            <div className="w-3 h-3 bg-green-400 retro-pulse"></div>
            <span className="text-sm">SYSTEM_ONLINE</span>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-8">
        {/* Welcome Section */}
        <section className="text-center mb-16 fade-in-up">
          <div className="mb-8">
            <h2 className="text-4xl mb-4 retro-glow">
              &gt; WELCOME TO THE MATRIX_
            </h2>
            <p className="text-lg text-gray-400 mb-8">
              Real-time communication hub and project navigation system
            </p>
          </div>

          {/* Status Indicators */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <div className="retro-border p-6 relative">
              <div className="scanline"></div>
              <h3 className="text-xl mb-2 text-green-400">SERVER_STATUS</h3>
              <div className="flex items-center justify-center">
                <div className="w-4 h-4 bg-green-400 retro-pulse mr-2"></div>
                <span>ONLINE</span>
              </div>
            </div>
            
            <div className="retro-border p-6 relative">
              <div className="scanline"></div>
              <h3 className="text-xl mb-2 text-green-400">CHAT_SYSTEM</h3>
              <div className="flex items-center justify-center">
                <div className="w-4 h-4 bg-yellow-400 retro-pulse mr-2"></div>
                <span>ACTIVE</span>
              </div>
            </div>
            
            <div className="retro-border p-6 relative">
              <div className="scanline"></div>
              <h3 className="text-xl mb-2 text-green-400">PROJECTS</h3>
              <div className="flex items-center justify-center">
                <div className="w-4 h-4 bg-orange-400 retro-pulse mr-2"></div>
                <span>READY</span>
              </div>
            </div>
          </div>
        </section>

        {/* Navigation Cards */}
        <section className="grid md:grid-cols-2 gap-8 mb-16">
          <Link href="/chat" className="block">
            <div className="retro-border p-8 hover:bg-green-400 hover:bg-opacity-10 transition-all duration-300 group relative overflow-hidden">
              <div className="relative z-10">
                <h3 className="text-2xl mb-4 text-green-400 group-hover:text-black transition-colors">
                  [CHAT_ROOM.EXE]
                </h3>
                <p className="text-gray-400 group-hover:text-gray-800 transition-colors mb-4">
                  &gt; Initialize real-time communication protocol
                </p>
                <div className="flex items-center">
                  <span className="retro-button">EXECUTE</span>
                  <span className="ml-4 text-green-400 group-hover:translate-x-2 transition-transform">
                    →
                  </span>
                </div>
              </div>
              <div className="absolute inset-0 bg-green-400 transform -translate-x-full group-hover:translate-x-0 transition-transform duration-500 opacity-20"></div>
            </div>
          </Link>

          <div className="retro-border p-8 hover:bg-orange-400 hover:bg-opacity-10 transition-all duration-300 group relative overflow-hidden cursor-pointer">
            <div className="relative z-10">
              <h3 className="text-2xl mb-4 text-orange-400 group-hover:text-black transition-colors">
                [PROJECTS.DIR]
              </h3>
              <p className="text-gray-400 group-hover:text-gray-800 transition-colors mb-4">
                &gt; Access portfolio navigation system
              </p>
              <div className="flex items-center">
                <span className="retro-button">BROWSE</span>
                <span className="ml-4 text-orange-400 group-hover:translate-x-2 transition-transform">
                  →
                </span>
              </div>
            </div>
            <div className="absolute inset-0 bg-orange-400 transform -translate-x-full group-hover:translate-x-0 transition-transform duration-500 opacity-20"></div>
          </div>
        </section>

        {/* Terminal Footer */}
        <section className="retro-border p-6 retro-flicker">
          <div className="text-sm space-y-2">
            <p>&gt; SYSTEM_INFO: Next.js 14.2.3 | Vercel Cloud Platform</p>
            <p>&gt; BUILD_STATUS: Deployment successful ✓</p>
            <p>&gt; UPTIME: {new Date().toISOString()}</p>
            <p>&gt; ACCESS_LEVEL: Public | Security: Standard</p>
          </div>
        </section>
      </main>

      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-px h-px bg-green-400 shadow-[0_0_20px_10px_rgba(0,255,65,0.3)] animate-pulse"></div>
        <div className="absolute top-3/4 right-1/3 w-px h-px bg-orange-400 shadow-[0_0_15px_8px_rgba(255,107,53,0.3)] animate-pulse delay-1000"></div>
        <div className="absolute bottom-1/4 left-1/2 w-px h-px bg-yellow-400 shadow-[0_0_25px_12px_rgba(255,255,0,0.3)] animate-pulse delay-2000"></div>
      </div>
    </div>
  )
}

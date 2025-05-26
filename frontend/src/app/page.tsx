'use client'
import { useState, useEffect } from 'react'

export default function Home() {
  const [backendStatus, setBackendStatus] = useState<string>('Checking...')
  const [apiData, setApiData] = useState<any>(null)

  useEffect(() => {
    // Test backend connection
    const testBackend = async () => {
      try {

        setBackendStatus('✅ Connected')
        
        // Test API data
        const testResponse = await fetch('http://localhost:3001/api/test')
        const testData = await testResponse.json()
        setApiData(testData)
      } catch (error) {
        setBackendStatus('❌ Disconnected')
        console.error('Backend connection failed:', error)
      }
    }
    
    testBackend()
  }, [])

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-6xl font-bold text-gray-900 mb-4">
            🧠 Brainstorm Platform
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Real-time collaborative brainstorming platform
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-semibold text-green-600 mb-2">
              ✅ Frontend (Next.js)
            </h2>
            <p className="text-gray-600">Running on http://localhost:3000</p>
            <p className="text-sm text-gray-500 mt-2">
              TypeScript + Tailwind CSS + App Router
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-semibold mb-2">
              🔧 Backend (Fastify)
            </h2>
            <p className="text-gray-600">
              Status: <span className="font-semibold">{backendStatus}</span>
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Running on http://localhost:3001
            </p>
          </div>
        </div>

        {apiData && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
            <h3 className="text-xl font-semibold mb-4">🔗 API Connection Test</h3>
            <div className="bg-gray-100 rounded p-4">
              <p className="font-medium">Backend Response:</p>
              <pre className="text-sm mt-2 text-gray-700">
                {JSON.stringify(apiData, null, 2)}
              </pre>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-xl font-semibold mb-4">🎯 Ready to Build!</h3>
          <div className="space-y-2">
            <p>✅ Frontend and Backend are running separately</p>
            <p>✅ API connection is working</p>
            <p>✅ Ready to add authentication, real-time features, and canvas</p>
          </div>
        </div>
      </div>
    </main>
  )
}

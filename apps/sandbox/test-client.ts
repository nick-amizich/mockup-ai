/**
 * Test client for the sandbox service
 *
 * Usage:
 *   1. Start the server: npm run dev
 *   2. In another terminal: npx tsx test-client.ts
 */

import WebSocket from 'ws'

const WS_URL = 'ws://localhost:3001'

// Sample HTML to test with
const TEST_HTML = `<!DOCTYPE html>
<html>
<head>
  <title>Test Page</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <header>
    <h1>Welcome to My Site</h1>
    <nav>
      <a href="/">Home</a>
      <a href="/about">About</a>
    </nav>
  </header>
  <main>
    <p>This is a test page for mockup generation.</p>
    <button>Click Me</button>
  </main>
</body>
</html>`

const TEST_CSS = `body {
  font-family: Arial, sans-serif;
  margin: 0;
  padding: 20px;
}

header {
  background: #333;
  color: white;
  padding: 20px;
}

h1 {
  margin: 0;
}

nav a {
  color: white;
  margin-right: 15px;
}

button {
  background: #007bff;
  color: white;
  border: none;
  padding: 10px 20px;
  cursor: pointer;
}`

async function main() {
  console.log('🔌 Connecting to sandbox server...')

  const ws = new WebSocket(WS_URL)

  ws.on('open', () => {
    console.log('✅ Connected!\n')

    // Step 1: Start a session with our test HTML
    console.log('📤 Starting session with test HTML...')
    ws.send(JSON.stringify({
      type: 'start_session',
      data: {
        html: TEST_HTML,
        css: TEST_CSS,
        url: 'https://example.com/test',
        title: 'Test Page'
      }
    }))
  })

  let sessionStarted = false

  ws.on('message', (data: Buffer) => {
    const message = JSON.parse(data.toString())

    switch (message.type) {
      case 'session_started':
        sessionStarted = true
        console.log('✅ Session started:', message.sessionId)
        console.log('📄 Page:', message.pageInfo.url, '\n')

        // Step 2: Send a test message to Claude
        console.log('📤 Sending message: "Make the header sticky and add a search bar"\n')
        ws.send(JSON.stringify({
          type: 'message',
          content: 'Make the header sticky so it stays at the top when scrolling, and add a search bar in the navigation.'
        }))
        break

      case 'message':
        console.log('💬 Claude:', message.content?.substring(0, 200) + (message.content?.length > 200 ? '...' : ''))
        break

      case 'tool_use':
        console.log('🔧 Tool:', message.tool)
        break

      case 'done':
        console.log('\n✅ Claude finished!')
        console.log('\n📤 Requesting ticket generation...')
        // Could send approve message here to generate ticket
        ws.close()
        break

      case 'error':
        console.error('❌ Error:', message.error)
        break

      default:
        console.log('📨 Event:', message.type, message)
    }
  })

  ws.on('error', (error) => {
    console.error('❌ WebSocket error:', error.message)
    if (error.message.includes('ECONNREFUSED')) {
      console.log('\n💡 Is the server running? Start it with: npm run dev')
    }
  })

  ws.on('close', () => {
    console.log('\n👋 Connection closed')
    process.exit(0)
  })
}

main().catch(console.error)

import cssText from 'data-text:./sidebar.css'
import type { PlasmoCSConfig, PlasmoGetStyle } from 'plasmo'
import { useState, useEffect, useRef } from 'react'
import { Sparkles, X, Send, Loader2, Check, Copy } from 'lucide-react'

export const config: PlasmoCSConfig = {
  matches: ['https://*/*', 'http://*/*'],
  all_frames: false
}

export const getStyle: PlasmoGetStyle = () => {
  const style = document.createElement('style')
  style.textContent = cssText
  return style
}

// Capture page HTML and CSS
async function capturePage() {
  const html = document.documentElement.outerHTML

  // Get all stylesheets
  const styles: string[] = []
  for (const sheet of document.styleSheets) {
    try {
      if (sheet.cssRules) {
        let cssText = ''
        for (const rule of sheet.cssRules) {
          cssText += rule.cssText + '\n'
        }
        styles.push(cssText)
      }
    } catch {
      // Cross-origin stylesheets can't be read
      if (sheet.href) {
        styles.push(`/* External stylesheet: ${sheet.href} */`)
      }
    }
  }

  return {
    html,
    css: styles.join('\n'),
    url: window.location.href,
    title: document.title
  }
}

interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
}

function MockupSidebar() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [connected, setConnected] = useState(false)
  const [previewHtml, setPreviewHtml] = useState<string | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const previewRef = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    // Listen for toggle messages from popup
    const handleMessage = (message: { action: string }) => {
      if (message.action === 'toggleSidebar') {
        setIsOpen(prev => !prev)
      }
    }

    chrome.runtime.onMessage.addListener(handleMessage)
    return () => chrome.runtime.onMessage.removeListener(handleMessage)
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function startSession() {
    setLoading(true)

    try {
      const pageData = await capturePage()

      // Connect to sandbox WebSocket
      const wsUrl = process.env.PLASMO_PUBLIC_SANDBOX_WS_URL || 'ws://localhost:3001'
      const ws = new WebSocket(wsUrl)

      ws.onopen = () => {
        setConnected(true)
        // Send initial page data
        ws.send(JSON.stringify({
          type: 'start_session',
          data: pageData
        }))
      }

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data)

        if (data.type === 'session_started') {
          setSessionId(data.sessionId)
          setMessages([{
            id: '1',
            role: 'assistant',
            content: 'I\'ve captured this page. What changes would you like to make?',
            timestamp: new Date()
          }])
        } else if (data.type === 'message') {
          setMessages(prev => [...prev, {
            id: Date.now().toString(),
            role: 'assistant',
            content: data.content,
            timestamp: new Date()
          }])
        } else if (data.type === 'tool_use') {
          // Show tool usage indicator
          setMessages(prev => [...prev, {
            id: Date.now().toString(),
            role: 'system',
            content: `Using tool: ${data.tool}`,
            timestamp: new Date()
          }])
        } else if (data.type === 'preview_update') {
          // Combine HTML and CSS for preview
          const fullHtml = `
            <!DOCTYPE html>
            <html>
            <head>
              <style>${data.css}</style>
            </head>
            <body>${data.html.replace(/.*<body[^>]*>/is, '').replace(/<\/body>.*/is, '')}</body>
            </html>
          `
          setPreviewHtml(fullHtml)
          setShowPreview(true)
        } else if (data.type === 'done') {
          setLoading(false)
        }

        if (data.type !== 'done' && data.type !== 'preview_update') {
          setLoading(false)
        }
      }

      ws.onerror = () => {
        setConnected(false)
        setMessages([{
          id: '1',
          role: 'assistant',
          content: 'Unable to connect to the AI service. Please try again later.',
          timestamp: new Date()
        }])
        setLoading(false)
      }

      ws.onclose = () => {
        setConnected(false)
      }

      wsRef.current = ws
    } catch (error) {
      console.error('Failed to start session:', error)
      setLoading(false)
    }
  }

  async function sendMessage() {
    if (!input.trim() || !wsRef.current || !connected) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setLoading(true)

    wsRef.current.send(JSON.stringify({
      type: 'message',
      content: input
    }))
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  if (!isOpen) return null

  return (
    <div className={`mockup-sidebar ${showPreview ? 'with-preview' : ''}`}>
      <header className="sidebar-header">
        <div className="sidebar-logo">
          <Sparkles className="icon" />
          <span>Mockup AI</span>
        </div>
        <div className="header-actions">
          {previewHtml && (
            <button
              className={`preview-toggle ${showPreview ? 'active' : ''}`}
              onClick={() => setShowPreview(!showPreview)}
              title={showPreview ? 'Hide Preview' : 'Show Preview'}
            >
              {showPreview ? 'Hide Preview' : 'Show Preview'}
            </button>
          )}
          <button className="close-btn" onClick={() => setIsOpen(false)}>
            <X className="icon-sm" />
          </button>
        </div>
      </header>

      {showPreview && previewHtml && (
        <div className="preview-panel">
          <iframe
            ref={previewRef}
            srcDoc={previewHtml}
            title="Mockup Preview"
            sandbox="allow-same-origin"
          />
        </div>
      )}

      <main className="sidebar-content">
        {!sessionId ? (
          <div className="start-screen">
            <Sparkles className="big-icon" />
            <h2>Ready to Mockup</h2>
            <p>Describe changes in plain English and see them visualized instantly.</p>
            <button
              className="start-btn"
              onClick={startSession}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="icon-sm spinning" />
                  Capturing page...
                </>
              ) : (
                <>
                  <Sparkles className="icon-sm" />
                  Start Session
                </>
              )}
            </button>
          </div>
        ) : (
          <>
            <div className="messages">
              {messages.map((msg) => (
                <div key={msg.id} className={`message ${msg.role}`}>
                  {msg.role === 'system' ? (
                    <div className="system-message">{msg.content}</div>
                  ) : (
                    <div className="message-content">{msg.content}</div>
                  )}
                </div>
              ))}
              {loading && (
                <div className="message assistant">
                  <div className="message-content">
                    <Loader2 className="icon-sm spinning" />
                    Thinking...
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </>
        )}
      </main>

      {sessionId && (
        <footer className="sidebar-footer">
          <div className="input-container">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Describe the changes you want..."
              rows={2}
              disabled={loading || !connected}
            />
            <button
              className="send-btn"
              onClick={sendMessage}
              disabled={!input.trim() || loading || !connected}
            >
              <Send className="icon-sm" />
            </button>
          </div>
          <div className="connection-status">
            <span className={connected ? 'connected' : 'disconnected'}>
              {connected ? '● Connected' : '○ Disconnected'}
            </span>
          </div>
        </footer>
      )}
    </div>
  )
}

export default MockupSidebar

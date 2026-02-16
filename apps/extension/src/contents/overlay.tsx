import cssText from 'data-text:./overlay.css'
import type { PlasmoCSConfig, PlasmoGetStyle } from 'plasmo'
import { useState, useEffect } from 'react'
import { Eye, EyeOff, Sparkles } from 'lucide-react'

export const config: PlasmoCSConfig = {
  matches: ['https://*/*', 'http://*/*'],
  all_frames: false
}

export const getStyle: PlasmoGetStyle = () => {
  const style = document.createElement('style')
  style.textContent = cssText
  return style
}

interface PreviewMessage {
  type: 'mockup:preview_update'
  html: string
}

interface ControlMessage {
  type: 'mockup:sidebar_closed' | 'mockup:sidebar_opened'
}

type MockupMessage = PreviewMessage | ControlMessage

function MockupOverlay() {
  const [mockupHtml, setMockupHtml] = useState<string | null>(null)
  const [showMockup, setShowMockup] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    const handler = (event: MessageEvent<MockupMessage>) => {
      // Only accept messages from the same window/frame
      if (event.source !== window) return

      if (event.data?.type === 'mockup:preview_update') {
        setMockupHtml(event.data.html)
        setShowMockup(true)
      } else if (event.data?.type === 'mockup:sidebar_closed') {
        setSidebarOpen(false)
      } else if (event.data?.type === 'mockup:sidebar_opened') {
        setSidebarOpen(true)
      }
    }

    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [])

  // Handle Escape key to toggle mockup
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && mockupHtml) {
        setShowMockup(prev => !prev)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [mockupHtml])

  // Don't render if no mockup or sidebar is closed
  if (!mockupHtml || !sidebarOpen) return null

  // Don't render overlay content if user toggled it off, but keep toggle button
  if (!showMockup) {
    return (
      <button
        className="mockup-toggle show"
        onClick={() => setShowMockup(true)}
        title="Show Mockup"
      >
        <Eye className="toggle-icon" />
        Show Mockup
      </button>
    )
  }

  return (
    <div className="mockup-overlay-container">
      {/* Banner indicating this is a mockup */}
      <div className="mockup-banner">
        <Sparkles className="banner-icon" />
        <span>Mockup Preview — Interactive elements are visual only</span>
        <span className="banner-hint">Press ESC to toggle</span>
      </div>

      {/* Full-page iframe with mockup content */}
      <iframe
        srcDoc={mockupHtml}
        className="mockup-overlay-frame"
        title="Mockup Preview"
        sandbox="allow-same-origin"
      />

      {/* Toggle button to show/hide mockup */}
      <button
        className="mockup-toggle hide"
        onClick={() => setShowMockup(false)}
        title="Show Original Page"
      >
        <EyeOff className="toggle-icon" />
        Show Original
      </button>
    </div>
  )
}

export default MockupOverlay

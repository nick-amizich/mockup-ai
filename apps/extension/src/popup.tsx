import { useState, useEffect } from 'react'
import { Storage } from '@plasmohq/storage'
import { Sparkles, LogIn, User, Play, Settings } from 'lucide-react'
import './style.css'

const storage = new Storage()

function IndexPopup() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkAuth()
  }, [])

  async function checkAuth() {
    const token = await storage.get('auth_token')
    const userEmail = await storage.get('user_email')
    if (token && userEmail) {
      setIsLoggedIn(true)
      setEmail(userEmail)
    }
    setLoading(false)
  }

  async function handleStartMockup() {
    // Send message to content script to activate sidebar
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (tab.id) {
      chrome.tabs.sendMessage(tab.id, { action: 'toggleSidebar' })
      window.close()
    }
  }

  async function handleLogin() {
    // Open web app login page
    chrome.tabs.create({
      url: process.env.PLASMO_PUBLIC_WEB_URL || 'http://localhost:3000/login'
    })
  }

  async function handleLogout() {
    await storage.remove('auth_token')
    await storage.remove('user_email')
    setIsLoggedIn(false)
    setEmail('')
  }

  if (loading) {
    return (
      <div className="popup-container">
        <div className="loading">Loading...</div>
      </div>
    )
  }

  return (
    <div className="popup-container">
      <header className="popup-header">
        <div className="logo">
          <Sparkles className="icon" />
          <span>Mockup AI</span>
        </div>
      </header>

      <main className="popup-content">
        <p className="welcome-text">
          Create AI-powered website mockups and generate Claude Code prompts.
        </p>

        <button className="btn btn-primary" onClick={handleStartMockup}>
          <Play className="icon-sm" />
          Start Mockup
        </button>

        <p className="hint">
          Click to open the mockup sidebar on the current page
        </p>
      </main>

      <footer className="popup-footer">
        <a
          href={process.env.PLASMO_PUBLIC_WEB_URL || 'http://localhost:3000'}
          target="_blank"
          rel="noopener noreferrer"
        >
          Open Dashboard
        </a>
      </footer>
    </div>
  )
}

export default IndexPopup

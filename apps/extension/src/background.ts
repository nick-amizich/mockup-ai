import { Storage } from '@plasmohq/storage'

const storage = new Storage()

// Listen for messages from popup or content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'getAuthToken') {
    storage.get('auth_token').then((token) => {
      sendResponse({ token })
    })
    return true // Keep channel open for async response
  }

  if (message.action === 'setAuthToken') {
    storage.set('auth_token', message.token).then(() => {
      storage.set('user_email', message.email).then(() => {
        sendResponse({ success: true })
      })
    })
    return true
  }

  if (message.action === 'clearAuth') {
    Promise.all([
      storage.remove('auth_token'),
      storage.remove('user_email')
    ]).then(() => {
      sendResponse({ success: true })
    })
    return true
  }
})

// Handle extension icon click
chrome.action.onClicked.addListener(async (tab) => {
  if (tab.id) {
    // Send message to content script to toggle sidebar
    chrome.tabs.sendMessage(tab.id, { action: 'toggleSidebar' })
  }
})

// Listen for external messages (from web app for auth)
chrome.runtime.onMessageExternal.addListener(
  async (message, sender, sendResponse) => {
    // Verify sender is our web app
    const allowedOrigins = [
      'http://localhost:3000',
      'https://mockup-ai.vercel.app',
      process.env.PLASMO_PUBLIC_WEB_URL
    ].filter(Boolean)

    if (!sender.origin || !allowedOrigins.includes(sender.origin)) {
      sendResponse({ error: 'Unauthorized' })
      return
    }

    if (message.action === 'setAuthFromWeb') {
      await storage.set('auth_token', message.token)
      await storage.set('user_email', message.email)
      sendResponse({ success: true })
    }
  }
)

console.log('Mockup AI background service worker initialized')

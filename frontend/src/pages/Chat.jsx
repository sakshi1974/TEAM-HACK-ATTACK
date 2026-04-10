// src/pages/Chat.jsx

import React, { useState, useRef, useEffect } from 'react'
import Header from '../components/Header'
import { chatAPI } from '../api/api'
import { useAudit } from '../store/auditStore.jsx'

function LoadingDots() {
  return (
    <div className="flex items-center gap-1 py-1 dot-flashing">
      <span /><span /><span />
    </div>
  )
}

function Avatar({ role }) {
  if (role === 'ai') {
    return (
      <div className="w-8 h-8 rounded-full bg-brand-600 flex items-center justify-center flex-shrink-0">
        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2a10 10 0 110 20A10 10 0 0112 2zm0 2a8 8 0 100 16A8 8 0 0012 4zm0 3a1 1 0 011 1v4.586l2.707 2.707a1 1 0 01-1.414 1.414l-3-3A1 1 0 0111 13V8a1 1 0 011-1z" />
        </svg>
      </div>
    )
  }
  return (
    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
      <svg className="w-4 h-4 text-gray-500" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 12a5 5 0 110-10 5 5 0 010 10zm0-2a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 0114 0H5z" />
      </svg>
    </div>
  )
}

export default function Chat() {
  const [messages, setMessages]   = useState([
    { role: 'ai', content: 'Hello! I\'m your AI governance assistant powered by Llama 3. Ask me anything about AI safety, compliance, or your deployed systems.' }
  ])
  const [input, setInput]         = useState('')
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState(null)
  const bottomRef                 = useRef(null)
  const inputRef                  = useRef(null)
  const { addLog }                = useAudit()

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function sendMessage() {
    const prompt = input.trim()
    if (!prompt || loading) return

    setInput('')
    setError(null)
    setMessages((prev) => [...prev, { role: 'user', content: prompt }])
    setLoading(true)

    try {
      const { data } = await chatAPI(prompt)
      const reply = data.response || 'No response received.'
      setMessages((prev) => [...prev, { role: 'ai', content: reply }])
      addLog({ type: 'Chat', input: prompt, output: reply, status: 'OK' })
    } catch (err) {
      const msg = err.message || 'Failed to reach the AI backend.'
      setError(msg)
      setMessages((prev) => [...prev, { role: 'ai', content: `⚠️ ${msg}` }])
      addLog({ type: 'Chat', input: prompt, output: msg, status: 'ERROR' })
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  function formatTime(date = new Date()) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]" style={{ height: 'calc(100vh - 0px)' }}>
      <Header
        title="Chat with AI"
        subtitle="Powered by Llama 3 via Ollama. Press Enter to send."
        actions={
          <button
            onClick={() => setMessages([messages[0]])}
            className="btn-secondary text-xs"
          >
            Clear Chat
          </button>
        }
      />

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto space-y-5 pb-4 min-h-0">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex items-end gap-3 animate-fade-in-up ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
          >
            <Avatar role={msg.role} />
            <div className={`max-w-[72%] ${msg.role === 'user' ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
              <div className={msg.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-ai'}>
                <p className="whitespace-pre-wrap">{msg.content}</p>
              </div>
              <span className="text-[10px] text-gray-400 px-1">{formatTime()}</span>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-end gap-3 animate-fade-in-up">
            <Avatar role="ai" />
            <div className="chat-bubble-ai">
              <LoadingDots />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="flex-shrink-0 pt-4 border-t border-gray-100">
        {error && (
          <div className="mb-2 px-3 py-2 rounded-lg bg-red-50 border border-red-100 text-xs text-red-600">
            {error} — Make sure Ollama is running: <code className="font-mono">ollama run llama3</code>
          </div>
        )}
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Type your message… (Enter to send, Shift+Enter for new line)"
            className="input flex-1 resize-none min-h-[42px] max-h-32"
            style={{ fieldSizing: 'content' }}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || loading}
            className="btn-primary flex-shrink-0 px-5"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
            </svg>
            Send
          </button>
        </div>
      </div>
    </div>
  )
}

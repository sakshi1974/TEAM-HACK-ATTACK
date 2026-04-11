// src/api/api.js — Centralized Axios API service

import axios from 'axios'

const BASE_URL = 'http://127.0.0.1:8000/api/v1'

const client = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 120_000, // 2 min – LLM can be slow
})

// Response interceptor: normalise errors
client.interceptors.response.use(
  (res) => res,
  (err) => {
    const message =
      err.response?.data?.detail ||
      err.response?.data?.message ||
      err.message ||
      'Unknown error'
    return Promise.reject(new Error(message))
  }
)

// ── Existing APIs (preserved) ──
export const chatAPI       = (prompt)  => client.post('/chat',            { prompt })
export const agentRunAPI   = (task)    => client.post('/agent/run',       { task })
export const monitorAPI    = (metrics) => client.post('/monitor/analyze', { metrics })

// ── Loan V1 APIs ──
export const loanApplyAPI  = (data)    => client.post('/loan/apply',      data)
export const loanListAPI   = ()        => client.get('/loan/list')

// ── Loan V2 APIs (Indian format) ──
export const loanApplyV2API   = (data) => client.post('/loan/apply-v2',   data)
export const loanListV2API    = ()     => client.get('/loan/list-v2')

// ── KYC APIs ──
export const ekycAPI          = (data) => client.post('/loan/ekyc',       data)
export const videoKycAPI      = (data) => client.post('/loan/video-kyc',  data)

// ── Auth APIs ──
export const sendOTPAPI       = (mobile) => client.post('/auth/send-otp',    { mobile })
export const verifyOTPAPI     = (mobile, otp) => client.post('/auth/verify-otp', { mobile, otp })
export const logoutAPI        = (token) => client.post('/auth/logout', {}, {
  headers: { Authorization: `Bearer ${token}` },
})
export const checkSessionAPI  = (token) => client.get('/auth/me', {
  headers: { Authorization: `Bearer ${token}` },
})

// ── Audit APIs ──
export const getAuditLogsAPI = (params = {}) => {
  const query = new URLSearchParams()
  if (params.user) query.append('user', params.user)
  if (params.agent) query.append('agent', params.agent)
  if (params.risk_level) query.append('risk_level', params.risk_level)
  if (params.event_type) query.append('event_type', params.event_type)
  if (params.important_only) query.append('important_only', 'true')
  return client.get(`/audit/logs?${query.toString()}`)
}
export const getImportantLogsAPI = () => client.get('/audit/important')
export const getDashboardStatsAPI = () => client.get('/audit/dashboard-stats')
export const clearAuditLogsAPI = () => client.delete('/audit/logs')

// ── WebSocket utility ──
export function createWebSocket(onMessage, onError) {
  const ws = new WebSocket('ws://127.0.0.1:8000/ws')

  ws.onopen = () => {
    console.log('[WS] Connected to real-time stream')
  }

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data)
      if (data.type !== 'HEARTBEAT' && data.type !== 'PONG') {
        onMessage?.(data)
      }
    } catch {
      // ignore parse errors
    }
  }

  ws.onerror = (err) => {
    console.warn('[WS] Error:', err)
    onError?.(err)
  }

  ws.onclose = () => {
    console.log('[WS] Disconnected')
  }

  // Keep alive with ping
  const pingInterval = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send('ping')
    }
  }, 25000)

  return {
    ws,
    close: () => {
      clearInterval(pingInterval)
      ws.close()
    }
  }
}

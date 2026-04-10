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

export const chatAPI       = (prompt)  => client.post('/chat',            { prompt })
export const agentRunAPI   = (task)    => client.post('/agent/run',       { task })
export const monitorAPI    = (metrics) => client.post('/monitor/analyze', { metrics })

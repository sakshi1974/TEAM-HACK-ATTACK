// src/pages/Agent.jsx

import React, { useState } from 'react'
import Header from '../components/Header'
import { agentRunAPI } from '../api/api'
import { useAudit } from '../store/auditStore.jsx'

const SAMPLE_TASKS = [
  'Analyze a high-risk loan application for a small business with 2 years of history.',
  'Review a customer who made 5 large international transfers in 24 hours.',
  'Evaluate an AI model that flagged 40% of transactions as fraudulent.',
]

function ResultCard({ label, value, color = 'blue', icon }) {
  const colors = {
    blue:  'bg-blue-50  border-blue-100  text-blue-800',
    green: 'bg-emerald-50 border-emerald-100 text-emerald-800',
    amber: 'bg-amber-50 border-amber-100 text-amber-800',
  }
  return (
    <div className={`rounded-xl border p-5 ${colors[color]} animate-fade-in-up`}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">{icon}</span>
        <p className="text-xs font-semibold uppercase tracking-wider opacity-60">{label}</p>
      </div>
      <p className="text-sm font-medium leading-relaxed">{value}</p>
    </div>
  )
}

export default function Agent() {
  const [task, setTask]       = useState('')
  const [result, setResult]   = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)
  const { addLog }            = useAudit()

  async function runAgent() {
    const t = task.trim()
    if (!t || loading) return
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const { data } = await agentRunAPI(t)
      setResult(data)
      addLog({
        type: 'Agent',
        input: t,
        output: `Decision: ${data.decision} | Action: ${data.action}`,
        status: 'OK',
      })
    } catch (err) {
      setError(err.message)
      addLog({ type: 'Agent', input: t, output: err.message, status: 'ERROR' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <Header
        title="Agent Dashboard"
        subtitle="Describe a task and let the AI agent analyze it with a structured decision."
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Input panel */}
        <div className="lg:col-span-1 space-y-4">
          <div className="card">
            <p className="section-title mb-1">Task Description</p>
            <p className="section-desc mb-4">Describe what the agent should evaluate or decide.</p>
            <textarea
              rows={5}
              value={task}
              onChange={(e) => setTask(e.target.value)}
              placeholder="e.g. Evaluate a high-risk loan application…"
              className="input resize-none mb-4"
            />
            <button
              onClick={runAgent}
              disabled={!task.trim() || loading}
              className="btn-primary w-full justify-center"
            >
              {loading ? (
                <>
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Running Agent…
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
                  </svg>
                  Run Agent
                </>
              )}
            </button>
          </div>

          {/* Sample tasks */}
          <div className="card">
            <p className="section-title mb-3">Sample Tasks</p>
            <div className="space-y-2">
              {SAMPLE_TASKS.map((t, i) => (
                <button
                  key={i}
                  onClick={() => setTask(t)}
                  className="w-full text-left text-xs text-gray-600 bg-gray-50 hover:bg-brand-50 hover:text-brand-700 border border-gray-100 hover:border-brand-200 rounded-lg px-3 py-2 transition-all"
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Results panel */}
        <div className="lg:col-span-2">
          {!result && !loading && !error && (
            <div className="card h-full flex flex-col items-center justify-center text-center py-20">
              <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3" />
                </svg>
              </div>
              <p className="text-gray-400 text-sm font-medium">Agent results will appear here</p>
              <p className="text-gray-300 text-xs mt-1">Enter a task and click "Run Agent"</p>
            </div>
          )}

          {loading && (
            <div className="card h-full flex flex-col items-center justify-center py-20">
              <svg className="animate-spin w-10 h-10 text-brand-400 mb-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <p className="text-sm text-gray-500 font-medium">Agent is thinking…</p>
              <p className="text-xs text-gray-400 mt-1">Llama 3 is generating a structured response</p>
            </div>
          )}

          {error && (
            <div className="card border-red-100">
              <div className="flex items-center gap-2 text-red-600 mb-2">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
                </svg>
                <p className="text-sm font-semibold">Agent Error</p>
              </div>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {result && (
            <div className="space-y-4">
              {/* Task badge */}
              <div className="card py-4">
                <p className="text-xs text-gray-400 uppercase font-semibold tracking-wider mb-1">Task Submitted</p>
                <p className="text-sm text-gray-700 font-medium">"{result.task}"</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="badge-info">Llama 3</span>
                  <span className="text-xs text-gray-400">{new Date().toLocaleTimeString()}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <ResultCard label="Decision" value={result.decision} color="blue" icon="⚖️" />
                <ResultCard label="Action"   value={result.action}   color="green" icon="✅" />
                <ResultCard label="Reasoning" value={result.reasoning} color="amber" icon="💡" />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

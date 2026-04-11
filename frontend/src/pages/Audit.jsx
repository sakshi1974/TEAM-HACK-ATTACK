// src/pages/Audit.jsx — Enhanced Audit Trail with server-side + client-side logs

import React, { useState, useEffect, useCallback } from 'react'
import Papa from 'papaparse'
import { jsPDF } from 'jspdf'
import Header from '../components/Header'
import { useAudit } from '../store/auditStore.jsx'
import { getAuditLogsAPI, clearAuditLogsAPI } from '../api/api'
import { useToast } from '../components/Toast'

const EVENT_TYPE_OPTIONS = ['All', 'LOAN_APPLICATION', 'KYC_VERIFICATION', 'AI_DECISION', 'ALERT', 'AGENT_RUN']
const RISK_LEVEL_OPTIONS = ['All', 'HIGH', 'MEDIUM', 'LOW']

const EVENT_ICONS = {
  LOAN_APPLICATION: '📋',
  KYC_VERIFICATION: '🔐',
  AI_DECISION: '🤖',
  ALERT: '🔴',
  AGENT_RUN: '⚙️',
}

const DECISION_BADGE = {
  APPROVED: 'badge-approved',
  REJECTED: 'badge-rejected',
  REVIEW: 'badge-review',
  VERIFIED: 'badge-ok',
  MISMATCH_DETECTED: 'badge-alert',
}

function formatTs(iso) {
  return new Date(iso).toLocaleString([], {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
}

export default function Audit() {
  const { logs: clientLogs, clearLogs: clearClientLogs } = useAudit()
  const toast = useToast()

  // Server-side logs
  const [serverLogs, setServerLogs] = useState([])
  const [loading, setLoading] = useState(false)

  // Filters
  const [filterUser, setFilterUser] = useState('')
  const [filterAgent, setFilterAgent] = useState('')
  const [filterRiskLevel, setFilterRiskLevel] = useState('All')
  const [filterEventType, setFilterEventType] = useState('All')
  const [importantOnly, setImportantOnly] = useState(false)
  const [searchText, setSearchText] = useState('')

  const fetchServerLogs = useCallback(async () => {
    setLoading(true)
    try {
      const params = {}
      if (filterUser) params.user = filterUser
      if (filterAgent) params.agent = filterAgent
      if (filterRiskLevel !== 'All') params.risk_level = filterRiskLevel
      if (filterEventType !== 'All') params.event_type = filterEventType
      if (importantOnly) params.important_only = true
      const { data } = await getAuditLogsAPI(params)
      setServerLogs(data.logs || [])
    } catch {
      // Silently fall back to client logs
    } finally {
      setLoading(false)
    }
  }, [filterUser, filterAgent, filterRiskLevel, filterEventType, importantOnly])

  useEffect(() => {
    fetchServerLogs()
  }, [fetchServerLogs])

  // Merge and sort — server logs + client logs (deduped by checking if client log has matching id)
  const allLogs = [
    ...serverLogs,
    ...clientLogs.filter(cl => !serverLogs.some(sl => sl.id === String(cl.id))).map(cl => ({
      id: String(cl.id),
      timestamp: cl.timestamp,
      event_type: cl.type || 'AGENT_RUN',
      user: null,
      agent: null,
      risk_score: null,
      decision: null,
      explanation: `${cl.type}: ${cl.output || ''}`,
      details: { input: cl.input, output: cl.output },
      is_important: cl.status === 'ALERT' || cl.status === 'ERROR',
    })),
  ]

  // Apply search filter
  const filtered = allLogs.filter((log) => {
    if (!searchText) return true
    const s = searchText.toLowerCase()
    return (
      log.explanation?.toLowerCase().includes(s) ||
      log.user?.toLowerCase().includes(s) ||
      log.agent?.toLowerCase().includes(s) ||
      log.event_type?.toLowerCase().includes(s) ||
      log.decision?.toLowerCase().includes(s)
    )
  })

  /* ── CSV Export ── */
  function exportCSV() {
    const csv = Papa.unparse(
      filtered.map((l) => ({
        timestamp: l.timestamp,
        event_type: l.event_type,
        user: l.user || '',
        agent: l.agent || '',
        decision: l.decision || '',
        risk_score: l.risk_score || '',
        explanation: l.explanation,
        important: l.is_important ? 'YES' : 'NO',
      }))
    )
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `fintech_audit_log_${Date.now()}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success(`Exported ${filtered.length} records to CSV`, 'Export Complete')
  }

  /* ── PDF Export ── */
  function exportPDF() {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' })
    const W = 190
    let y = 20

    const line = () => { doc.setDrawColor(220, 220, 220); doc.line(10, y, 200, y); y += 5 }
    const nl = (n = 6) => { y += n }
    const text = (txt, x, size = 11, style = 'normal', color = [30, 30, 40]) => {
      doc.setFontSize(size)
      doc.setFont('helvetica', style)
      doc.setTextColor(...color)
      const lines = doc.splitTextToSize(String(txt), W - x + 10)
      doc.text(lines, x, y)
      y += lines.length * (size * 0.45)
    }

    // ── Cover ──
    doc.setFillColor(37, 99, 235)
    doc.rect(0, 0, 210, 50, 'F')
    doc.setFontSize(22); doc.setFont('helvetica', 'bold'); doc.setTextColor(255, 255, 255)
    doc.text('DHANISHK', 10, 18)
    doc.text('AUDIT REPORT', 10, 28)
    doc.setFontSize(10); doc.setFont('helvetica', 'normal')
    doc.text(`Generated: ${new Date().toLocaleString()}`, 10, 37)
    doc.text(`Total Records: ${filtered.length}`, 10, 44)
    y = 60

    // ── Summary Section ──
    text('EXECUTIVE SUMMARY', 10, 14, 'bold', [37, 99, 235])
    nl(2); line()

    const loanLogs = filtered.filter(l => l.event_type === 'LOAN_APPLICATION')
    const alerts = filtered.filter(l => l.event_type === 'ALERT' || l.is_important)
    const highRisk = filtered.filter(l => l.risk_score && l.risk_score > 0.7)

    text(`This report covers ${filtered.length} audited events from the AI-powered Dhanishk platform.`, 10, 10)
    nl(3)
    text(`• Loan Applications: ${loanLogs.length}`, 14, 10, 'normal', [30, 41, 59])
    nl(1)
    text(`• High-Risk Events: ${highRisk.length}`, 14, 10, 'normal', highRisk.length > 0 ? [220, 50, 50] : [30, 41, 59])
    nl(1)
    text(`• Alerts Triggered: ${alerts.length}`, 14, 10, 'normal', alerts.length > 0 ? [220, 50, 50] : [30, 41, 59])
    nl(8)

    // ── Individual Records ──
    text('DETAILED AUDIT LOG', 10, 14, 'bold', [37, 99, 235])
    nl(2); line()

    filtered.forEach((log, i) => {
      if (y > 260) { doc.addPage(); y = 20 }

      // Record header
      doc.setFillColor(248, 250, 252)
      doc.roundedRect(10, y - 3, W, 8, 2, 2, 'F')
      text(`${i + 1}. ${log.event_type.replace(/_/g, ' ')} — ${formatTs(log.timestamp)}`, 14, 11, 'bold', [15, 23, 42])
      nl(3)

      if (log.user) { text(`Customer: ${log.user}`, 14, 10, 'normal', [75, 85, 99]); nl(2) }
      if (log.agent) { text(`AI Agent: ${log.agent}`, 14, 10, 'normal', [75, 85, 99]); nl(2) }

      if (log.decision) {
        const decColor = log.decision === 'APPROVED' ? [22, 163, 74] :
                         log.decision === 'REJECTED' ? [220, 38, 38] : [217, 119, 6]
        text(`Decision: ${log.decision}`, 14, 11, 'bold', decColor)
        nl(2)
      }

      if (log.risk_score != null) {
        const riskColor = log.risk_score > 0.7 ? [220, 38, 38] :
                          log.risk_score > 0.4 ? [217, 119, 6] : [22, 163, 74]
        text(`Risk Score: ${(log.risk_score * 100).toFixed(0)}%`, 14, 10, 'bold', riskColor)
        nl(2)
      }

      text('Explanation:', 14, 9, 'bold', [75, 85, 99])
      nl(1)
      text(log.explanation, 16, 10, 'normal', [30, 41, 59])
      nl(4)

      if (log.is_important) {
        text('⚠ This is a high-priority event flagged for review.', 14, 9, 'bold', [220, 50, 50])
        nl(3)
      }

      line()
      nl(2)
    })

    if (filtered.length === 0) {
      text('No audit records match the current filters.', 10, 11, 'normal', [107, 114, 128])
    }

    // ── Footer ──
    const pageCount = doc.internal.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i)
      doc.setFontSize(8)
      doc.setTextColor(160, 160, 170)
      doc.text(`Dhanishk Platform — Confidential | Page ${i} of ${pageCount}`, 10, 287)
    }

    doc.save(`FinTech_Audit_Report_${Date.now()}.pdf`)
    toast.success('PDF report generated!', 'Export Complete')
  }

  async function handleClearAll() {
    try {
      await clearAuditLogsAPI()
      clearClientLogs()
      setServerLogs([])
      toast.info('All audit logs cleared', 'Cleared')
    } catch {
      clearClientLogs()
      setServerLogs([])
    }
  }

  return (
    <div>
      <Header
        title="Audit Trail"
        subtitle={`${filtered.length} event${filtered.length !== 1 ? 's' : ''} — AI decisions, KYC verifications, and system alerts`}
        actions={
          <div className="flex items-center gap-2">
            <button onClick={exportCSV} disabled={!filtered.length} className="btn-secondary gap-1.5">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              CSV
            </button>
            <button onClick={exportPDF} disabled={!filtered.length} className="btn-primary gap-1.5">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
              PDF Report
            </button>
            {allLogs.length > 0 && (
              <button onClick={handleClearAll} className="btn-danger gap-1.5">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                </svg>
                Clear
              </button>
            )}
          </div>
        }
      />

      {/* Enhanced Filters */}
      <div className="card-static mb-5 p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div>
            <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">Search</label>
            <input
              type="text"
              placeholder="Search logs…"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="input text-xs"
            />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">User</label>
            <input
              type="text"
              placeholder="Filter by user"
              value={filterUser}
              onChange={(e) => setFilterUser(e.target.value)}
              className="input text-xs"
            />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">Agent</label>
            <input
              type="text"
              placeholder="Filter by agent"
              value={filterAgent}
              onChange={(e) => setFilterAgent(e.target.value)}
              className="input text-xs"
            />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">Event Type</label>
            <select
              value={filterEventType}
              onChange={(e) => setFilterEventType(e.target.value)}
              className="input text-xs"
            >
              {EVENT_TYPE_OPTIONS.map(o => <option key={o} value={o}>{o === 'All' ? 'All Types' : o.replace(/_/g, ' ')}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">Risk Level</label>
            <select
              value={filterRiskLevel}
              onChange={(e) => setFilterRiskLevel(e.target.value)}
              className="input text-xs"
            >
              {RISK_LEVEL_OPTIONS.map(o => <option key={o} value={o}>{o === 'All' ? 'All Levels' : o}</option>)}
            </select>
          </div>
        </div>
        <div className="flex items-center gap-4 mt-3">
          <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
            <input
              type="checkbox"
              checked={importantOnly}
              onChange={(e) => setImportantOnly(e.target.checked)}
              className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
            />
            Show important only (high risk, rejections, anomalies)
          </label>
          <button onClick={fetchServerLogs} className="text-xs text-brand-600 hover:text-brand-700 font-medium ml-auto">
            ↻ Refresh
          </button>
        </div>
      </div>

      {/* Log Table */}
      {loading ? (
        <div className="card-static p-10 text-center">
          <svg className="animate-spin w-8 h-8 text-brand-400 mx-auto mb-3" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
          </svg>
          <p className="text-sm text-gray-500">Loading audit logs…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card-static flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12z" />
            </svg>
          </div>
          <p className="text-gray-400 text-sm font-medium">
            {allLogs.length === 0 ? 'No audit records yet' : 'No results match your filters'}
          </p>
          <p className="text-gray-300 text-xs mt-1">
            {allLogs.length === 0 ? 'Apply for loans to generate audit trail entries.' : 'Try adjusting your search or filters'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((log, i) => (
            <div
              key={log.id || i}
              className={`card-static p-4 animate-fade-in-up ${log.is_important ? 'border-l-4 border-l-red-400' : ''}`}
              style={{ animationDelay: `${Math.min(i, 10) * 0.03}s` }}
            >
              <div className="flex items-start gap-3">
                <span className="text-xl mt-0.5">{EVENT_ICONS[log.event_type] || '📝'}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-xs font-bold text-gray-800">
                      {log.event_type.replace(/_/g, ' ')}
                    </span>
                    {log.decision && (
                      <span className={DECISION_BADGE[log.decision] || 'badge-info'}>
                        {log.decision}
                      </span>
                    )}
                    {log.risk_score != null && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                        log.risk_score > 0.7 ? 'bg-red-100 text-red-700' :
                        log.risk_score > 0.4 ? 'bg-amber-100 text-amber-700' :
                        'bg-emerald-100 text-emerald-700'
                      }`}>
                        Risk: {(log.risk_score * 100).toFixed(0)}%
                      </span>
                    )}
                    {log.is_important && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-50 text-red-600 font-bold">
                        ⚡ Important
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 leading-relaxed">{log.explanation}</p>
                  <div className="flex items-center gap-4 mt-2 text-[10px] text-gray-400">
                    <span>{formatTs(log.timestamp)}</span>
                    {log.user && <span>User: {log.user}</span>}
                    {log.agent && <span>Agent: {log.agent}</span>}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

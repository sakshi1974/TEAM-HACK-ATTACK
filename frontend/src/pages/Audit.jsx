// src/pages/Audit.jsx

import React, { useState } from 'react'
import Papa from 'papaparse'
import { jsPDF } from 'jspdf'
import Header from '../components/Header'
import { useAudit } from '../store/auditStore.jsx'

const TYPE_COLORS = {
  Chat:    'badge-info',
  Agent:   'bg-purple-50 text-purple-700 border-purple-200 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border',
  Monitor: 'bg-amber-50  text-amber-700  border-amber-200  inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border',
  ERROR:   'badge-alert',
}

const STATUS_COLORS = {
  OK:     'badge-ok',
  ALERT:  'badge-alert',
  ERROR:  'badge-alert',
}

function formatTs(iso) {
  return new Date(iso).toLocaleString([], {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
}

function truncate(str, n = 80) {
  return str && str.length > n ? str.slice(0, n) + '…' : str
}

export default function Audit() {
  const { logs, clearLogs } = useAudit()
  const [filter, setFilter] = useState('All')
  const [search, setSearch] = useState('')

  const filtered = logs.filter((l) => {
    const matchType   = filter === 'All' || l.type === filter
    const matchSearch = !search || [l.input, l.output, l.type].some(
      (v) => v?.toLowerCase().includes(search.toLowerCase())
    )
    return matchType && matchSearch
  })

  /* ── CSV Export ── */
  function exportCSV() {
    const csv = Papa.unparse(
      logs.map((l) => ({
        timestamp: l.timestamp,
        type:      l.type,
        input:     l.input,
        output:    l.output,
        status:    l.status,
      }))
    )
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `ai_audit_log_${Date.now()}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  /* ── PDF Export ── */
  function exportPDF() {
    const doc   = new jsPDF({ unit: 'mm', format: 'a4' })
    const W     = 190  // usable width
    let   y     = 20

    const line  = () => { doc.setDrawColor(220, 220, 220); doc.line(10, y, 200, y); y += 5 }
    const nl    = (n = 6) => { y += n }
    const text  = (txt, x, size = 11, style = 'normal', color = [30, 30, 40]) => {
      doc.setFontSize(size)
      doc.setFont('helvetica', style)
      doc.setTextColor(...color)
      const lines = doc.splitTextToSize(txt, W - x + 10)
      doc.text(lines, x, y)
      y += lines.length * (size * 0.45)
    }

    // ── Cover ──
    doc.setFillColor(37, 99, 235)
    doc.rect(0, 0, 210, 45, 'F')
    doc.setFontSize(20); doc.setFont('helvetica', 'bold'); doc.setTextColor(255, 255, 255)
    doc.text('AI SYSTEM AUDIT REPORT', 10, 22)
    doc.setFontSize(10); doc.setFont('helvetica', 'normal')
    doc.text(`Generated: ${new Date().toLocaleString()}`, 10, 32)
    doc.text(`Total Records: ${logs.length}`, 10, 39)
    y = 55

    text('SUMMARY', 10, 13, 'bold', [37, 99, 235])
    nl(2); line()
    text(`This report contains ${logs.length} recorded AI system activities, including chat sessions, agent decisions, and monitoring results.`, 10, 10)
    nl(4)
    text(`Alerts detected: ${logs.filter(l => l.status === 'ALERT' || l.status === 'ERROR').length}`, 10, 10, 'bold', [220, 50, 50])
    nl(8)

    logs.forEach((log, i) => {
      if (y > 265) { doc.addPage(); y = 20 }

      // Record header
      doc.setFillColor(248, 250, 252)
      doc.roundedRect(10, y - 3, W, 8, 2, 2, 'F')
      text(`${i + 1}. ${log.type} Activity — ${formatTs(log.timestamp)}`, 14, 11, 'bold', [15, 23, 42])
      nl(4)

      text('What the user asked:', 14, 9, 'bold', [75, 85, 99])
      nl(1)
      text(`"${log.input}"`, 16, 10, 'normal', [30, 41, 59])
      nl(3)

      text('What the AI decided / responded:', 14, 9, 'bold', [75, 85, 99])
      nl(1)
      text(log.output, 16, 10, 'normal', [30, 41, 59])
      nl(3)

      // Status pill
      const statusColor = log.status === 'OK'
        ? [16, 185, 129]
        : log.status === 'ALERT' || log.status === 'ERROR'
          ? [239, 68, 68]
          : [107, 114, 128]
      text(`System Status: ${log.status}`, 14, 10, 'bold', statusColor)
      nl(6)
      line()
      nl(2)
    })

    if (logs.length === 0) {
      text('No audit records to display. Interact with the platform first.', 10, 11, 'normal', [107, 114, 128])
    }

    doc.save(`AI_Audit_Report_${Date.now()}.pdf`)
  }

  return (
    <div>
      <Header
        title="Audit Trail"
        subtitle={`${logs.length} recorded event${logs.length !== 1 ? 's' : ''} — all chat, agent, and monitoring activities.`}
        actions={
          <div className="flex items-center gap-2">
            <button onClick={exportCSV} disabled={!logs.length} className="btn-secondary gap-1.5">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              Export CSV
            </button>
            <button onClick={exportPDF} disabled={!logs.length} className="btn-primary gap-1.5">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
              Generate PDF Report
            </button>
            {logs.length > 0 && (
              <button onClick={clearLogs} className="btn-danger gap-1.5">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                </svg>
                Clear
              </button>
            )}
          </div>
        }
      />

      {/* Filters */}
      <div className="flex items-center gap-3 mb-5">
        <input
          type="text"
          placeholder="Search logs…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input max-w-xs"
        />
        <div className="flex gap-1.5">
          {['All', 'Chat', 'Agent', 'Monitor'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all
                ${filter === f
                  ? 'bg-brand-600 text-white border-brand-600'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-brand-300 hover:text-brand-600'}`}
            >
              {f}
            </button>
          ))}
        </div>
        <span className="text-xs text-gray-400 ml-auto">{filtered.length} result{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12z" />
            </svg>
          </div>
          <p className="text-gray-400 text-sm font-medium">
            {logs.length === 0 ? 'No audit records yet' : 'No results match your filter'}
          </p>
          <p className="text-gray-300 text-xs mt-1">
            {logs.length === 0 ? 'Start chatting, run an agent, or analyze metrics to see logs here.' : 'Try a different search or filter'}
          </p>
        </div>
      ) : (
        <div className="card overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                {['Timestamp', 'Type', 'User Input', 'AI Output / Result', 'Status'].map((h) => (
                  <th key={h} className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3.5">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50 transition-colors group">
                  <td className="px-5 py-3.5 text-xs text-gray-400 whitespace-nowrap">{formatTs(log.timestamp)}</td>
                  <td className="px-5 py-3.5">
                    <span className={TYPE_COLORS[log.type] || 'badge-info'}>{log.type}</span>
                  </td>
                  <td className="px-5 py-3.5 text-gray-700 max-w-[220px]">
                    <p className="truncate" title={log.input}>{log.input}</p>
                  </td>
                  <td className="px-5 py-3.5 text-gray-600 max-w-[260px]">
                    <p className="truncate text-xs" title={log.output}>{truncate(log.output, 90)}</p>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={STATUS_COLORS[log.status] || 'badge-info'}>{log.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

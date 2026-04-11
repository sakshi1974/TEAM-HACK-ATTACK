// src/pages/Dashboard.jsx — Fintech Dashboard with charts, metrics, carousel

import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import Header from '../components/Header'
import { getDashboardStatsAPI, getAuditLogsAPI, createWebSocket } from '../api/api'
import { useToast } from '../components/Toast'
import { useScrollAnimation } from '../hooks/useScrollAnimation'

const PIE_COLORS = ['#22c55e', '#ef4444', '#f59e0b']

function MetricCard({ label, value, icon, color, delay = 0 }) {
  const ref = useScrollAnimation()
  return (
    <div
      ref={ref}
      className={`scroll-animate scroll-fade-up card-static metric-card p-5 stagger-${delay + 1}`}
      style={{ animationDelay: `${delay * 0.1}s` }}
    >
      <div className="flex items-center justify-between mb-3">
        <span className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${color}`}>
          {icon}
        </span>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500 mt-1 font-medium">{label}</p>
    </div>
  )
}

function Carousel({ items }) {
  const [current, setCurrent] = useState(0)
  const timerRef = useRef(null)

  const next = useCallback(() => {
    setCurrent((p) => (p + 1) % items.length)
  }, [items.length])

  useEffect(() => {
    if (items.length <= 1) return
    timerRef.current = setInterval(next, 5000)
    return () => clearInterval(timerRef.current)
  }, [next, items.length])

  if (!items.length) return null

  return (
    <div className="carousel-container">
      <div
        className="carousel-track"
        style={{ transform: `translateX(-${current * 100}%)` }}
      >
        {items.map((item, i) => (
          <div key={i} className="carousel-slide">
            <div className={`rounded-xl p-5 border ${item.bgClass || 'bg-white border-gray-100'}`}>
              <div className="flex items-start gap-3">
                <span className="text-2xl">{item.icon}</span>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{item.title}</p>
                  <p className="text-xs text-gray-600 mt-1 leading-relaxed">{item.description}</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      {items.length > 1 && (
        <div className="flex justify-center gap-1.5 mt-3">
          {items.map((_, i) => (
            <button
              key={i}
              className={`carousel-dot ${i === current ? 'active' : ''}`}
              onClick={() => setCurrent(i)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default function Dashboard() {
  const [stats, setStats] = useState(null)
  const [recentLogs, setRecentLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const toast = useToast()

  const fetchData = useCallback(async () => {
    try {
      const [statsRes, logsRes] = await Promise.all([
        getDashboardStatsAPI(),
        getAuditLogsAPI({ important_only: true }),
      ])
      setStats(statsRes.data)
      setRecentLogs(logsRes.data.logs?.slice(0, 5) || [])
    } catch (err) {
      console.error('Dashboard fetch error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 10000)
    return () => clearInterval(interval)
  }, [fetchData])

  // WebSocket for real-time updates
  useEffect(() => {
    const { close } = createWebSocket((data) => {
      if (data.type === 'LOAN_UPDATE') {
        toast.info(data.message || 'New loan activity detected', 'Live Update')
        fetchData()
      } else if (data.type === 'ALERT') {
        toast.warning(data.message || 'New alert detected', 'Alert')
        fetchData()
      }
    })
    return close
  }, [fetchData, toast])

  const carouselItems = [
    ...(stats && stats.total_loans > 0
      ? [{
          icon: '📊',
          title: 'Loan Portfolio Summary',
          description: `${stats.total_loans} total applications processed. Approval rate: ${stats.approval_rate}%. Average risk score: ${stats.avg_risk_score}.`,
          bgClass: 'bg-blue-50 border-blue-200',
        }]
      : []),
    ...(stats && stats.high_risk_percent > 20
      ? [{
          icon: '⚠️',
          title: 'High Risk Alert',
          description: `${stats.high_risk_percent}% of applications are high-risk. Review the risk distribution for patterns.`,
          bgClass: 'bg-amber-50 border-amber-200',
        }]
      : []),
    ...(stats && stats.approved > 0
      ? [{
          icon: '✅',
          title: 'Recent Approvals',
          description: `${stats.approved} loans approved with strong credit profiles. AI confidence levels are high.`,
          bgClass: 'bg-emerald-50 border-emerald-200',
        }]
      : []),
    {
      icon: '🤖',
      title: 'AI Agent Status',
      description: 'All AI agents are operational. Supervisor Agent is validating decisions in real-time.',
      bgClass: 'bg-purple-50 border-purple-200',
    },
    {
      icon: '🔒',
      title: 'System Security',
      description: 'eKYC and Video KYC systems are active. No anomalies detected in the current session.',
      bgClass: 'bg-sky-50 border-sky-200',
    },
  ]

  // Shimmer skeleton
  if (loading) {
    return (
      <div>
        <Header title="Dashboard" subtitle="Loading analytics…" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[1,2,3,4].map(i => (
            <div key={i} className="card-static p-5">
              <div className="shimmer h-10 w-10 rounded-xl mb-3" />
              <div className="shimmer h-6 w-20 rounded mb-2" />
              <div className="shimmer h-3 w-32 rounded" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  const s = stats || {
    total_loans: 0, approved: 0, rejected: 0, under_review: 0,
    approval_rate: 0, high_risk_percent: 0, alerts_triggered: 0, avg_risk_score: 0,
    loan_trends: [], risk_distribution: [],
  }

  const pieData = [
    { name: 'Approved', value: s.approved },
    { name: 'Rejected', value: s.rejected },
    { name: 'Under Review', value: s.under_review },
  ].filter(d => d.value > 0)

  return (
    <div>
      <Header
        title="Dashboard"
        subtitle="Real-time analytics and insights"
      />

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard label="Total Loans" value={s.total_loans} icon="📋" color="bg-blue-100" delay={0} />
        <MetricCard label="Approval Rate" value={`${s.approval_rate}%`} icon="✅" color="bg-emerald-100" delay={1} />
        <MetricCard label="High Risk" value={`${s.high_risk_percent}%`} icon="⚠️" color="bg-amber-100" delay={2} />
        <MetricCard label="Alerts" value={s.alerts_triggered} icon="🔔" color="bg-red-100" delay={3} />
      </div>

      {/* Carousel */}
      <div className="mb-6">
        <Carousel items={carouselItems} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
        {/* Loan Trends Line Chart */}
        <div className="card-static">
          <p className="section-title mb-1">Loan Trends</p>
          <p className="section-desc mb-4">Applications over time</p>
          {s.loan_trends.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={s.loan_trends} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9ca3af' }} />
                <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="count" name="Total" stroke="#2563eb" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="approved" name="Approved" stroke="#22c55e" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="rejected" name="Rejected" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[240px] text-gray-400 text-sm">
              No loan data yet. Apply for loans to see trends.
            </div>
          )}
        </div>

        {/* Risk Distribution Bar Chart */}
        <div className="card-static">
          <p className="section-title mb-1">Risk Distribution</p>
          <p className="section-desc mb-4">Breakdown by risk level</p>
          {s.risk_distribution.some(d => d.count > 0) ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={s.risk_distribution} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="level" tick={{ fontSize: 10, fill: '#9ca3af' }} />
                <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: 12 }} />
                <Bar dataKey="count" name="Applications" fill="#2563eb" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[240px] text-gray-400 text-sm">
              No risk data yet.
            </div>
          )}
        </div>
      </div>

      {/* Pie Chart + Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Pie Chart */}
        <div className="card-static">
          <p className="section-title mb-1">Decision Breakdown</p>
          <p className="section-desc mb-4">Approval vs Rejection ratio</p>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  dataKey="value"
                  paddingAngle={3}
                  animationBegin={0}
                  animationDuration={800}
                >
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[240px] text-gray-400 text-sm">
              No decision data yet.
            </div>
          )}
        </div>

        {/* Recent Important Activity */}
        <div className="card-static">
          <p className="section-title mb-1">Recent Important Events</p>
          <p className="section-desc mb-4">High-priority audit log entries</p>
          {recentLogs.length > 0 ? (
            <div className="space-y-3 max-h-[240px] overflow-y-auto">
              {recentLogs.map((log, i) => (
                <div
                  key={log.id}
                  className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 border border-gray-100 animate-fade-in-up"
                  style={{ animationDelay: `${i * 0.05}s` }}
                >
                  <span className="text-lg mt-0.5">
                    {log.event_type === 'ALERT' ? '🔴' :
                     log.event_type === 'LOAN_APPLICATION' ? '📋' :
                     log.event_type === 'KYC_VERIFICATION' ? '🔐' : '🤖'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-semibold text-gray-700">{log.event_type.replace(/_/g, ' ')}</span>
                      {log.decision && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold
                          ${log.decision === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' :
                            log.decision === 'REJECTED' ? 'bg-red-100 text-red-700' :
                            'bg-amber-100 text-amber-700'}`}>
                          {log.decision}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 line-clamp-2">{log.explanation}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-[240px] text-gray-400 text-sm">
              No important events yet. Apply for loans to generate activity.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

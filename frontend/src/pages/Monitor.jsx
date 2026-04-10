// src/pages/Monitor.jsx

import React, { useState } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ResponsiveContainer, Legend,
} from 'recharts'
import Header from '../components/Header'
import { monitorAPI } from '../api/api'
import { useAudit } from '../store/auditStore.jsx'

const SAMPLE_DATA = {
  normal:  '2.1, 2.3, 2.0, 2.4, 2.2, 2.1, 2.5, 2.3, 2.2, 2.0',
  spiked:  '1.9, 2.0, 2.1, 2.3, 2.0, 18.5, 2.2, 1.8, 22.1, 2.1, 2.0, 2.3',
  gradual: '1.0, 1.5, 2.1, 2.8, 3.5, 4.2, 5.0, 6.2, 8.1, 14.5, 22.0',
}

function CustomDot({ cx, cy, payload }) {
  if (!payload.isAnomaly) return null
  return <circle cx={cx} cy={cy} r={6} fill="#ef4444" stroke="#fff" strokeWidth={2} />
}

export default function Monitor() {
  const [input, setInput]         = useState('')
  const [result, setResult]       = useState(null)
  const [chartData, setChartData] = useState([])
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState(null)
  const { addLog }                = useAudit()

  function parseMetrics(raw) {
    return raw
      .split(',')
      .map((s) => parseFloat(s.trim()))
      .filter((n) => !isNaN(n))
  }

  async function analyze() {
    const metrics = parseMetrics(input)
    if (metrics.length < 2) { setError('Enter at least 2 numeric values separated by commas.'); return }
    setLoading(true); setError(null); setResult(null)

    try {
      const { data } = await monitorAPI(metrics)
      setResult(data)

      // Build chart data – mark anomalous points using score percentile
      const scores  = data.scores || []
      const minScore = Math.min(...scores)
      const threshold = minScore * 0.95  // lower score = more anomalous

      setChartData(
        metrics.map((val, i) => ({
          index: `#${i + 1}`,
          value: val,
          isAnomaly: scores[i] !== undefined && scores[i] <= threshold,
          score: scores[i] != null ? +scores[i].toFixed(4) : null,
        }))
      )

      addLog({
        type: 'Monitor',
        input: metrics.join(', '),
        output: `Status: ${data.status} | Anomalies: ${data.anomaly_count}/${data.total_points}`,
        status: data.status,
      })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function loadSample(key) {
    setInput(SAMPLE_DATA[key])
    setResult(null); setChartData([])
  }

  return (
    <div>
      <Header
        title="Monitoring Dashboard"
        subtitle="Submit system metrics to detect anomalies using Isolation Forest."
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Input */}
        <div className="lg:col-span-1 space-y-4">
          <div className="card">
            <p className="section-title mb-1">Metric Values</p>
            <p className="section-desc mb-3">Enter comma-separated numbers (e.g. response times, error rates).</p>
            <textarea
              rows={5}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="1.2, 1.5, 1.3, 18.9, 1.4, 1.2…"
              className="input resize-none mb-3"
            />
            <button onClick={analyze} disabled={loading || !input.trim()} className="btn-primary w-full justify-center">
              {loading
                ? <><svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg> Analyzing…</>
                : <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 15.803a7.5 7.5 0 0010.607 0z"/></svg> Analyze</>
              }
            </button>
          </div>

          {/* Sample loaders */}
          <div className="card">
            <p className="section-title mb-3">Load Sample Data</p>
            <div className="space-y-2">
              {[
                { key: 'normal',  label: '✅ Normal pattern',  desc: 'All values within range' },
                { key: 'spiked',  label: '⚠️ Sudden spikes',   desc: 'Two large anomalies' },
                { key: 'gradual', label: '📈 Gradual drift',    desc: 'Escalating values' },
              ].map(({ key, label, desc }) => (
                <button
                  key={key}
                  onClick={() => loadSample(key)}
                  className="w-full text-left bg-gray-50 hover:bg-brand-50 hover:border-brand-200 border border-gray-100 rounded-lg px-3 py-2.5 transition-all"
                >
                  <p className="text-xs font-semibold text-gray-700">{label}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{desc}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Results + Chart */}
        <div className="lg:col-span-2 space-y-4">
          {/* Status banner */}
          {result && (
            <div className={`rounded-xl border p-5 flex items-center justify-between animate-fade-in-up
              ${result.anomaly ? 'bg-red-50 border-red-200' : 'bg-emerald-50 border-emerald-200'}`}>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  {result.anomaly
                    ? <span className="badge-alert">⚠ ALERT</span>
                    : <span className="badge-ok">✓ OK</span>}
                </div>
                <p className={`text-sm font-semibold ${result.anomaly ? 'text-red-800' : 'text-emerald-800'}`}>
                  {result.anomaly
                    ? `${result.anomaly_count} anomal${result.anomaly_count === 1 ? 'y' : 'ies'} detected out of ${result.total_points} data points`
                    : `All ${result.total_points} data points are within normal range`}
                </p>
                <p className={`text-xs mt-0.5 ${result.anomaly ? 'text-red-600' : 'text-emerald-600'}`}>
                  {result.anomaly
                    ? 'Unusual values detected — review highlighted points on the chart below.'
                    : 'No unusual activity. System is operating normally.'}
                </p>
              </div>
              <div className={`w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0
                ${result.anomaly ? 'bg-red-100' : 'bg-emerald-100'}`}>
                {result.anomaly
                  ? <svg className="w-7 h-7 text-red-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd"/></svg>
                  : <svg className="w-7 h-7 text-emerald-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd"/></svg>}
              </div>
            </div>
          )}

          {/* Chart */}
          {chartData.length > 0 && (
            <div className="card animate-fade-in-up">
              <p className="section-title mb-1">Metric Visualization</p>
              <p className="section-desc mb-4">
                Red dots indicate anomalous data points detected by Isolation Forest.
              </p>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={chartData} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="index" tick={{ fontSize: 11, fill: '#9ca3af' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} />
                  <Tooltip
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: 12 }}
                    formatter={(v, name) => [typeof v === 'number' ? v.toFixed(3) : v, name]}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <ReferenceLine
                    y={chartData.filter(d => d.isAnomaly).map(d => d.value)[0]}
                    stroke="#fca5a5"
                    strokeDasharray="4 4"
                    label={{ value: 'anomaly threshold', fontSize: 10, fill: '#ef4444' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="value"
                    name="Metric Value"
                    stroke="#2563eb"
                    strokeWidth={2}
                    dot={(props) => <CustomDot {...props} />}
                    activeDot={{ r: 5, fill: '#2563eb' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {!result && !loading && (
            <div className="card flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75z" />
                </svg>
              </div>
              <p className="text-gray-400 text-sm font-medium">Chart will appear after analysis</p>
              <p className="text-gray-300 text-xs mt-1">Load sample data or enter your own metrics</p>
            </div>
          )}

          {error && (
            <div className="card border-red-100 bg-red-50">
              <p className="text-sm font-semibold text-red-700 mb-1">Analysis Failed</p>
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

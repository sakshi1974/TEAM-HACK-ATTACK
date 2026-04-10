// src/store/auditStore.js — Global audit-log state via React Context

import React, { createContext, useContext, useState, useCallback } from 'react'

const AuditContext = createContext(null)

export function AuditProvider({ children }) {
  const [logs, setLogs] = useState([])

  const addLog = useCallback((entry) => {
    setLogs((prev) => [
      {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        ...entry,
      },
      ...prev,
    ])
  }, [])

  const clearLogs = useCallback(() => setLogs([]), [])

  return (
    <AuditContext.Provider value={{ logs, addLog, clearLogs }}>
      {children}
    </AuditContext.Provider>
  )
}

export function useAudit() {
  const ctx = useContext(AuditContext)
  if (!ctx) throw new Error('useAudit must be used inside <AuditProvider>')
  return ctx
}

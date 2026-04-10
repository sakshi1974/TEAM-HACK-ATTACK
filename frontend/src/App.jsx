// src/App.jsx

import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuditProvider } from './store/auditStore.jsx'
import Layout from './components/Layout'
import Chat    from './pages/Chat'
import Agent   from './pages/Agent'
import Monitor from './pages/Monitor'
import Audit   from './pages/Audit'

export default function App() {
  return (
    <AuditProvider>
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/"        element={<Navigate to="/chat" replace />} />
            <Route path="/chat"    element={<Chat />} />
            <Route path="/agent"   element={<Agent />} />
            <Route path="/monitor" element={<Monitor />} />
            <Route path="/audit"   element={<Audit />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </AuditProvider>
  )
}

// src/App.jsx

import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuditProvider } from './store/auditStore.jsx'
import { AuthProvider, useAuth } from './store/authStore.jsx'
import { ToastProvider } from './components/Toast.jsx'
import { ThemeProvider } from './store/themeStore.jsx'
import Layout    from './components/Layout'
import Login     from './pages/Login'
import Dashboard from './pages/Dashboard'
import LoanApply from './pages/LoanApply'
import Chat      from './pages/Chat'
import Agent     from './pages/Agent'
import Monitor   from './pages/Monitor'
import Audit     from './pages/Audit'

function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth()
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }
  return children
}

function AppRoutes() {
  const { isAuthenticated } = useAuth()

  return (
    <Routes>
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />}
      />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout>
              <Navigate to="/dashboard" replace />
            </Layout>
          </ProtectedRoute>
        }
      />
      {[
        { path: '/dashboard',   component: Dashboard },
        { path: '/loan-apply',  component: LoanApply },
        { path: '/chat',        component: Chat },
        { path: '/agent',       component: Agent },
        { path: '/monitor',     component: Monitor },
        { path: '/audit',       component: Audit },
      ].map(({ path, component: Component }) => (
        <Route
          key={path}
          path={path}
          element={
            <ProtectedRoute>
              <Layout>
                <Component />
              </Layout>
            </ProtectedRoute>
          }
        />
      ))}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AuditProvider>
          <ToastProvider>
            <BrowserRouter>
              <AppRoutes />
            </BrowserRouter>
          </ToastProvider>
        </AuditProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}

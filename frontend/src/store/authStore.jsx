// src/store/authStore.jsx — Authentication state via React Context

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = sessionStorage.getItem('fintech_user')
    return saved ? JSON.parse(saved) : null
  })
  const [token, setToken] = useState(() => sessionStorage.getItem('fintech_token'))

  useEffect(() => {
    if (user) {
      sessionStorage.setItem('fintech_user', JSON.stringify(user))
    } else {
      sessionStorage.removeItem('fintech_user')
    }
  }, [user])

  useEffect(() => {
    if (token) {
      sessionStorage.setItem('fintech_token', token)
    } else {
      sessionStorage.removeItem('fintech_token')
    }
  }, [token])

  const login = useCallback((mobile, sessionToken) => {
    setUser({ mobile })
    setToken(sessionToken)
  }, [])

  const logoutUser = useCallback(() => {
    setUser(null)
    setToken(null)
    sessionStorage.removeItem('fintech_user')
    sessionStorage.removeItem('fintech_token')
  }, [])

  const isAuthenticated = !!user && !!token

  return (
    <AuthContext.Provider value={{ user, token, isAuthenticated, login, logout: logoutUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}

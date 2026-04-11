// src/pages/Login.jsx — Fintech OTP Login

import React, { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../store/authStore'
import { sendOTPAPI, verifyOTPAPI } from '../api/api'

export default function Login() {
  const [step, setStep] = useState('mobile') // 'mobile' | 'otp'
  const [mobile, setMobile] = useState('')
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const otpRefs = useRef([])
  const navigate = useNavigate()
  const { login } = useAuth()

  useEffect(() => {
    if (step === 'otp' && otpRefs.current[0]) {
      otpRefs.current[0].focus()
    }
  }, [step])

  async function handleSendOTP(e) {
    e.preventDefault()
    const cleaned = mobile.replace(/\s|-/g, '')
    if (!/^[6-9]\d{9}$/.test(cleaned)) {
      setError('Enter a valid 10-digit Indian mobile number')
      return
    }
    setLoading(true)
    setError('')
    try {
      await sendOTPAPI(cleaned)
      setSuccess('OTP sent! Any dummy 6-digit code will work.')
      setStep('otp')
    } catch (err) {
      setError(err.message || 'Failed to send OTP')
    } finally {
      setLoading(false)
    }
  }

  function handleOtpChange(index, value) {
    if (value.length > 1) value = value[0]
    if (value && !/^\d$/.test(value)) return

    const newOtp = [...otp]
    newOtp[index] = value
    setOtp(newOtp)

    // Auto-focus next
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus()
    }
  }

  function handleOtpKeyDown(index, e) {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus()
    }
  }

  function handleOtpPaste(e) {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (pasted.length === 6) {
      setOtp(pasted.split(''))
      otpRefs.current[5]?.focus()
    }
  }

  async function handleVerifyOTP(e) {
    e.preventDefault()
    const code = otp.join('')
    if (code.length !== 6) {
      setError('Enter all 6 digits')
      return
    }
    setLoading(true)
    setError('')
    try {
      const { data } = await verifyOTPAPI(mobile.replace(/\s|-/g, ''), code)
      if (data.success) {
        login(data.mobile, data.token)
        navigate('/dashboard')
      } else {
        setError(data.message || 'Invalid OTP')
      }
    } catch (err) {
      setError(err.message || 'Verification failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen login-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8 animate-fade-in-up">
          <div className="w-16 h-16 bg-brand-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-glow-blue">
            <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2a10 10 0 110 20A10 10 0 0112 2zm0 2a8 8 0 100 16A8 8 0 0012 4zm0 3a1 1 0 011 1v4.586l2.707 2.707a1 1 0 01-1.414 1.414l-3-3A1 1 0 0111 13V8a1 1 0 011-1z"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Dhanishk</h1>
          <p className="text-sm text-gray-500 mt-1">AI-Powered Banking Platform</p>
        </div>

        {/* Login Card */}
        <div className="login-card animate-scale-in" style={{ animationDelay: '0.1s' }}>
          {step === 'mobile' ? (
            <form onSubmit={handleSendOTP}>
              <h2 className="text-lg font-bold text-gray-900 mb-1">Welcome back</h2>
              <p className="text-sm text-gray-500 mb-6">Enter your mobile number to get started</p>

              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
                Mobile Number
              </label>
              <div className="relative mb-4">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 font-medium">+91</span>
                <input
                  type="tel"
                  value={mobile}
                  onChange={(e) => { setMobile(e.target.value); setError('') }}
                  placeholder="98765 43210"
                  className={`input pl-12 text-lg tracking-wide ${error ? 'input-error' : ''}`}
                  maxLength={12}
                  autoFocus
                />
              </div>

              {error && (
                <div className="mb-4 px-3 py-2 rounded-lg bg-red-50 border border-red-100 text-xs text-red-600 animate-fade-in-up">
                  {error}
                </div>
              )}
              {success && (
                <div className="mb-4 px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-100 text-xs text-emerald-600 animate-fade-in-up">
                  {success}
                </div>
              )}

              <button type="submit" disabled={loading || !mobile.trim()} className="btn-primary w-full justify-center py-3 text-base">
                {loading ? (
                  <>
                    <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                    Sending OTP…
                  </>
                ) : 'Send OTP'}
              </button>

              <p className="text-center text-xs text-gray-400 mt-4">
                By continuing, you agree to our Terms & Privacy Policy
              </p>
            </form>
          ) : (
            <form onSubmit={handleVerifyOTP}>
              <button
                type="button"
                onClick={() => { setStep('mobile'); setOtp(['','','','','','']); setError('') }}
                className="text-sm text-brand-600 hover:text-brand-700 font-medium mb-4 flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                </svg>
                Change number
              </button>

              <h2 className="text-lg font-bold text-gray-900 mb-1">Enter OTP</h2>
              <p className="text-sm text-gray-500 mb-6">
                OTP validation disabled for now. MOCK OTP for <span className="font-semibold text-gray-700">+91 {mobile}</span> (Enter any 6 digits)
              </p>

              <div className="flex gap-3 justify-center mb-6" onPaste={handleOtpPaste}>
                {otp.map((digit, i) => (
                  <input
                    key={i}
                    ref={(el) => (otpRefs.current[i] = el)}
                    type="text"
                    inputMode="numeric"
                    value={digit}
                    onChange={(e) => handleOtpChange(i, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(i, e)}
                    className={`w-12 h-14 text-center text-xl font-bold border-2 rounded-xl transition-all
                      ${digit ? 'border-brand-500 bg-brand-50/30' : 'border-gray-200'}
                      focus:outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-200
                      ${error ? 'border-red-300 bg-red-50/30' : ''}`}
                    maxLength={1}
                  />
                ))}
              </div>

              {error && (
                <div className="mb-4 px-3 py-2 rounded-lg bg-red-50 border border-red-100 text-xs text-red-600 text-center animate-fade-in-up">
                  {error}
                </div>
              )}

              <button type="submit" disabled={loading || otp.join('').length !== 6} className="btn-primary w-full justify-center py-3 text-base">
                {loading ? (
                  <>
                    <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                    Verifying…
                  </>
                ) : 'Verify & Login'}
              </button>

              <p className="text-center text-xs text-gray-400 mt-4">
                You can enter <span className="font-semibold">any dummy 6-digit</span> code.
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

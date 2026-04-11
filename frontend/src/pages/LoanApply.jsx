// src/pages/LoanApply.jsx — Multi-step Indian Loan Application

import React, { useState, useEffect } from 'react'
import Header from '../components/Header'
import { loanApplyV2API, ekycAPI, videoKycAPI } from '../api/api'
import { useToast } from '../components/Toast'
import { useAuth } from '../store/authStore'

const STEPS = ['Personal Info', 'KYC Verification', 'Loan Details', 'AI Decision']

function StepIndicator({ currentStep, steps }) {
  return (
    <div className="step-indicator justify-center mb-8">
      {steps.map((label, i) => (
        <React.Fragment key={i}>
          <div className="flex flex-col items-center">
            <div className={`step-dot ${i < currentStep ? 'complete' : i === currentStep ? 'active' : 'pending'}`}>
              {i < currentStep ? (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                i + 1
              )}
            </div>
            <span className={`text-[10px] mt-1.5 font-medium ${i <= currentStep ? 'text-brand-600' : 'text-gray-400'}`}>
              {label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div className={`step-line ${i < currentStep ? 'complete' : i === currentStep ? 'active' : 'pending'}`} />
          )}
        </React.Fragment>
      ))}
    </div>
  )
}

function RiskGauge({ score }) {
  const angle = score * 180
  const color = score <= 0.3 ? '#22c55e' : score <= 0.6 ? '#f59e0b' : '#ef4444'
  return (
    <div className="risk-gauge mb-2">
      <svg viewBox="0 0 120 70" className="w-full">
        <path d="M 10 60 A 50 50 0 0 1 110 60" fill="none" stroke="#f3f4f6" strokeWidth="8" strokeLinecap="round" />
        <path
          d="M 10 60 A 50 50 0 0 1 110 60"
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray="157"
          strokeDashoffset={157 - (score * 157)}
          className="risk-gauge-arc"
        />
        <text x="60" y="55" textAnchor="middle" className="text-lg font-bold" fill={color} fontSize="18">
          {(score * 100).toFixed(0)}%
        </text>
        <text x="60" y="68" textAnchor="middle" fill="#9ca3af" fontSize="8">RISK SCORE</text>
      </svg>
    </div>
  )
}

function FieldError({ error }) {
  if (!error) return null
  return (
    <p className="text-xs text-red-500 mt-1 flex items-center gap-1 animate-fade-in-up">
      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
      </svg>
      {error}
    </p>
  )
}

export default function LoanApply() {
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})
  const [ekycResult, setEkycResult] = useState(null)
  const [videoKycResult, setVideoKycResult] = useState(null)
  const [loanResult, setLoanResult] = useState(null)
  const [geoLocation, setGeoLocation] = useState(null)
  const toast = useToast()
  const { user } = useAuth()

  const [form, setForm] = useState({
    name: '',
    mobile: user?.mobile || '',
    aadhaar: '',
    pan: '',
    income: '',
    credit_score: '',
    loan_amount: '',
  })

  // Capture geolocation on mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setGeoLocation({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            city: 'Auto-detected',
          })
        },
        () => {
          // Mock location if denied
          setGeoLocation({
            latitude: 28.6139,
            longitude: 77.2090,
            city: 'New Delhi (mock)',
          })
        }
      )
    } else {
      setGeoLocation({ latitude: 19.076, longitude: 72.8777, city: 'Mumbai (mock)' })
    }
  }, [])

  function updateField(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
    if (errors[field]) setErrors((e) => ({ ...e, [field]: null }))
  }

  function validateStep0() {
    const errs = {}
    if (!form.name.trim() || form.name.trim().length < 2) errs.name = 'Enter a valid name (min 2 characters)'
    const mob = form.mobile.replace(/\s|-/g, '')
    if (!/^[6-9]\d{9}$/.test(mob)) errs.mobile = 'Enter a valid 10-digit Indian mobile number'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  function validateStep1() {
    const errs = {}
    const aad = form.aadhaar.replace(/\s|-/g, '')
    if (!/^\d{12}$/.test(aad)) errs.aadhaar = 'Aadhaar must be exactly 12 digits'
    if (!/^[A-Za-z]{5}\d{4}[A-Za-z]$/.test(form.pan.trim())) errs.pan = 'PAN must be in format ABCDE1234F'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  function validateStep2() {
    const errs = {}
    if (!form.income || parseFloat(form.income) <= 0) errs.income = 'Enter a valid annual income'
    if (!form.credit_score || parseInt(form.credit_score) < 300 || parseInt(form.credit_score) > 900) {
      errs.credit_score = 'Credit score must be between 300 and 900'
    }
    if (!form.loan_amount || parseFloat(form.loan_amount) <= 0) errs.loan_amount = 'Enter a valid loan amount'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function handleEKYC() {
    if (!validateStep1()) return
    setLoading(true)
    try {
      const { data } = await ekycAPI({
        aadhaar: form.aadhaar.replace(/\s|-/g, ''),
        pan: form.pan.trim().toUpperCase(),
        name: form.name.trim(),
      })
      setEkycResult(data)
      if (data.status === 'VERIFIED') {
        toast.success('eKYC verification passed!', 'Identity Verified')
      } else {
        toast.error('eKYC verification failed. Please check your details.', 'Verification Failed')
      }
    } catch (err) {
      toast.error(err.message, 'eKYC Error')
    } finally {
      setLoading(false)
    }
  }

  async function handleVideoKYC() {
    setLoading(true)
    try {
      const { data } = await videoKycAPI({
        loan_id: 'PREVIEW',
        name: form.name.trim(),
      })
      setVideoKycResult(data)
      if (data.status === 'VERIFIED') {
        toast.success('Video KYC passed! Face match confirmed.', 'Video KYC')
      } else {
        toast.warning('Video KYC needs review.', 'Video KYC')
      }
    } catch (err) {
      toast.error(err.message, 'Video KYC Error')
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmitLoan() {
    if (!validateStep2()) return
    setLoading(true)
    try {
      const { data } = await loanApplyV2API({
        name: form.name.trim(),
        mobile: form.mobile.replace(/\s|-/g, ''),
        aadhaar: form.aadhaar.replace(/\s|-/g, ''),
        pan: form.pan.trim().toUpperCase(),
        income: parseFloat(form.income),
        credit_score: parseInt(form.credit_score),
        loan_amount: parseFloat(form.loan_amount),
        geo_location: geoLocation,
      })
      setLoanResult(data)
      setStep(3)
      if (data.decision === 'APPROVED') {
        toast.success(`Loan ${data.id} approved!`, '🎉 Congratulations')
      } else if (data.decision === 'REVIEW') {
        toast.info(`Loan ${data.id} sent for review`, 'Under Review')
      } else {
        toast.error(`Loan ${data.id} was not approved`, 'Application Result')
      }
    } catch (err) {
      toast.error(err.message, 'Loan Error')
    } finally {
      setLoading(false)
    }
  }

  function nextStep() {
    if (step === 0 && !validateStep0()) return
    if (step === 1 && !ekycResult) {
      toast.warning('Please complete eKYC verification first')
      return
    }
    if (step === 2) {
      handleSubmitLoan()
      return
    }
    setStep((s) => Math.min(s + 1, 3))
  }

  function prevStep() {
    setStep((s) => Math.max(s - 1, 0))
  }

  return (
    <div>
      <Header title="Loan Application" subtitle="AI-powered loan processing with Indian identity verification" />

      <StepIndicator currentStep={step} steps={STEPS} />

      <div className="max-w-2xl mx-auto">
        {/* Step 0: Personal Info */}
        {step === 0 && (
          <div className="card-static animate-fade-in-up">
            <h2 className="text-lg font-bold text-gray-900 mb-1">Personal Information</h2>
            <p className="text-sm text-gray-500 mb-6">Enter your basic details to get started</p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">Full Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => updateField('name', e.target.value)}
                  placeholder="Enter your full name"
                  className={`input ${errors.name ? 'input-error' : ''}`}
                />
                <FieldError error={errors.name} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">Mobile Number</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">+91</span>
                  <input
                    type="tel"
                    value={form.mobile}
                    onChange={(e) => updateField('mobile', e.target.value)}
                    placeholder="98765 43210"
                    className={`input pl-12 ${errors.mobile ? 'input-error' : ''}`}
                    maxLength={12}
                  />
                </div>
                <FieldError error={errors.mobile} />
              </div>
              {geoLocation && (
                <div className="p-3 rounded-lg bg-sky-50 border border-sky-200 text-xs">
                  <p className="font-semibold text-sky-700 flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                    </svg>
                    Location Detected
                  </p>
                  <p className="text-sky-600 mt-0.5">
                    {geoLocation.city} ({geoLocation.latitude?.toFixed(4)}, {geoLocation.longitude?.toFixed(4)})
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 1: KYC Verification */}
        {step === 1 && (
          <div className="card-static animate-fade-in-up">
            <h2 className="text-lg font-bold text-gray-900 mb-1">KYC Verification</h2>
            <p className="text-sm text-gray-500 mb-6">Verify your identity with Aadhaar and PAN</p>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">Aadhaar Number</label>
                <input
                  type="text"
                  value={form.aadhaar}
                  onChange={(e) => updateField('aadhaar', e.target.value.replace(/[^\d\s-]/g, ''))}
                  placeholder="1234 5678 9012"
                  className={`input tracking-widest ${errors.aadhaar ? 'input-error' : ''}`}
                  maxLength={14}
                />
                <FieldError error={errors.aadhaar} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">PAN Number</label>
                <input
                  type="text"
                  value={form.pan}
                  onChange={(e) => updateField('pan', e.target.value.toUpperCase())}
                  placeholder="ABCDE1234F"
                  className={`input tracking-widest uppercase ${errors.pan ? 'input-error' : ''}`}
                  maxLength={10}
                />
                <FieldError error={errors.pan} />
              </div>
            </div>

            {/* eKYC Button & Result */}
            <div className="space-y-3">
              <button onClick={handleEKYC} disabled={loading} className="btn-primary w-full justify-center">
                {loading ? (
                  <><svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg> Verifying eKYC…</>
                ) : '🔐 Run eKYC Verification'}
              </button>

              {ekycResult && (
                <div className={`p-4 rounded-xl border animate-scale-in ${ekycResult.status === 'VERIFIED' ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={ekycResult.status === 'VERIFIED' ? 'badge-approved' : 'badge-rejected'}>
                      {ekycResult.status === 'VERIFIED' ? '✓ Verified' : '✗ Failed'}
                    </span>
                    <span className="text-xs text-gray-500">Confidence: {(ekycResult.confidence * 100).toFixed(0)}%</span>
                  </div>
                  <p className="text-xs text-gray-600">{ekycResult.explanation}</p>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {Object.entries(ekycResult.checks || {}).map(([key, val]) => (
                      <div key={key} className="flex items-center gap-1.5 text-[10px]">
                        <span className={val === 'PASS' ? 'text-emerald-500' : val === 'FAIL' ? 'text-red-500' : 'text-amber-500'}>
                          {val === 'PASS' ? '✓' : val === 'FAIL' ? '✗' : '⚠'}
                        </span>
                        <span className="text-gray-600">{key.replace(/_/g, ' ')}: {val}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Video KYC */}
              {ekycResult?.status === 'VERIFIED' && (
                <>
                  <button onClick={handleVideoKYC} disabled={loading} className="btn-secondary w-full justify-center">
                    {loading ? 'Processing…' : '📹 Run Video KYC (Simulated)'}
                  </button>
                  {videoKycResult && (
                    <div className={`p-4 rounded-xl border animate-scale-in ${videoKycResult.status === 'VERIFIED' ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className={videoKycResult.status === 'VERIFIED' ? 'badge-approved' : 'badge-warning'}>
                          {videoKycResult.status === 'VERIFIED' ? '✓ Video Verified' : '⚠ Needs Review'}
                        </span>
                        <span className="text-xs text-gray-500">Confidence: {(videoKycResult.confidence * 100).toFixed(0)}%</span>
                      </div>
                      <p className="text-xs text-gray-600">{videoKycResult.explanation}</p>
                      <div className="mt-2 flex gap-4 text-[10px]">
                        <span className={videoKycResult.face_match ? 'text-emerald-600' : 'text-red-600'}>
                          Face Match: {videoKycResult.face_match ? '✓ Pass' : '✗ Fail'}
                        </span>
                        <span className={videoKycResult.liveness_check ? 'text-emerald-600' : 'text-red-600'}>
                          Liveness: {videoKycResult.liveness_check ? '✓ Pass' : '✗ Fail'}
                        </span>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* Step 2: Loan Details */}
        {step === 2 && (
          <div className="card-static animate-fade-in-up">
            <h2 className="text-lg font-bold text-gray-900 mb-1">Loan Details</h2>
            <p className="text-sm text-gray-500 mb-6">Enter your financial information for AI assessment</p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">Annual Income (₹)</label>
                <input
                  type="number"
                  value={form.income}
                  onChange={(e) => updateField('income', e.target.value)}
                  placeholder="e.g. 800000"
                  className={`input ${errors.income ? 'input-error' : ''}`}
                  min="0"
                />
                <FieldError error={errors.income} />
                {form.income > 0 && (
                  <p className="text-[10px] text-gray-400 mt-0.5">Monthly: ₹{(form.income / 12).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">Credit Score</label>
                <input
                  type="number"
                  value={form.credit_score}
                  onChange={(e) => updateField('credit_score', e.target.value)}
                  placeholder="300 – 900"
                  className={`input ${errors.credit_score ? 'input-error' : ''}`}
                  min="300"
                  max="900"
                />
                <FieldError error={errors.credit_score} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">Loan Amount (₹)</label>
                <input
                  type="number"
                  value={form.loan_amount}
                  onChange={(e) => updateField('loan_amount', e.target.value)}
                  placeholder="e.g. 500000"
                  className={`input ${errors.loan_amount ? 'input-error' : ''}`}
                  min="0"
                />
                <FieldError error={errors.loan_amount} />
                {form.loan_amount > 0 && form.income > 0 && (
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    Loan-to-Income ratio: {(form.loan_amount / form.income).toFixed(1)}x
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Step 3: AI Decision */}
        {step === 3 && loanResult && (
          <div className="space-y-4 animate-fade-in-up">
            {/* Decision Banner */}
            <div className={`rounded-2xl p-6 border-2 text-center ${
              loanResult.decision === 'APPROVED' ? 'bg-emerald-50 border-emerald-300' :
              loanResult.decision === 'REJECTED' ? 'bg-red-50 border-red-300' :
              'bg-amber-50 border-amber-300'
            }`}>
              <div className="text-4xl mb-2">
                {loanResult.decision === 'APPROVED' ? '🎉' : loanResult.decision === 'REJECTED' ? '❌' : '🔍'}
              </div>
              <span className={
                loanResult.decision === 'APPROVED' ? 'badge-approved text-sm' :
                loanResult.decision === 'REJECTED' ? 'badge-rejected text-sm' :
                'badge-review text-sm'
              }>
                {loanResult.decision}
              </span>
              <p className="text-sm text-gray-700 mt-3 leading-relaxed">{loanResult.simple_explanation}</p>
            </div>

            {/* Risk Score & Confidence */}
            <div className="grid grid-cols-2 gap-4">
              <div className="card-static text-center py-5">
                <RiskGauge score={loanResult.risk_score} />
                <p className="text-xs text-gray-500 font-medium">Risk Level</p>
              </div>
              <div className="card-static text-center py-5">
                <div className="text-3xl font-bold text-brand-600 mb-1">
                  {(loanResult.confidence * 100).toFixed(0)}%
                </div>
                <p className="text-xs text-gray-500 font-medium">AI Confidence</p>
                <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden mx-4">
                  <div
                    className="h-full bg-brand-500 rounded-full transition-all duration-1000"
                    style={{ width: `${loanResult.confidence * 100}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Supervisor Verdict */}
            {loanResult.supervisor_status && (
              <div className={`card-static p-4 border-l-4 ${
                loanResult.supervisor_status === 'VERIFIED' ? 'border-l-emerald-500' : 'border-l-red-500'
              }`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm">🤖</span>
                  <span className="text-sm font-bold text-gray-900">Supervisor Agent</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                    loanResult.supervisor_status === 'VERIFIED'
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {loanResult.supervisor_status === 'VERIFIED' ? '✓ Agent Verified' : '⚠ Mismatch Detected'}
                  </span>
                </div>
                <p className="text-xs text-gray-600">{loanResult.supervisor_explanation}</p>
              </div>
            )}

            {/* Loan Details Summary */}
            <div className="card-static">
              <p className="section-title mb-3">Application Summary</p>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-gray-400 text-xs">Loan ID</span><p className="font-semibold text-gray-900">{loanResult.id}</p></div>
                <div><span className="text-gray-400 text-xs">Applicant</span><p className="font-semibold text-gray-900">{loanResult.name}</p></div>
                <div><span className="text-gray-400 text-xs">Aadhaar</span><p className="font-mono text-gray-700">{loanResult.aadhaar_masked}</p></div>
                <div><span className="text-gray-400 text-xs">PAN</span><p className="font-mono text-gray-700">{loanResult.pan}</p></div>
                <div><span className="text-gray-400 text-xs">Income</span><p className="font-semibold text-gray-900">₹{loanResult.income?.toLocaleString('en-IN')}</p></div>
                <div><span className="text-gray-400 text-xs">Loan Amount</span><p className="font-semibold text-gray-900">₹{loanResult.loan_amount?.toLocaleString('en-IN')}</p></div>
                {loanResult.geo_location && (
                  <div className="col-span-2">
                    <span className="text-gray-400 text-xs">Location</span>
                    <p className="text-gray-700 text-xs">
                      📍 {loanResult.geo_location.city} ({loanResult.geo_location.latitude?.toFixed(4)}, {loanResult.geo_location.longitude?.toFixed(4)})
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* New Application Button */}
            <button
              onClick={() => { setStep(0); setForm({ name: '', mobile: user?.mobile || '', aadhaar: '', pan: '', income: '', credit_score: '', loan_amount: '' }); setLoanResult(null); setEkycResult(null); setVideoKycResult(null) }}
              className="btn-primary w-full justify-center"
            >
              Apply for Another Loan
            </button>
          </div>
        )}

        {/* Navigation */}
        {step < 3 && (
          <div className="flex justify-between mt-6">
            <button
              onClick={prevStep}
              disabled={step === 0}
              className="btn-secondary"
            >
              ← Back
            </button>
            <button
              onClick={nextStep}
              disabled={loading}
              className="btn-primary"
            >
              {loading ? (
                <><svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg> Processing…</>
              ) : step === 2 ? 'Submit Application →' : 'Continue →'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

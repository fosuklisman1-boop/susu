'use client'

import { useState, useEffect } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { createMomoPayment, syncMomoTransaction } from '@/app/momo-actions/momo'
import { Loader2, Phone, CheckCircle2, XCircle, AlertCircle } from 'lucide-react'
import { getSiteSettings } from '@/app/actions/settings'
import { useToast } from '@/components/ToastProvider'

export default function MomoPaymentForm({ 
  amount, 
  userId, 
  planId = null, 
  groupId = null, 
  metadata = {}, 
  onSuccess, 
  onCancel 
}) {
  const { showToast } = useToast()
  const [phoneNumber, setPhoneNumber] = useState('')
  const [status, setStatus] = useState('idle') // idle, provisioning, pending, success, failed
  const [error, setError] = useState(null)
  const [referenceId, setReferenceId] = useState(null)
  const [pollCount, setPollCount] = useState(0)
  const [isSyncing, setIsSyncing] = useState(false)
  const [settings, setSettings] = useState(null)

  useEffect(() => {
    async function loadSettings() {
      const s = await getSiteSettings()
      if (s) setSettings(s)
    }
    loadSettings()
  }, [])

  // Function to manually check status
  const checkStatus = async () => {
    if (!referenceId || isSyncing) return;
    setIsSyncing(true);
    try {
      const result = await syncMomoTransaction('collection', referenceId);
      console.log('Sync Result:', result);
      if (result && result.status === 'SUCCESSFUL') {
        setStatus('success');
        showToast('Payment verified successfully!', 'success');
        if (onSuccess) setTimeout(onSuccess, 3000);
      } else if (result && result.status === 'FAILED') {
        setStatus('failed');
        const errMsg = result.reason || 'Transaction failed';
        setError(errMsg);
        showToast(errMsg, 'error');
      } else {
        showToast('Payment still pending. Please wait a moment.', 'warning');
      }
    } catch (err) {
      console.error('Manual sync error:', err);
      showToast('Error syncing transaction. Please try again.', 'error');
    } finally {
      setIsSyncing(false);
    }
  }

  // Polling logic
  useEffect(() => {
    let interval;
    if (status === 'pending' && referenceId) {
      interval = setInterval(async () => {
        setPollCount(prev => {
          const next = prev + 1;
          if (next > 40) { // Timeout after ~3.5 minutes
            setStatus('failed');
            const timeoutMsg = `Transaction timed out. If you paid, please contact support at ${settings?.support_phone || 'our helpline'} with reference: ${referenceId}`;
            setError(timeoutMsg);
            showToast('Transaction timed out', 'error');
            clearInterval(interval);
          }
          return next;
        });

        try {
          const result = await syncMomoTransaction('collection', referenceId);
          if (result && result.status === 'SUCCESSFUL') {
            setStatus('success');
            showToast('Payment verified successfully!', 'success');
            clearInterval(interval);
            if (onSuccess) setTimeout(onSuccess, 3000);
          } else if (result && result.status === 'FAILED') {
            setStatus('failed');
            const errMsg = result.reason || 'Transaction failed';
            setError(errMsg);
            showToast(errMsg, 'error');
            clearInterval(interval);
          }
        } catch (err) {
          console.error('Polling error:', err);
        }
      }, 5000);
    }
    return () => clearInterval(interval);
  }, [status, referenceId, onSuccess, settings, showToast]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!phoneNumber) return;
    
    setStatus('provisioning');
    setError(null);

    const result = await createMomoPayment({ 
      amount, 
      phoneNumber, 
      userId,
      planId,
      groupId,
      metadata
    });

    if (result.success) {
      setReferenceId(result.referenceId);
      setStatus('pending');
      setPollCount(0);
      showToast('Payment prompt sent to your phone!', 'success');
    } else {
      setStatus('idle');
      const errMsg = result.error || 'Failed to initiate payment';
      setError(errMsg);
      showToast(errMsg, 'error');
    }
  }

  return (
    <div style={{ padding: '20px' }}>
      <h3 style={{ fontSize: '1.2rem', fontWeight: '800', marginBottom: '16px', textAlign: 'center' }}>
        PAY VIA MTN MOMO
      </h3>

      {status === 'idle' && (
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', marginBottom: '8px', color: '#6b7280', textTransform: 'uppercase' }}>
              Your MoMo Number
            </label>
            <div style={{ position: 'relative' }}>
              <Phone size={18} style={{ position: 'absolute', left: '12px', top: '15px', color: '#9ca3af' }} />
              <input 
                type="tel"
                placeholder="23324XXXXXXX"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                style={{ width: '100%', padding: '14px 14px 14px 40px', borderRadius: '12px', border: '2px solid #e5e7eb', fontSize: '1rem', outline: 'none', boxSizing: 'border-box' }}
                required
              />
            </div>
          </div>

          <button 
            type="submit"
            style={{ width: '100%', background: '#FDBE2C', color: '#000', border: 'none', borderRadius: '12px', padding: '16px', fontSize: '1rem', fontWeight: '800', cursor: 'pointer', boxShadow: '0 4px 12px rgba(253,190,44,0.3)' }}
          >
            SEND PAYMENT PROMPT
          </button>
        </form>
      )}

      {status === 'provisioning' && (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <Loader2 className="animate-spin" size={40} color="#FDBE2C" style={{ margin: '0 auto 16px' }} />
          <p style={{ fontWeight: '600' }}>Initializing Secure Session...</p>
        </div>
      )}

      {status === 'pending' && (
        <div style={{ textAlign: 'center', padding: '30px 0' }}>
          <div style={{ position: 'relative', width: '60px', height: '60px', margin: '0 auto 20px' }}>
            <Loader2 className="animate-spin" size={60} color="#FDBE2C" />
            <Phone size={24} style={{ position: 'absolute', top: '18px', left: '18px', color: '#170b24' }} />
          </div>
          <h4 style={{ fontWeight: '800', marginBottom: '8px' }}>CHECK YOUR PHONE!</h4>
          <p style={{ fontSize: '0.9rem', color: '#6b7280', lineHeight: '1.4', marginBottom: '24px' }}>
            We've sent a MoMo prompt to **{phoneNumber}**. <br/>
            Please enter your PIN to authorize **GHS {amount.toFixed(2)}**.
          </p>
          
          <button 
            onClick={checkStatus}
            disabled={isSyncing}
            style={{ 
              background: '#f3f4f6', border: 'none', borderRadius: '10px', padding: '12px 20px', 
              fontSize: '0.9rem', fontWeight: '700', cursor: isSyncing ? 'wait' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', margin: '0 auto'
            }}
          >
            {isSyncing ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle2 size={16} />}
            {isSyncing ? 'Verifying...' : 'I HAVE PAID'}
          </button>
        </div>
      )}

      {status === 'success' && (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <CheckCircle2 size={60} color="#16a34a" style={{ margin: '0 auto 16px' }} />
          <h4 style={{ fontWeight: '800', color: '#16a34a' }}>PAYMENT SUCCESSFUL!</h4>
          <p style={{ fontSize: '0.9rem', color: '#6b7280' }}>Your Susu contribution has been recorded.</p>
        </div>
      )}

      {status === 'failed' && (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <XCircle size={60} color="#ef4444" style={{ margin: '0 auto 16px' }} />
          <h4 style={{ fontWeight: '800', color: '#ef4444' }}>PAYMENT FAILED</h4>
          <p style={{ fontSize: '0.9rem', color: '#6b7280', marginBottom: '20px' }}>{error}</p>
          <button 
            onClick={() => setStatus('idle')}
            style={{ padding: '10px 20px', borderRadius: '8px', background: '#f3f4f6', border: 'none', fontWeight: '700', cursor: 'pointer' }}
          >
            Try Again
          </button>
        </div>
      )}

      {error && status !== 'failed' && (
        <div style={{ marginTop: '16px', padding: '12px', background: '#fef2f2', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', color: '#b91c1c', fontSize: '0.85rem' }}>
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {onCancel && status === 'idle' && (
        <button 
          onClick={onCancel}
          style={{ width: '100%', marginTop: '12px', background: 'transparent', border: 'none', color: '#6b7280', fontWeight: '600', cursor: 'pointer' }}
        >
          Cancel
        </button>
      )}
    </div>
  )
}

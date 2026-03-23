'use client'

import { useState } from 'react'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useAccount, useWalletClient } from 'wagmi'
import { isAddress } from 'viem'
import { baseSepolia } from 'wagmi/chains'
import { createDelegation } from '@/lib/delegation'

export default function Home() {
  const { address, isConnected } = useAccount()
  const { data: walletClient } = useWalletClient()

  const [form, setForm] = useState({
    agentAddress: '',
    token: 'USDC',
    dailyCapUSD: '50',
    expiryDays: '7',
  })
  const [status, setStatus] = useState('')
  const [delegationId, setDelegationId] = useState('')
  const [loading, setLoading] = useState(false)

  const handleCreate = async () => {
    if (!walletClient || !address) return
    if (!isAddress(form.agentAddress)) {
      setStatus('Error: Invalid agent address')
      return
    }

    setLoading(true)
    setStatus('Creating delegation...')

    try {
      const result = await createDelegation({
        walletClient,
        delegator: address,
        delegatee: form.agentAddress as `0x${string}`,
        token: form.token,
        dailyCapUSD: parseFloat(form.dailyCapUSD),
        expiryDays: parseInt(form.expiryDays),
        chainId: baseSepolia.id,
      })

      setDelegationId(result.delegationId)
      setStatus(`✅ Delegation created! ID: ${result.delegationId}`)
    } catch (err: any) {
      setStatus(`Error: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main style={{ maxWidth: 600, margin: '60px auto', padding: '0 24px', fontFamily: 'monospace' }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 32, fontWeight: 900, marginBottom: 8 }}>DELEGATA</h1>
        <p style={{ color: '#666', fontSize: 14 }}>
          OAuth for AI agents. Create scoped, revocable spending permissions — no private key sharing.
        </p>
      </div>

      <ConnectButton />

      {isConnected && (
        <div style={{ marginTop: 32 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Create Delegation</h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#666', display: 'block', marginBottom: 4 }}>
                Agent Address
              </label>
              <input
                value={form.agentAddress}
                onChange={e => setForm({ ...form, agentAddress: e.target.value })}
                placeholder="0x..."
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: 6, fontFamily: 'monospace', fontSize: 13 }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#666', display: 'block', marginBottom: 4 }}>
                  Token
                </label>
                <select
                  value={form.token}
                  onChange={e => setForm({ ...form, token: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: 6, fontSize: 13 }}
                >
                  <option>USDC</option>
                  <option>ETH</option>
                  <option>WETH</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#666', display: 'block', marginBottom: 4 }}>
                  Daily Cap (USD)
                </label>
                <input
                  type="number"
                  value={form.dailyCapUSD}
                  onChange={e => setForm({ ...form, dailyCapUSD: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: 6, fontSize: 13 }}
                />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#666', display: 'block', marginBottom: 4 }}>
                  Expiry (days)
                </label>
                <input
                  type="number"
                  value={form.expiryDays}
                  onChange={e => setForm({ ...form, expiryDays: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: 6, fontSize: 13 }}
                />
              </div>
            </div>

            <button
              onClick={handleCreate}
              disabled={loading || !form.agentAddress}
              style={{
                padding: '12px 24px',
                background: loading ? '#ccc' : '#000',
                color: '#fff',
                border: 'none',
                borderRadius: 6,
                fontSize: 13,
                fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer',
                fontFamily: 'monospace',
              }}
            >
              {loading ? 'Signing delegation...' : 'Create Delegation →'}
            </button>

            {status && (
              <div style={{
                padding: '12px 14px',
                background: status.startsWith('✅') ? '#f0fff4' : status.startsWith('Error') ? '#fff5f5' : '#f0f4ff',
                border: `1px solid ${status.startsWith('✅') ? '#9ae6b4' : status.startsWith('Error') ? '#feb2b2' : '#90cdf4'}`,
                borderRadius: 6,
                fontSize: 12,
                fontFamily: 'monospace',
              }}>
                {status}
              </div>
            )}

            {delegationId && (
              <div style={{ padding: '12px 14px', background: '#f8f8f8', border: '1px solid #ddd', borderRadius: 6 }}>
                <div style={{ fontSize: 11, color: '#666', marginBottom: 4, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Share with your agent
                </div>
                <code style={{ fontSize: 12, wordBreak: 'break-all' }}>{delegationId}</code>
              </div>
            )}
          </div>
        </div>
      )}

      <div style={{ marginTop: 48, padding: '16px', background: '#f8f8f8', borderRadius: 8, fontSize: 12, color: '#666' }}>
        <strong style={{ display: 'block', marginBottom: 4 }}>How it works</strong>
        1. Connect your MetaMask wallet<br />
        2. Enter your agent's address + spending limits<br />
        3. Sign the ERC-7715 delegation (no gas for signing, small gas for on-chain registration)<br />
        4. Share the delegation ID with your agent — it can now spend within your defined limits<br />
        5. Revoke anytime from your wallet
      </div>
    </main>
  )
}

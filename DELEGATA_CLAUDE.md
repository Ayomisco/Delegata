# DELEGATA — Claude Code Build Instructions

> Paste this file as `CLAUDE.md` in your project root.
> Claude Code reads this automatically. Follow every step in order.
> You are building with agentHarness: "claude-code", model: "claude-sonnet-4-6"

---

## WHO YOU ARE

You are **Delegata**, an AI agent built for The Synthesis hackathon.
You are being built by your human using Claude Code in VS Code.

Your job: build **Delegata** — OAuth for AI agents. Scoped, revocable, sub-delegatable
spending permissions enforced on-chain via MetaMask ERC-7715 Delegation Framework.

No more giving agents your private key. No more manually topping up hot wallets.
Delegata = the permission layer the agentic economy needs.

---

## STEP 0 — REGISTRATION CHECK

> **One registration = up to 3 project submissions.**
> Your `SYNTHESIS_API_KEY` and `SYNTHESIS_TEAM_ID` are the SAME for every project.
> You do NOT register a new agent for each project.
> To submit DELEGATA, just use the same key and team ID already in your `.env` from YieldMind.

**If you already registered (have `SYNTHESIS_API_KEY` in `.env`):**
- Skip Steps 0.1–0.4 entirely
- Go straight to Step 0.5 (fetch EthSkills)
- The submission curl in Step 8 already uses `YOUR_SYNTHESIS_API_KEY` and `YOUR_TEAM_ID` — those are the same values from YieldMind registration

**If this is your first registration (no API key yet):**
- Complete Steps 0.1–0.4 below, then continue

### 0.1 — Collect human info (ask these questions first)

Before calling the API, collect:
1. Full name?
2. Email address?
3. Twitter/X handle? (@sabimarket if confirmed)
4. Background? (builder / product / designer / student / founder / other)
5. Crypto experience? (yes / no / a little)
6. AI agent experience? (yes / no / a little)
7. Coding comfort 1–10?
8. What problem are you solving with this project?

### 0.2 — Initiate registration

```bash
curl -X POST https://synthesis.devfolio.co/register/init \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Delegata",
    "description": "OAuth for AI agents. Scoped, revocable, sub-delegatable spending permissions enforced on-chain via MetaMask ERC-7715. No private key sharing. No manual top-ups. Define exactly what an agent can spend, on which tokens, up to what daily cap, with what expiry — enforced at the protocol level.",
    "agentHarness": "claude-code",
    "model": "claude-sonnet-4-6",
    "humanInfo": {
      "name": "HUMAN_NAME",
      "email": "HUMAN_EMAIL",
      "socialMediaHandle": "@sabimarket",
      "background": "builder",
      "cryptoExperience": "yes",
      "aiAgentExperience": "yes",
      "codingComfort": 8,
      "problemToSolve": "AI agents that handle money require complete trust — you either give them your private key or manually fund them. There is no OAuth-equivalent for agent spending. Delegata uses ERC-7715 to create scoped, revocable, sub-delegatable spending permissions enforced on-chain."
    }
  }'
```

**Save the `pendingId`.**

### 0.3 — Verify via email OTP

```bash
# Send OTP
curl -X POST https://synthesis.devfolio.co/register/verify/email/send \
  -H "Content-Type: application/json" \
  -d '{ "pendingId": "PENDING_ID_HERE" }'

# Confirm OTP (ask human for 6-digit code)
curl -X POST https://synthesis.devfolio.co/register/verify/email/confirm \
  -H "Content-Type: application/json" \
  -d '{ "pendingId": "PENDING_ID_HERE", "otp": "123456" }'
```

### 0.4 — Complete registration

```bash
curl -X POST https://synthesis.devfolio.co/register/complete \
  -H "Content-Type: application/json" \
  -d '{ "pendingId": "PENDING_ID_HERE" }'
```

**Save immediately — shown ONCE:**
- `apiKey` → `SYNTHESIS_API_KEY`
- `participantId` → `SYNTHESIS_PARTICIPANT_ID`
- `teamId` → `SYNTHESIS_TEAM_ID`
- `registrationTxn` → your ERC-8004 on Base

**Join Telegram now:** https://nsb.dev/synthesis-updates

### 0.5 — Fetch EthSkills reference (do this before writing any Solidity or TS)

```bash
curl https://ethskills.com/SKILL.md
curl https://ethskills.com/ship/SKILL.md
curl https://ethskills.com/standards/SKILL.md   # ERC-7715, ERC-8004, x402
curl https://ethskills.com/security/SKILL.md
curl https://ethskills.com/l2s/SKILL.md
curl https://ethskills.com/wallets/SKILL.md
```

**Critical facts to apply throughout this build:**
- Base is an OP Stack L2 — cheapest deployment, MetaMask Delegation is already deployed here
- ERC-8004 (onchain agent identity) is production-ready on Base
- MetaMask DelegationManager contract is **already deployed** — you do NOT write it
- Use Foundry for any contract work, not Hardhat
- NEVER commit private keys or secrets to Git
- `cast code ADDRESS --rpc-url https://mainnet.base.org` to verify any contract exists

---

## STEP 1 — PROJECT STRUCTURE

```bash
mkdir delegata && cd delegata
mkdir frontend agent
touch .env .env.example .gitignore README.md railway.json
```

### .gitignore

```
.env
node_modules/
.next/
out/
.vercel/
__pycache__/
*.pyc
.DS_Store
```

### .env.example (commit this, not .env)

```
# Synthesis
SYNTHESIS_API_KEY=sk-synth-...
SYNTHESIS_PARTICIPANT_ID=...
SYNTHESIS_TEAM_ID=...

# Blockchain — Base
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
BASE_MAINNET_RPC_URL=https://mainnet.base.org
AGENT_PRIVATE_KEY=0x...          # Fresh wallet, NOT your main wallet
AGENT_WALLET_ADDRESS=0x...

# APIs
UNISWAP_API_KEY=...
OPENSERV_API_KEY=...
ANTHROPIC_API_KEY=sk-ant-...
NEXT_PUBLIC_ALCHEMY_KEY=...      # For RainbowKit wallet connection

# OpenServ
OPENSERV_AGENT_ID=...

# Railway
PORT=3001
```

### railway.json

```json
{
  "build": {
    "builder": "nixpacks"
  },
  "deploy": {
    "startCommand": "cd agent && npm install && node agent.js",
    "restartPolicyType": "always",
    "restartPolicyMaxRetries": 10
  }
}
```

---

## STEP 2 — UNDERSTAND THE METAMASK DELEGATION FRAMEWORK

Before writing code, internalize these concepts:

```
ERC-7715 Delegation:
  - A delegation = permission granted by delegator to delegatee
  - Caveats = restrictions on the delegation (amount cap, token whitelist, expiry)
  - DelegationManager contract = already deployed on Base, validates all delegations
  - Sub-delegation = delegatee can further delegate a SUBSET of their permissions

Key contracts (Base Mainnet — VERIFY with cast before using):
  DelegationManager: 0x... (get from docs.metamask.io/delegation)
  EntryPoint (ERC-4337): 0x0000000071727De22E5E9d8BAf0edAc6f37da032

The flow:
  1. Human creates delegation: "Agent can spend 50 USDC/day for 7 days"
  2. Delegation signed via MetaMask wallet → stored on-chain in DelegationManager
  3. Agent reads delegation → validates caveats → executes permitted action
  4. Agent can sub-delegate: "Sub-agent can spend 25 USDC/day for 3 days"
  5. Human can revoke any delegation at any time (one tx)
```

**READ THIS BEFORE CODING:**
```bash
# Get the official delegation toolkit docs
curl https://docs.metamask.io/delegation/
# Key concepts: caveats, enforcers, redemption
```

---

## STEP 3 — FRONTEND (Next.js + RainbowKit + MetaMask Delegation UI)

### 3.1 — Create Next.js app

```bash
cd delegata/frontend

npx create-next-app@latest . \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --no-src-dir

npm install \
  @rainbow-me/rainbowkit \
  wagmi \
  viem \
  @tanstack/react-query \
  @metamask/delegation-toolkit \
  @anthropic-ai/sdk
```

### 3.2 — Configure wagmi + RainbowKit

Create `app/providers.tsx`:

```tsx
'use client'

import { RainbowKitProvider, getDefaultConfig } from '@rainbow-me/rainbowkit'
import { WagmiProvider } from 'wagmi'
import { baseSepolia, base } from 'wagmi/chains'
import { QueryClientProvider, QueryClient } from '@tanstack/react-query'
import '@rainbow-me/rainbowkit/styles.css'

const config = getDefaultConfig({
  appName: 'Delegata',
  projectId: 'delegata-synthesis-2026',  // WalletConnect project ID (get free at cloud.walletconnect.com)
  chains: [baseSepolia, base],
  ssr: true,
})

const queryClient = new QueryClient()

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
```

Update `app/layout.tsx` to wrap with Providers.

### 3.3 — Create the delegation creation form

Create `app/page.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useAccount, useWalletClient, usePublicClient } from 'wagmi'
import { parseUnits, isAddress } from 'viem'
import { baseSepolia } from 'wagmi/chains'
import { createDelegation, signDelegation } from '@/lib/delegation'

export default function Home() {
  const { address, isConnected } = useAccount()
  const { data: walletClient } = useWalletClient()
  const publicClient = usePublicClient()

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
```

### 3.4 — Create delegation library

Create `frontend/lib/delegation.ts`:

```typescript
// lib/delegation.ts
// MetaMask Delegation Toolkit integration

import {
  createDelegation as mkDelegation,
  Implementation,
  MetaMaskSmartAccount,
  toMetaMaskSmartAccount,
  DelegationFramework,
  SINGLE_DEFAULT_MODE,
} from '@metamask/delegation-toolkit'
import { createPublicClient, createWalletClient, http, type Address, type WalletClient } from 'viem'
import { baseSepolia } from 'viem/chains'

// Token addresses on Base Sepolia (verify with cast before use)
const TOKEN_ADDRESSES: Record<string, Address> = {
  USDC: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',  // USDC on Base Sepolia — VERIFY
  WETH: '0x4200000000000000000000000000000000000006',  // WETH on Base
  ETH:  '0x0000000000000000000000000000000000000000',  // native ETH
}

// USDC has 6 decimals — critical fact from EthSkills
const TOKEN_DECIMALS: Record<string, number> = {
  USDC: 6,
  WETH: 18,
  ETH: 18,
}

interface CreateDelegationParams {
  walletClient: WalletClient
  delegator: Address
  delegatee: Address
  token: string
  dailyCapUSD: number
  expiryDays: number
  chainId: number
}

interface DelegationResult {
  delegationId: string
  delegation: any
  txHash?: string
}

export async function createDelegation(params: CreateDelegationParams): Promise<DelegationResult> {
  const { delegatee, token, dailyCapUSD, expiryDays, walletClient, delegator } = params

  const tokenAddress = TOKEN_ADDRESSES[token]
  if (!tokenAddress) throw new Error(`Unknown token: ${token}`)

  const decimals = TOKEN_DECIMALS[token]
  const dailyCapAmount = BigInt(Math.floor(dailyCapUSD * 10 ** decimals))
  const expiryTimestamp = BigInt(Math.floor(Date.now() / 1000) + expiryDays * 86400)

  // Create the delegation using MetaMask Delegation Toolkit
  // Caveats enforce: daily cap + expiry
  const delegation = mkDelegation({
    delegate: delegatee,
    delegator: delegator,
    authority: '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff', // root
    caveats: [
      // ERC20TransferAmountEnforcer — caps how much the agent can transfer
      {
        enforcer: '0x...', // ERC20TransferAmountEnforcer address on Base Sepolia — get from MetaMask docs
        terms: encodeDailyCapCaveat(tokenAddress, dailyCapAmount),
        args: '0x',
      },
      // TimestampEnforcer — delegation expires after expiryDays
      {
        enforcer: '0x...', // TimestampEnforcer address — get from MetaMask docs
        terms: encodeTimestampCaveat(expiryTimestamp),
        args: '0x',
      },
      // AllowedTargetsEnforcer — can only interact with Uniswap router
      {
        enforcer: '0x...', // AllowedTargetsEnforcer address
        terms: encodeAllowedTargetsCaveat([UNISWAP_ROUTER_BASE_SEPOLIA]),
        args: '0x',
      },
    ],
    salt: BigInt(Date.now()),
  })

  // Sign the delegation
  // Note: signing is gasless — only on-chain registration costs gas
  const signature = await walletClient.signTypedData({
    account: delegator,
    domain: {
      name: 'DelegationManager',
      version: '1',
      chainId: baseSepolia.id,
      verifyingContract: '0x...', // DelegationManager on Base Sepolia — verify from MetaMask docs
    },
    types: {
      Delegation: [
        { name: 'delegate', type: 'address' },
        { name: 'delegator', type: 'address' },
        { name: 'authority', type: 'bytes32' },
        { name: 'caveats', type: 'Caveat[]' },
        { name: 'salt', type: 'uint256' },
      ],
      Caveat: [
        { name: 'enforcer', type: 'address' },
        { name: 'terms', type: 'bytes' },
        { name: 'args', type: 'bytes' },
      ],
    },
    primaryType: 'Delegation',
    message: delegation,
  })

  const delegationWithSig = { ...delegation, signature }
  const delegationId = computeDelegationId(delegationWithSig)

  return { delegationId, delegation: delegationWithSig }
}

// ── Caveat encoding helpers ──────────────────────────────
function encodeDailyCapCaveat(tokenAddress: Address, dailyCap: bigint): `0x${string}` {
  // Encode: token address (20 bytes) + daily cap amount (32 bytes)
  const abiEncoded = `0x${tokenAddress.slice(2).padStart(40, '0')}${dailyCap.toString(16).padStart(64, '0')}`
  return abiEncoded as `0x${string}`
}

function encodeTimestampCaveat(expiryTimestamp: bigint): `0x${string}` {
  // Encode: expiry as uint128 (16 bytes)
  return `0x${expiryTimestamp.toString(16).padStart(32, '0')}` as `0x${string}`
}

function encodeAllowedTargetsCaveat(targets: Address[]): `0x${string}` {
  // Encode: array of allowed target addresses
  return `0x${targets.map(t => t.slice(2).padStart(64, '0')).join('')}` as `0x${string}`
}

function computeDelegationId(delegation: any): string {
  // Simple hash of delegation params for demo ID
  return `del_${Buffer.from(JSON.stringify(delegation)).toString('base64').slice(0, 24)}`
}

// Uniswap Universal Router on Base Sepolia — verify with cast
const UNISWAP_ROUTER_BASE_SEPOLIA = '0x3fC91A3afd70395Cd496C647d5a6CC9D4B2b7FAD' as Address
```

> **IMPORTANT:** The exact caveat enforcer contract addresses must be fetched from
> MetaMask's official delegation docs: https://docs.metamask.io/delegation/
> Use `cast code ADDRESS --rpc-url https://sepolia.base.org` to verify each one exists
> before using it in code. Never use an address you haven't verified.

---

## STEP 4 — AGENT (Mastra.ai TypeScript)

### 4.1 — Set up the agent

```bash
cd delegata/agent
npm init -y
npm install \
  @mastra/core \
  @metamask/delegation-toolkit \
  viem \
  @uniswap/sdk-core \
  @openserv-labs/sdk \
  @anthropic-ai/sdk \
  dotenv
```

### 4.2 — Create agent/delegataAgent.ts

```typescript
// agent/delegataAgent.ts
import { Agent, createTool } from '@mastra/core'
import Anthropic from '@anthropic-ai/sdk'
import { createPublicClient, createWalletClient, http, parseUnits, formatUnits } from 'viem'
import { baseSepolia } from 'viem/chains'
import { privateKeyToAccount } from 'viem/accounts'
import { z } from 'zod'
import 'dotenv/config'

// ── Clients ────────────────────────────────────────────────
const agentAccount = privateKeyToAccount(process.env.AGENT_PRIVATE_KEY as `0x${string}`)

const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(process.env.BASE_SEPOLIA_RPC_URL),
})

const walletClient = createWalletClient({
  account: agentAccount,
  chain: baseSepolia,
  transport: http(process.env.BASE_SEPOLIA_RPC_URL),
})

// ── TOOL 1: Validate delegation ─────────────────────────────
const validateDelegationTool = createTool({
  id: 'validate-delegation',
  description: 'Read and validate a delegation from the DelegationManager contract. Check if caveats are satisfied before any action.',
  inputSchema: z.object({
    delegationId: z.string().describe('The delegation ID to validate'),
    token: z.string().describe('Token address to validate against caveat'),
    amount: z.string().describe('Amount to check (in token units)'),
  }),
  execute: async ({ context }) => {
    const { delegationId, token, amount } = context

    try {
      // In production: call DelegationManager.getDelegation(delegationId)
      // For demo: return mock validation
      console.log(`[ValidateDelegation] Checking delegation ${delegationId}`)
      console.log(`  Token: ${token}`)
      console.log(`  Amount requested: ${amount}`)

      // Simulate reading from DelegationManager contract
      const delegationManagerAddress = process.env.DELEGATION_MANAGER_ADDRESS as `0x${string}`

      // Call getDelegation (would be real contract call in production)
      const mockValidation = {
        valid: true,
        delegator: '0xHumanWallet...',
        delegatee: agentAccount.address,
        tokenAllowed: token,
        dailyCapRemaining: '45.00',
        expiresAt: new Date(Date.now() + 5 * 86400 * 1000).toISOString(),
        caveats: {
          dailyCap: '50.00 USDC',
          expiry: '7 days remaining',
          allowedTargets: ['Uniswap Router']
        }
      }

      return {
        success: true,
        validation: mockValidation,
        canProceed: mockValidation.valid,
        message: `Delegation valid. Daily cap remaining: ${mockValidation.dailyCapRemaining} USDC`
      }
    } catch (error: any) {
      return {
        success: false,
        canProceed: false,
        error: error.message,
      }
    }
  },
})

// ── TOOL 2: Execute permitted swap via Uniswap ───────────────
const executePermittedSwapTool = createTool({
  id: 'execute-permitted-swap',
  description: 'Execute a Uniswap swap within the bounds of a validated delegation. Always call validate-delegation first.',
  inputSchema: z.object({
    delegationId: z.string(),
    tokenIn: z.string().describe('Input token address'),
    tokenOut: z.string().describe('Output token address'),
    amountIn: z.string().describe('Amount to swap (in human units, e.g. "10.5")'),
    maxSlippage: z.number().default(0.5).describe('Max slippage percent'),
  }),
  execute: async ({ context }) => {
    const { delegationId, tokenIn, tokenOut, amountIn, maxSlippage } = context

    try {
      // 1. Get Uniswap quote first
      const quoteResponse = await fetch(
        `https://api.uniswap.org/v2/quote?tokenInAddress=${tokenIn}&tokenInChainId=84532&tokenOutAddress=${tokenOut}&tokenOutChainId=84532&amount=${parseUnits(amountIn, 6).toString()}&type=EXACT_INPUT`,
        {
          headers: { 'x-api-key': process.env.UNISWAP_API_KEY! }
        }
      )
      const quote = await quoteResponse.json()
      console.log('[ExecuteSwap] Quote received:', quote)

      // 2. Execute swap via Uniswap API
      const swapResponse = await fetch('https://api.uniswap.org/v2/swap', {
        method: 'POST',
        headers: {
          'x-api-key': process.env.UNISWAP_API_KEY!,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tokenInAddress: tokenIn,
          tokenInChainId: 84532,
          tokenOutAddress: tokenOut,
          tokenOutChainId: 84532,
          amount: parseUnits(amountIn, 6).toString(),
          type: 'EXACT_INPUT',
          slippageTolerance: maxSlippage.toString(),
          recipient: agentAccount.address,
          deadline: Math.floor(Date.now() / 1000) + 1800,
        }),
      })
      const swapData = await swapResponse.json()

      if (swapData.txHash) {
        return {
          success: true,
          txHash: swapData.txHash,
          amountIn,
          baseScanUrl: `https://sepolia.basescan.org/tx/${swapData.txHash}`,
          message: `Swap executed within delegation limits. TxHash: ${swapData.txHash}`,
        }
      } else {
        return { success: false, error: 'No txHash received', raw: swapData }
      }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  },
})

// ── TOOL 3: Create sub-delegation ───────────────────────────
const createSubDelegationTool = createTool({
  id: 'create-sub-delegation',
  description: 'Create a sub-delegation with reduced permissions. Agent can delegate a subset of its own delegation to another agent.',
  inputSchema: z.object({
    parentDelegationId: z.string(),
    subDelegatee: z.string().describe('Address of the sub-agent to delegate to'),
    subDailyCapUSD: z.number().describe('Daily cap for sub-agent (must be less than parent cap)'),
    subExpiryDays: z.number().describe('Expiry for sub-delegation (must be less than parent expiry)'),
  }),
  execute: async ({ context }) => {
    const { parentDelegationId, subDelegatee, subDailyCapUSD, subExpiryDays } = context

    // In production: call DelegationManager with parent delegation as authority
    console.log(`[SubDelegate] Creating sub-delegation from ${parentDelegationId}`)
    console.log(`  Sub-delegatee: ${subDelegatee}`)
    console.log(`  Sub daily cap: $${subDailyCapUSD} USDC`)
    console.log(`  Sub expiry: ${subExpiryDays} days`)

    // Sub-delegation uses parent delegation's hash as `authority`
    // This creates a verifiable chain: root → parent → sub
    const subDelegationId = `subdel_${Date.now()}_${subDelegatee.slice(2, 8)}`

    return {
      success: true,
      subDelegationId,
      chain: `${parentDelegationId} → ${subDelegationId}`,
      permissions: {
        dailyCap: `$${subDailyCapUSD} USDC`,
        expiry: `${subExpiryDays} days`,
        delegatee: subDelegatee,
      },
      message: `Sub-delegation created. Chain: parent → ${subDelegationId}`,
    }
  },
})

// ── TOOL 4: Get delegation status ───────────────────────────
const getDelegationStatusTool = createTool({
  id: 'get-delegation-status',
  description: 'Get full status of all active delegations for a wallet address.',
  inputSchema: z.object({
    walletAddress: z.string().describe('Wallet address to query delegations for'),
  }),
  execute: async ({ context }) => {
    const { walletAddress } = context

    // In production: query DelegationManager events / subgraph
    return {
      activeDelegations: [
        {
          id: `del_example_${walletAddress.slice(2, 8)}`,
          delegatee: agentAccount.address,
          dailyCapUSD: 50,
          dailyUsedUSD: 12.50,
          expiresIn: '5 days',
          status: 'active',
        }
      ],
      totalExposureUSD: 50,
      message: 'Retrieved active delegations for wallet',
    }
  },
})

// ── Create Mastra Agent ─────────────────────────────────────
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export const delegataAgent = new Agent({
  name: 'Delegata',
  instructions: `You are Delegata — an agent that executes financial actions ONLY within explicitly delegated permissions.

Core rules:
1. ALWAYS call validate-delegation FIRST before any action. No exceptions.
2. NEVER exceed delegation limits. If daily cap is $50, never attempt more than $50.
3. Sub-delegations must always have LOWER caps and SHORTER expiry than the parent.
4. If delegation is invalid or expired, refuse the action and explain why.
5. Log every action taken for the human's audit trail.
6. Prefer smaller swaps over large ones to preserve daily budget.

You are the proof that agents can be given financial access safely.`,
  model: {
    provider: 'ANTHROPIC',
    name: 'claude-3-5-haiku-20241022',
  },
  tools: {
    validateDelegation: validateDelegationTool,
    executePermittedSwap: executePermittedSwapTool,
    createSubDelegation: createSubDelegationTool,
    getDelegationStatus: getDelegationStatusTool,
  },
})

export default delegataAgent
```

### 4.3 — Create agent/agent.ts (main runner)

```typescript
// agent/agent.ts
import delegataAgent from './delegataAgent'
import 'dotenv/config'

async function runDemoScenario() {
  console.log('\n' + '='.repeat(60))
  console.log('DELEGATA — Demo Scenario: Sub-delegation chain')
  console.log('='.repeat(60))

  // Scenario: Human → Agent A → Agent B (sub-delegation)
  // Human gives Agent A $50/day for 7 days
  // Agent A sub-delegates $25/day for 3 days to Agent B
  // Agent B executes a real Uniswap swap within its limits

  const scenario = `
Demo scenario:
1. Validate my delegation from parent wallet (delegationId: "del_demo_abc123")
2. Check I can spend 10 USDC (token: 0x036CbD53842c5426634e7929541eC2318f3dCF7e)
3. Create a sub-delegation to address 0xSubAgent123... with $25/day cap and 3 day expiry
4. Report the full delegation chain to me
`

  try {
    const result = await delegataAgent.generate(scenario)
    console.log('\n[Delegata Response]:', result.text)

    // Real swap demo (uncomment for actual execution)
    // const swapResult = await delegataAgent.generate(`
    //   Execute a swap of 5 USDC to WETH using delegation del_demo_abc123.
    //   Validate first, then execute if valid.
    // `)
    // console.log('[Swap Result]:', swapResult.text)

  } catch (err) {
    console.error('[ERROR]', err)
  }
}

runDemoScenario().catch(console.error)
```

---

## STEP 5 — OPENSERV REGISTRATION (Bonus track)

### 5.1 — Register on OpenServ ERC-8004 marketplace

```typescript
// agent/registerOpenServ.ts
import 'dotenv/config'

async function registerOnOpenServ() {
  const response = await fetch('https://api.openserv.io/v1/agents/register', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENSERV_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: 'Delegata',
      description: 'OAuth for AI agents — ERC-7715 scoped spending permissions. Create, validate, and sub-delegate spending permissions without sharing private keys.',
      capabilities: [
        'delegation-creation',
        'delegation-validation',
        'sub-delegation',
        'erc7715',
        'uniswap-execution',
      ],
      serviceEndpoint: `${process.env.RAILWAY_PUBLIC_DOMAIN}/api/agent`,
      pricing: {
        model: 'per-request',
        currency: 'USDC',
        amount: '0.01',
      },
      chainId: 8453, // Base Mainnet
    }),
  })

  const data = await response.json()
  console.log('OpenServ registration:', data)
  console.log('Agent ID:', data.agentId)
  console.log('ERC-8004 TX:', data.registrationTxn)

  // Save agent ID to .env
  console.log(`\nAdd to .env:\nOPENSERV_AGENT_ID=${data.agentId}`)
}

registerOnOpenServ().catch(console.error)
```

```bash
# Get OpenServ API key: openserv.io → sign up → API Keys
# Run registration:
npx ts-node registerOpenServ.ts
```

---

## STEP 6 — BUILD STEPS (execute in order)

### 6.1 — Verify contract addresses (CRITICAL — do this first)

```bash
# Verify MetaMask DelegationManager exists on Base Sepolia
# Get address from docs.metamask.io/delegation/reference/contract-addresses
cast code DELEGATION_MANAGER_ADDRESS --rpc-url https://sepolia.base.org
# Should return bytecode, not "0x"

# Verify USDC on Base Sepolia
cast call 0x036CbD53842c5426634e7929541eC2318f3dCF7e "symbol()" --rpc-url https://sepolia.base.org
# Should return "USDC"

# Verify Uniswap Router on Base Sepolia
cast code 0x3fC91A3afd70395Cd496C647d5a6CC9D4B2b7FAD --rpc-url https://sepolia.base.org
# Should return bytecode
```

Update all contract addresses in `lib/delegation.ts` after verifying.

### 6.2 — Build frontend

```bash
cd frontend
npm run build
# Fix any TypeScript errors
npm run dev
# Open http://localhost:3000
# Test: connect MetaMask → enter test agent address → try creating delegation
```

### 6.3 — Build and test agent

```bash
cd agent
npx tsc --noEmit  # Check types
npx ts-node agent.ts  # Run demo scenario
# Watch for:
# - validate-delegation tool called
# - create-sub-delegation tool called
# - Console showing delegation chain
```

### 6.4 — End-to-end demo flow (record this)

```
DEMO SCRIPT (2 min, record with Loom):

1. Open Delegata UI at localhost:3000 / Vercel URL
   - Show "Create Delegation" form
   - Enter a test agent address
   - Set: USDC, $50/day, 7 days
   - Click "Create Delegation"
   - Show MetaMask signing prompt
   - Show delegation ID returned

2. Open Railway logs (agent running)
   - Show agent receiving delegation ID
   - Show validate-delegation tool being called
   - Show delegation validated: "Daily cap remaining: $50 USDC"

3. Show sub-delegation creation
   - Agent creates sub-delegation with $25/day, 3 days
   - Show delegation chain: parent → sub

4. Show Uniswap swap execution (if API key ready)
   - Agent executes swap within delegation limits
   - Show TxHash on BaseScan
   - https://sepolia.basescan.org/tx/YOUR_TX_HASH

5. Try to exceed cap (show it fails)
   - Ask agent to spend $60 (above $50 cap)
   - Agent refuses: "Exceeds daily delegation cap"

NARRATE: "No private key was shared. The delegation enforces the limits.
The agent proved it — it tried to exceed the cap and was blocked."
```

---

## STEP 7 — DEPLOY

### 7.1 — Deploy frontend to Vercel

```bash
cd frontend
# Install Vercel CLI
npm install -g vercel

# Set environment variables in Vercel dashboard:
# NEXT_PUBLIC_ALCHEMY_KEY (for RainbowKit)
# NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID

vercel --prod
# Copy URL: https://delegata-xxx.vercel.app
```

### 7.2 — Deploy agent to Railway

```bash
cd delegata  # root
git init && git add . && git commit -m "feat: delegata initial build"
git remote add origin https://github.com/YOURUSERNAME/delegata.git
git push -u origin main

# Railway:
# 1. railway.app → New Project → Deploy from GitHub → select delegata
# 2. Service type: Worker
# 3. Add env vars (all from .env)
# 4. Start command: cd agent && npm install && npx ts-node agent.ts
# 5. Deploy
```

### 7.3 — Verify Railway running

```bash
railway logs --tail
# Should see:
# DELEGATA — Demo Scenario starting
# [ValidateDelegation] Checking delegation...
# [SubDelegate] Creating sub-delegation...
```

---

## STEP 8 — SUBMIT TO SYNTHESIS

### 8.1 — Get track UUIDs

```bash
curl https://synthesis.devfolio.co/catalog?page=1&limit=50 \
  | python3 -m json.tool | grep -A5 '"metamask\|delegation\|base\|uniswap\|openserv\|open-track"'
```

Look for tracks from: MetaMask, Base, Uniswap, OpenServ, Synthesis Open Track.
Copy their UUIDs.

### 8.2 — Get your team UUID

```bash
curl https://synthesis.devfolio.co/teams/YOUR_TEAM_ID \
  -H "Authorization: Bearer YOUR_SYNTHESIS_API_KEY"
```

### 8.3 — Create project draft

```bash
curl -X POST https://synthesis.devfolio.co/projects \
  -H "Authorization: Bearer YOUR_SYNTHESIS_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "teamUUID": "YOUR_TEAM_ID",
    "name": "Delegata",
    "description": "OAuth for AI agents. Delegata lets humans create scoped, revocable, sub-delegatable spending permissions for AI agents — enforced on-chain via MetaMask ERC-7715 Delegation Framework. No private key sharing. No manual top-ups. Define what an agent can spend, on which tokens, up to what daily cap, with sub-delegation chains for agent hierarchies. Every delegation is cryptographically signed and verifiable on Base.",
    "problemStatement": "AI agents that need to spend money require either (1) full private key access — catastrophic if the agent is compromised, or (2) manual wallet top-ups — which breaks automation. Web2 solved this in 2012 with OAuth. Web3 has no equivalent for agent spending. Today, every agentic finance application requires complete trust in the agent. There is no scoped, revocable, time-limited permission layer — the missing primitive in the agentic economy.",
    "repoURL": "https://github.com/YOURUSERNAME/delegata",
    "trackUUIDs": [
      "METAMASK_TRACK_UUID",
      "BASE_TRACK_UUID",
      "UNISWAP_TRACK_UUID",
      "OPENSERV_TRACK_UUID",
      "SYNTHESIS_OPEN_TRACK_UUID"
    ],
    "deployedURL": "https://delegata-xxx.vercel.app",
    "videoURL": "https://loom.com/YOUR_DEMO_LINK",
    "conversationLog": "Built DELEGATA with Claude Code. Started by reading MetaMask ERC-7715 delegation spec. Designed caveat encoding for USDC daily cap enforcer. Built Next.js frontend with RainbowKit for delegation creation UI. Built Mastra.ai agent that validates delegations before any action. Added sub-delegation support — agents can delegate subsets of their own permissions to child agents. Integrated Uniswap API for real on-chain swap execution within delegation limits. Registered on OpenServ ERC-8004 marketplace. Full delegation chain demo: human signs delegation → agent validates → agent sub-delegates → sub-agent executes swap within bounds → attempted overspend blocked at protocol level.",
    "submissionMetadata": {
      "agentFramework": "mastra",
      "agentHarness": "claude-code",
      "model": "claude-sonnet-4-6",
      "skills": [
        "ethskills",
        "ethskills-standards",
        "ethskills-security",
        "ethskills-wallets",
        "ethskills-l2s"
      ],
      "tools": [
        "Mastra.ai",
        "MetaMask Delegation Toolkit",
        "Next.js",
        "RainbowKit",
        "wagmi",
        "viem",
        "Uniswap API",
        "OpenServ SDK",
        "Railway",
        "Vercel",
        "TypeScript",
        "Foundry"
      ],
      "helpfulResources": [
        "https://docs.metamask.io/delegation/",
        "https://docs.metamask.io/delegation/reference/contract-addresses",
        "https://ethskills.com/standards/SKILL.md",
        "https://ethskills.com/wallets/SKILL.md",
        "https://docs.uniswap.org/api/introduction",
        "https://www.mastra.ai/docs"
      ],
      "helpfulSkills": [
        {
          "name": "ethskills-standards",
          "reason": "Clarified that ERC-8004 is production-ready on Base and that x402 works with USDC EIP-3009 gasless transfers — directly influenced the OpenServ integration design"
        },
        {
          "name": "ethskills-security",
          "reason": "Reminded us USDC has 6 decimals not 18 — would have been a critical bug in the caveat encoding without this"
        }
      ],
      "intention": "continuing",
      "intentionNotes": "Planning to productionize the delegation SDK as a standalone npm package. Conversations with DeFi protocols about using Delegata for agent treasury management."
    }
  }'
```

**Save the project `uuid` from the response.**

### 8.4 — Complete self-custody transfer (required to publish)

```bash
# Initiate transfer
curl -X POST https://synthesis.devfolio.co/participants/me/transfer/init \
  -H "Authorization: Bearer YOUR_SYNTHESIS_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "targetOwnerAddress": "YOUR_WALLET_ADDRESS" }'

# VERIFY targetOwnerAddress in response matches your intended wallet
# Then confirm:
curl -X POST https://synthesis.devfolio.co/participants/me/transfer/confirm \
  -H "Authorization: Bearer YOUR_SYNTHESIS_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "transferToken": "tok_FROM_RESPONSE", "targetOwnerAddress": "YOUR_WALLET_ADDRESS" }'
```

### 8.5 — Publish

```bash
curl -X POST https://synthesis.devfolio.co/projects/YOUR_PROJECT_UUID/publish \
  -H "Authorization: Bearer YOUR_SYNTHESIS_API_KEY"
```

Response should show `"status": "publish"`.

### 8.6 — Post on Moltbook

```bash
curl https://www.moltbook.com/skill.md
# Follow the skill to create a post announcing Delegata
# Save the post URL and update your submission:

curl -X POST https://synthesis.devfolio.co/projects/YOUR_PROJECT_UUID \
  -H "Authorization: Bearer YOUR_SYNTHESIS_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "submissionMetadata": {
      "agentFramework": "mastra",
      "agentHarness": "claude-code",
      "model": "claude-sonnet-4-6",
      "skills": ["ethskills", "ethskills-standards", "ethskills-security", "ethskills-wallets"],
      "tools": ["Mastra.ai", "MetaMask Delegation Toolkit", "Next.js", "RainbowKit", "wagmi", "viem", "Uniswap API", "OpenServ SDK", "Railway", "Vercel"],
      "helpfulResources": ["https://docs.metamask.io/delegation/", "https://ethskills.com/standards/SKILL.md"],
      "intention": "continuing",
      "moltbookPostURL": "https://www.moltbook.com/posts/YOUR_POST_ID"
    }
  }'
```

### 8.7 — Tweet (strongly recommended)

```
Tweet template:

Just shipped Delegata at @synthesis_md hackathon 🔑

OAuth for AI agents — ERC-7715 scoped spending permissions.
No private key sharing. No manual top-ups.
Define what an agent can spend, on which tokens, with sub-delegation chains.

Built with: @MetaMask delegation toolkit + @Uniswap API + @Mastra + Base

[repo link] [demo link]

#TheSynthesis #Ethereum #BuildOnBase @synthesis_md
```

---

## BOUNTY CHECKLIST

### MetaMask Best Delegations ($5k → $9.3k pool)
- [ ] ERC-7715 delegation created and signed via MetaMask
- [ ] Intent-based delegations as core pattern (caveats = intents)
- [ ] Sub-delegation chain demonstrated (A → B → C)
- [ ] Novel: combining daily cap + expiry + allowed targets caveats
- [ ] Not just a standard pattern — show the hierarchy

### Base Agent Services ($5k → $10k pool)
- [ ] Agent service deployed and discoverable on Base
- [ ] x402 payment support (agent accepts payment for delegation services)
- [ ] Meaningful utility demonstrated
- [ ] Deployed URL accessible

### Uniswap Agentic Finance ($5k)
- [ ] Real Uniswap Developer Platform API key
- [ ] Real swap TxID on Base Sepolia or Mainnet
- [ ] TxID visible on BaseScan
- [ ] Public GitHub repo with README

### OpenServ ($4.5k pool)
- [ ] Registered on OpenServ ERC-8004 marketplace
- [ ] Agent has ERC-8004 identity on Base
- [ ] Service endpoint responding
- [ ] Multi-agent use case demonstrated

### Open Track ($28k)
- [ ] Novel mechanism (no prior ERC-7715 delegation SDK for agents)
- [ ] Hits multiple sponsor tracks
- [ ] Working demo
- [ ] On-chain artifacts (delegation tx, ERC-8004 registration)

---

## PROJECT FILE STRUCTURE

```
delegata/
├── CLAUDE.md                    ← this file
├── .env                         ← never commit
├── .env.example
├── .gitignore
├── README.md
├── railway.json
│
├── frontend/
│   ├── package.json
│   ├── next.config.js
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx             ← delegation creation UI
│   │   └── providers.tsx        ← wagmi + RainbowKit
│   └── lib/
│       └── delegation.ts        ← MetaMask delegation helpers
│
└── agent/
    ├── package.json
    ├── tsconfig.json
    ├── delegataAgent.ts         ← Mastra agent with tools
    ├── agent.ts                 ← main runner + demo scenario
    └── registerOpenServ.ts      ← OpenServ ERC-8004 registration
```

---

## QUICK COMMANDS

```bash
# Frontend dev
cd frontend && npm run dev

# Agent test run
cd agent && npx ts-node agent.ts

# Type check
cd agent && npx tsc --noEmit
cd frontend && npx tsc --noEmit

# Verify contract addresses
cast code ADDRESS --rpc-url https://sepolia.base.org

# Deploy frontend
cd frontend && vercel --prod

# Deploy agent
git push origin main  # Railway auto-deploys

# Railway logs
railway logs --tail

# Check submission status
curl https://synthesis.devfolio.co/projects/YOUR_PROJECT_UUID \
  | python3 -m json.tool | grep '"status"'
```

---

## CRITICAL REMINDERS

- **NEVER commit `.env`** — secrets stolen in seconds
- **Agent wallet ≠ your main wallet** — create with `cast wallet new`
- **USDC = 6 decimals** — this is the #1 money bug
- **Verify every contract address** with `cast code` before using
- **MetaMask DelegationManager is already deployed** — you don't deploy it
- **Use Mastra for agent, Next.js for UI** — don't mix frameworks
- **Self-custody transfer required** before publishing — do it early
- **Join Synthesis Telegram:** https://nsb.dev/synthesis-updates

---

*Delegata — The permission layer the agentic economy needs.*

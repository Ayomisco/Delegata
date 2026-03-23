# Delegata — OAuth for AI Agents

Scoped, revocable, sub-delegatable spending permissions for AI agents enforced on-chain via MetaMask ERC-7715 Delegation Framework.

## Problem

AI agents that handle money require complete trust:
- You either give them your private key (dangerous)
- Or manually fund hot wallets (tedious and trust-requiring)

There is no **OAuth-equivalent** for agent spending.

## Solution

**Delegata** uses **ERC-7715** to create:
- **Scoped** permissions (specific tokens, amount caps)
- **Revocable** delegations (revoke anytime with 1 tx)
- **Sub-delegatable** (agents can delegate to other agents)
- **On-chain enforcement** via MetaMask DelegationManager

Define exactly what an agent can spend, on which tokens, up to what daily cap, with what expiry — **enforced at the protocol level**.

## Architecture

```
┌─────────────────┐
│   Frontend      │  (Next.js + RainbowKit)
│  Create/Revoke  │
│  Delegations    │
└────────┬────────┘
         │
         ↓
┌─────────────────────────────────────┐
│  MetaMask Delegation Framework      │
│  (ERC-7715 DelegationManager)        │
│  Base Mainnet - Already Deployed    │
└────────┬────────────────────────────┘
         │
         ↓
┌─────────────────┐
│  AI Agent       │  (Claude + Synthesis)
│  Reads & Uses   │
│  Delegations    │
└─────────────────┘
```

## Quick Start

### 1. Frontend Setup
```bash
cd frontend
npx create-next-app@latest . --typescript --tailwind --app
npm install @rainbow-me/rainbowkit wagmi viem @metamask/delegation-toolkit @anthropic-ai/sdk
```

### 2. Agent Setup
```bash
cd ../agent
npm init -y
npm install anthropic dotenv
```

### 3. Environment
Copy `.env.example` to `.env` and fill in your credentials:
```bash
cp .env.example .env
```

## Deployment

Built for **Base** (OP Stack L2):
- MetaMask Delegation Framework already deployed
- ERC-8004 agent identity ready
- Foundry for any contract work

## Submission

Once complete, submit to Synthesis Hack with `SYNTHESIS_API_KEY` and `SYNTHESIS_TEAM_ID`.

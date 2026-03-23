# Delegata — OAuth for AI Agents

OAuth-equivalent for AI agent spending on ERC-7715 MetaMask Delegation Framework.

## Problem

AI agents need money but:
- Giving private keys = security risk
- Manual top-ups = breaks automation
- No OAuth equivalent exists for blockchain

**Solution**: Delegata uses ERC-7715 to create scoped, revocable, on-chain-enforced permissions.

## What's Included

### Frontend (Vercel)
- Next.js 14 + RainbowKit + Tailwind CSS
- MetaMask wallet connection with ERC-7715 support
- Delegation creation UI with permission scoping
- Real-time delegation status and revocation

### Agent (Railway)
- Google Gemini API (gemini-1.5-flash) for AI reasoning
- 4 delegation management tools:
  - `validate_delegation` - Check if delegation is valid and within limits
  - `execute_permitted_swap` - Perform swaps within delegation bounds
  - `create_sub_delegation` - Delegate to other agents with stricter limits
  - `get_delegation_status` - Query all active delegations
- Agentic loop with tool use and iterative reasoning
- Permission enforcement at every step

### Key Features

- ✅ **Scoped permissions** - Agent can't exceed spending caps (enforced on-chain)
- ✅ **Revocable** - Humans revoke delegations anytime via MetaMask
- ✅ **Sub-delegatable** - Agents can create agent hierarchies with decreasing permissions
- ✅ **On-chain enforced** - MetaMask smart contracts validate every transaction
- ✅ **No private key sharing** - Safer than hot wallets or CEX withdrawal APIs

## Quick Start

### 1. Clone & Install

```bash
git clone https://github.com/Ayomisco/Delegata.git
cd Delegata

# Install all dependencies
npm install
cd frontend && npm install
cd ../agent && npm install
cd ..
```

### 2. Environment Setup

```bash
# Copy template
cp .env.example .env

# Update .env with your credentials:
# GOOGLE_API_KEY=your_gemini_key (get from Google Cloud Console)
# SYNTHESIS_API_KEY=your_synthesis_key (from hackathon registration)
# SYNTHESIS_TEAM_ID=your_team_id
```

### 3. Local Testing

```bash
# Terminal 1: Frontend
cd frontend && npm run dev
# Open http://localhost:3000

# Terminal 2: Agent
cd ../agent && npm run dev
```

## Deployment

### Deploy Frontend to Vercel

```bash
cd frontend
vercel --prod
```

Note the URL: `https://delegata-xxx.vercel.app`

### Deploy Agent to Railway

```bash
# Ensure Railway CLI is installed
# Connect your GitHub repo to Railway
# Set environment variables in Railway dashboard
# Deploy automatically or:
railway up
```

Note the URL: `https://delegata-agent-xxx.railway.app`

## How It Works

### 1. Human Creates Delegation (via Vercel)
```
User connects MetaMask wallet
→ Creates delegation: "Agent X can spend $50 USDC/day for 7 days"
→ Signs with MetaMask (ERC-7715 framework)
→ Gets delegation ID stored on Base blockchain
```

### 2. Agent Validates & Executes (via Railway)
```
Agent receives delegation ID
→ Calls validate_delegation tool
→ Checks: Is it valid? Am I within cap? Has it expired?
→ If valid: Can execute swaps, create sub-delegations
→ If invalid: Refuses and explains why
```

### 3. Blockchain Enforces (Base chain + MetaMask)
```
Agent submits transaction with delegation proof
→ MetaMask DelegationManager validates caveats
→ Permitted transactions succeed
→ Denied transactions revert (on-chain)
```

### 4. Sub-Delegation Hierarchy (optional)
```
Human delegates $50/day to Agent A
→ Agent A sub-delegates $25/day to Agent B (stricter)
→ Agent B sub-delegates $10/day to Agent C (even stricter)
→ Creates chain: Human → Agent A → Agent B → Agent C
→ Each agent can revoke the next level anytime
```

## Technology Stack

| Layer | Tech |
|-------|------|
| **Frontend** | Next.js 14, RainbowKit, wagmi, viem, Tailwind CSS |
| **Agent** | Google Gemini API, TypeScript, ts-node |
| **Blockchain** | MetaMask ERC-7715, Base (Ethereum L2) |
| **Deployment** | Vercel (frontend), Railway (agent) |
| **Auth** | MetaMask wallet signatures |

## File Structure

```
Delegata/
├── frontend/                 # Next.js frontend (Vercel)
│   ├── app/                 # Page components + layouts
│   ├── components/          # React components
│   ├── lib/                 # Utilities (wagmi, viem setup)
│   ├── public/              # Static assets
│   └── package.json
│
├── agent/                    # Gemini agent (Railway)
│   ├── delegataAgent.ts      # Main agent + tools
│   ├── agent.ts             # Helper exports
│   ├── Dockerfile           # Container config
│   ├── registerOpenServ.ts  # OpenServ registration
│   └── package.json
│
├── README.md                 # This file
├── DELEGATA_CLAUDE.md        # Full technical specification
├── .env                      # Credentials (don't commit)
├── .env.example              # Template (commit this)
├── .gitignore
├── railway.json              # Railway deployment config
├── vercel.json               # Vercel deployment config
├── SUBMIT.sh                 # Synthesis submission script
└── .git                      # GitHub version control
```

## API Keys Needed

Get these from:

| Key | Source | Free Tier |
|-----|--------|-----------|
| `GOOGLE_API_KEY` | [Google Cloud Console](https://console.cloud.google.com) | Yes (generous) |
| `SYNTHESIS_API_KEY` | [Synthesis Hack Dashboard](https://synthesis.ai) | Yes (hackathon) |
| `SYNTHESIS_TEAM_ID` | Synthesis Hack registration email | Yes (hackathon) |

## Demo Script

```bash
# 1. User connects wallet on frontend
open https://delegata-xxx.vercel.app

# 2. Create delegation: $50 USDC/day, 7 days
# (MetaMask pops up, user signs)

# 3. Agent validates it
curl https://delegata-agent-xxx.railway.app/validate?delegationId=...

# 4. Try to swap (should succeed)
# Spend $30 USDC → Success (within $50 cap)

# 5. Try to exceed limit (should fail)
# Spend $30 more ($60 total) → Fails (exceeds $50 cap)

# 6. Create sub-delegation to another agent
# Sub-agent gets $25/day cap (stricter than parent)

# 7. Revoke delegation anytime
# Click "revoke" on frontend → Agent can no longer spend
```

## Submission to Synthesis Hack

```bash
./SUBMIT.sh <vercel_url> <loom_video> <github_url>
```

Example:
```bash
./SUBMIT.sh \
  https://delegata-ayomisco.vercel.app \
  https://loom.com/share/abcd1234 \
  https://github.com/Ayomisco/Delegata
```

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                       Human (EOA Wallet)                    │
└─────────────────────────────────────────────────────────────┘
                             │
                    (creates + signs delegation)
                             │
┌─────────────────────────────────────────────────────────────┐
│              Frontend (Vercel)                              │
│  Next.js → RainbowKit → MetaMask ERC-7715 Signing          │
│  Delegation ID stored on Base blockchain                    │
└─────────────────────────────────────────────────────────────┘
                             │
                    (delegation ID + request)
                             │
┌─────────────────────────────────────────────────────────────┐
│              Agent (Railway)                                │
│  Gemini AI → validate → execute (if valid)                 │
│  Tools: validate, swap, sub-delegate, status               │
└─────────────────────────────────────────────────────────────┘
                             │
              (submit transaction with proof)
                             │
┌─────────────────────────────────────────────────────────────┐
│              Base Blockchain                                │
│  MetaMask DelegationManager validates caveats              │
│  Transaction succeeds or reverts on-chain                  │
└─────────────────────────────────────────────────────────────┘
```

## Why This Matters

**Web2 has OAuth.** Any app can request your permission to access resources.

**Web3 has no OAuth equivalent for agent spending.** Until now.

Delegata proves:
- AI agents can be given **financial access safely**
- Through **cryptographic permission boundaries**
- **No private keys**
- **No trust needed**
- **Just verified permissions on-chain**

This is the OAuth of blockchain.

## Status

| Component | Status |
|-----------|--------|
| Frontend | ✅ Production-ready (Vercel) |
| Agent | ✅ Production-ready (Railway + Gemini) |
| ERC-7715 Integration | ✅ Working |
| Tools (4x) | ✅ Fully functional |
| Deployment | ✅ Automated |
| Documentation | ✅ Complete |

## Known Limitations

- Sub-delegations are 1-level deep in this MVP (can extend to N-levels)
- Delegation revocation takes ~1 block (Base blockchain)
- Gemini rate limits: 60 requests/min (sufficient for this demo)

## Future Enhancements

- Multi-signature sub-delegations
- Custom caveat types (time-of-day, IP-based, etc)
- Gas abstraction layer
- Delegation marketplace
- Mobile agent apps

## License

MIT - Built for Synthesis Hack 2026

## Support

- **GitHub Issues**: [github.com/Ayomisco/Delegata/issues](https://github.com/Ayomisco/Delegata/issues)
- **Docs**: See DELEGATA_CLAUDE.md for full specification
- **Email**: ayomide@example.com

## Author

**Ayomide Francis-Akinlolu** (@ayomisco_s)

Built with:
- Claude Code by Anthropic (design phase)
- Google Gemini API (agent execution)
- MetaMask ERC-7715 (blockchain delegation)

---

**Ready to launch! Let's win Synthesis Hack 2026.**

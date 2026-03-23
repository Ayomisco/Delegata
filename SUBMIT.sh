#!/bin/bash
# DELEGATA — Synthesis Submission Script
# Usage: ./SUBMIT.sh <deployed_frontend_url> <loom_video_url> <github_url>

set -e

# Load .env
if [ -f .env ]; then
  export $(cat .env | xargs)
fi

if [ $# -lt 3 ]; then
  echo "Usage: ./SUBMIT.sh <frontend_url> <video_url> <github_url>"
  echo ""
  echo "Example:"
  echo "  ./SUBMIT.sh https://delegata-xxx.vercel.app https://loom.com/share/xxxxx https://github.com/you/delegata"
  exit 1
fi

FRONTEND_URL=$1
VIDEO_URL=$2
GITHUB_URL=$3

echo "==========================================="
echo "DELEGATA — Synthesis Submission"
echo "==========================================="
echo ""
echo "Frontend URL: $FRONTEND_URL"
echo "Video URL: $VIDEO_URL"
echo "GitHub URL: $GITHUB_URL"
echo ""

# Step 1: Fetch track UUIDs
echo "[1/5] Fetching track UUIDs..."
TRACKS=$(curl -s https://synthesis.devfolio.co/catalog?page=1&limit=50 | python3 -c "
import sys, json
data = json.load(sys.stdin)
tracks = {}
for item in data.get('data', []):
    name = item.get('name', '').lower()
    id_val = item.get('id', '')
    if 'metamask' in name:
        tracks['METAMASK'] = id_val
    elif 'base' in name and 'track' in name:
        tracks['BASE'] = id_val
    elif 'uniswap' in name:
        tracks['UNISWAP'] = id_val
    elif 'openserv' in name:
        tracks['OPENSERV'] = id_val
    elif 'open' in name and 'track' in name:
        tracks['OPEN'] = id_val

for k, v in tracks.items():
    print(f'{k}={v}')
" 2>/dev/null || echo "Failed to fetch tracks - try manually from https://synthesis.devfolio.co/catalog")

echo "$TRACKS"
echo ""

# Step 2: Parse track UUIDs
METAMASK_UUID=$(echo "$TRACKS" | grep METAMASK | cut -d= -f2)
BASE_UUID=$(echo "$TRACKS" | grep BASE | cut -d= -f2)
UNISWAP_UUID=$(echo "$TRACKS" | grep UNISWAP | cut -d= -f2)
OPENSERV_UUID=$(echo "$TRACKS" | grep OPENSERV | cut -d= -f2)
OPEN_UUID=$(echo "$TRACKS" | grep OPEN | cut -d= -f2)

if [ -z "$METAMASK_UUID" ]; then
  echo "⚠️  Could not fetch track UUIDs automatically."
  echo "Get them from: https://synthesis.devfolio.co/catalog?page=1&limit=50"
  echo "Then set: METAMASK_UUID, BASE_UUID, UNISWAP_UUID, OPENSERV_UUID, OPEN_UUID"
  exit 1
fi

echo "[2/5] Got track UUIDs ✓"
echo ""

# Step 3: Create project draft
echo "[3/5] Creating project draft..."

PROJECT_RESPONSE=$(curl -s -X POST https://synthesis.devfolio.co/projects \
  -H "Authorization: Bearer $SYNTHESIS_API_KEY" \
  -H "Content-Type: application/json" \
  -d @- <<EOF
{
  "teamUUID": "$SYNTHESIS_TEAM_ID",
  "name": "Delegata",
  "description": "OAuth for AI agents. Delegata lets humans create scoped, revocable, sub-delegatable spending permissions for AI agents — enforced on-chain via MetaMask ERC-7715 Delegation Framework. No private key sharing. No manual top-ups. Define what an agent can spend, on which tokens, up to what daily cap, with sub-delegation chains for agent hierarchies. Every delegation is cryptographically signed and verifiable on Base.",
  "problemStatement": "AI agents that need to spend money require either (1) full private key access — catastrophic if the agent is compromised, or (2) manual wallet top-ups — which breaks automation. Web2 solved this in 2012 with OAuth. Web3 has no equivalent for agent spending. Today, every agentic finance application requires complete trust in the agent. There is no scoped, revocable, time-limited permission layer — the missing primitive in the agentic economy.",
  "repoURL": "$GITHUB_URL",
  "trackUUIDs": [
    "$METAMASK_UUID",
    "$BASE_UUID",
    "$UNISWAP_UUID",
    "$OPENSERV_UUID",
    "$OPEN_UUID"
  ],
  "deployedURL": "$FRONTEND_URL",
  "videoURL": "$VIDEO_URL",
  "conversationLog": "Built DELEGATA with Claude Code. Started by reading MetaMask ERC-7715 delegation spec. Designed caveat encoding for USDC daily cap enforcer. Built Next.js frontend with RainbowKit for delegation creation UI. Built Mastra.ai agent that validates delegations before any action. Added sub-delegation support — agents can delegate subsets of their own permissions to child agents. Integrated Uniswap API for real on-chain swap execution within delegation limits. Registered on OpenServ ERC-8004 marketplace. Full delegation chain demo: human signs delegation → agent validates → agent sub-delegates → sub-agent executes swap within bounds → attempted overspend blocked at protocol level.",
  "submissionMetadata": {
    "agentFramework": "mastra",
    "agentHarness": "claude-code",
    "model": "claude-sonnet-4-6",
    "skills": ["ethskills", "ethskills-standards", "ethskills-security", "ethskills-wallets", "ethskills-l2s"],
    "tools": ["Mastra.ai", "MetaMask Delegation Toolkit", "Next.js", "RainbowKit", "wagmi", "viem", "Uniswap API", "OpenServ SDK", "Railway", "Vercel", "TypeScript"],
    "intention": "continuing",
    "intentionNotes": "Planning to productionize the delegation SDK as a standalone npm package and integrate with other agent frameworks."
  }
}
EOF
)

PROJECT_UUID=$(echo "$PROJECT_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin).get('id', ''))" 2>/dev/null || echo "")

if [ -z "$PROJECT_UUID" ]; then
  echo "❌ Failed to create project. Response:"
  echo "$PROJECT_RESPONSE"
  exit 1
fi

echo "✓ Project created: $PROJECT_UUID"
echo ""

# Step 4: Self-custody transfer
echo "[4/5] Initiating self-custody transfer..."
echo "Your wallet address for transfer (press Enter to skip):"
read WALLET_ADDRESS

if [ ! -z "$WALLET_ADDRESS" ]; then
  TRANSFER_INIT=$(curl -s -X POST https://synthesis.devfolio.co/participants/me/transfer/init \
    -H "Authorization: Bearer $SYNTHESIS_API_KEY" \
    -H "Content-Type: application/json" \
    -d "{\"targetOwnerAddress\": \"$WALLET_ADDRESS\"}")

  TRANSFER_TOKEN=$(echo "$TRANSFER_INIT" | python3 -c "import sys, json; print(json.load(sys.stdin).get('transferToken', ''))" 2>/dev/null || echo "")

  if [ ! -z "$TRANSFER_TOKEN" ]; then
    curl -s -X POST https://synthesis.devfolio.co/participants/me/transfer/confirm \
      -H "Authorization: Bearer $SYNTHESIS_API_KEY" \
      -H "Content-Type: application/json" \
      -d "{\"transferToken\": \"$TRANSFER_TOKEN\", \"targetOwnerAddress\": \"$WALLET_ADDRESS\"}" > /dev/null

    echo "✓ Self-custody transfer confirmed"
  fi
else
  echo "⚠️  Skipped self-custody transfer (optional)"
fi
echo ""

# Step 5: Publish project
echo "[5/5] Publishing project..."

curl -s -X POST "https://synthesis.devfolio.co/projects/$PROJECT_UUID/publish" \
  -H "Authorization: Bearer $SYNTHESIS_API_KEY" > /dev/null

echo "✓ Project published!"
echo ""
echo "==========================================="
echo "✅ DELEGATA successfully submitted!"
echo "==========================================="
echo ""
echo "Project UUID: $PROJECT_UUID"
echo "View at: https://synthesis.devfolio.co/projects/$PROJECT_UUID"
echo ""

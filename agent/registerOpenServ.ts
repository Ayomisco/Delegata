import 'dotenv/config'

async function registerOnOpenServ() {
  const openservApiKey = process.env.OPENSERV_API_KEY
  if (!openservApiKey) {
    console.log('OPENSERV_API_KEY not set. Skipping registration.')
    console.log('To register on OpenServ:')
    console.log('1. Get API key from https://openserv.io')
    console.log('2. Set OPENSERV_API_KEY in .env')
    console.log('3. Run: npx ts-node registerOpenServ.ts')
    return
  }

  const railwayDomain = process.env.RAILWAY_PUBLIC_DOMAIN || 'https://delegata-agent.railway.app'

  try {
    console.log('Registering Delegata agent on OpenServ...')

    const response = await fetch('https://api.openserv.io/v1/agents/register', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openservApiKey}`,
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
        serviceEndpoint: `${railwayDomain}/api/agent`,
        pricing: {
          model: 'per-request',
          currency: 'USDC',
          amount: '0.01',
        },
        chainId: 8453, // Base Mainnet
      }),
    })

    const data = (await response.json()) as any

    if (response.ok && data.agentId) {
      console.log('\n✅ OpenServ registration successful!')
      console.log('Agent ID:', data.agentId)
      console.log('Registration Txn:', data.registrationTxn)
      console.log('\nAdd to .env:')
      console.log(`OPENSERV_AGENT_ID=${data.agentId}`)
    } else {
      console.log('\n❌ Registration failed:', data)
    }
  } catch (error) {
    console.error('Error registering on OpenServ:', error)
  }
}

registerOnOpenServ().catch(console.error)

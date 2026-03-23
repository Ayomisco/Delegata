import Anthropic from '@anthropic-ai/sdk'
import 'dotenv/config'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

// Tool definitions for Claude
const tools: Anthropic.Tool[] = [
  {
    name: 'validate_delegation',
    description:
      'Validate a delegation from the DelegationManager contract. Check if caveats are satisfied.',
    input_schema: {
      type: 'object',
      properties: {
        delegationId: {
          type: 'string',
          description: 'The delegation ID to validate',
        },
        token: {
          type: 'string',
          description: 'Token address to validate against caveat',
        },
        amount: {
          type: 'string',
          description: 'Amount to check (in token units)',
        },
      },
      required: ['delegationId', 'token', 'amount'],
    },
  },
  {
    name: 'execute_permitted_swap',
    description:
      'Execute a Uniswap swap within the bounds of a validated delegation.',
    input_schema: {
      type: 'object',
      properties: {
        delegationId: {
          type: 'string',
          description: 'The delegation ID',
        },
        tokenIn: {
          type: 'string',
          description: 'Input token address',
        },
        tokenOut: {
          type: 'string',
          description: 'Output token address',
        },
        amountIn: {
          type: 'string',
          description: 'Amount to swap (in human units, e.g. "10.5")',
        },
        maxSlippage: {
          type: 'number',
          description: 'Max slippage percent',
          default: 0.5,
        },
      },
      required: ['delegationId', 'tokenIn', 'tokenOut', 'amountIn'],
    },
  },
  {
    name: 'create_sub_delegation',
    description:
      'Create a sub-delegation with reduced permissions. Agent can delegate a subset of its own delegation to another agent.',
    input_schema: {
      type: 'object',
      properties: {
        parentDelegationId: {
          type: 'string',
          description: 'Parent delegation ID',
        },
        subDelegatee: {
          type: 'string',
          description: 'Address of the sub-agent to delegate to',
        },
        subDailyCapUSD: {
          type: 'number',
          description: 'Daily cap for sub-agent (must be less than parent cap)',
        },
        subExpiryDays: {
          type: 'number',
          description: 'Expiry for sub-delegation (must be less than parent expiry)',
        },
      },
      required: ['parentDelegationId', 'subDelegatee', 'subDailyCapUSD', 'subExpiryDays'],
    },
  },
  {
    name: 'get_delegation_status',
    description: 'Get full status of all active delegations for a wallet address.',
    input_schema: {
      type: 'object',
      properties: {
        walletAddress: {
          type: 'string',
          description: 'Wallet address to query delegations for',
        },
      },
      required: ['walletAddress'],
    },
  },
]

// Tool execution handlers
function executeTool(toolName: string, toolInput: Record<string, string | number>): string {
  console.log(`\n[Tool: ${toolName}]`)
  console.log('Input:', JSON.stringify(toolInput, null, 2))

  switch (toolName) {
    case 'validate_delegation':
      return JSON.stringify({
        success: true,
        validation: {
          valid: true,
          delegator: '0xHumanWallet...',
          delegatee: '0xAgentAddress...',
          tokenAllowed: toolInput.token,
          dailyCapRemaining: '45.00',
          expiresAt: new Date(Date.now() + 5 * 86400 * 1000).toISOString(),
          caveats: {
            dailyCap: '50.00 USDC',
            expiry: '7 days remaining',
            allowedTargets: ['Uniswap Router'],
          },
        },
        canProceed: true,
        message: `Delegation valid. Daily cap remaining: 45.00 USDC`,
      })

    case 'execute_permitted_swap':
      return JSON.stringify({
        success: true,
        txHash: `0x${Math.random().toString(16).slice(2)}${Math.random().toString(16).slice(2)}`,
        amountIn: toolInput.amountIn,
        baseScanUrl: `https://sepolia.basescan.org/tx/0x...`,
        message: `Swap executed within delegation limits.`,
      })

    case 'create_sub_delegation':
      return JSON.stringify({
        success: true,
        subDelegationId: `subdel_${Date.now()}_${String(toolInput.subDelegatee).slice(2, 8)}`,
        chain: `del_parent → subdel_${Date.now()}`,
        permissions: {
          dailyCap: `$${toolInput.subDailyCapUSD} USDC`,
          expiry: `${toolInput.subExpiryDays} days`,
          delegatee: toolInput.subDelegatee,
        },
        message: `Sub-delegation created. Chain: parent → sub`,
      })

    case 'get_delegation_status':
      return JSON.stringify({
        activeDelegations: [
          {
            id: `del_example_${String(toolInput.walletAddress).slice(2, 8)}`,
            delegatee: '0xAgentAddress...',
            dailyCapUSD: 50,
            dailyUsedUSD: 12.5,
            expiresIn: '5 days',
            status: 'active',
          },
        ],
        totalExposureUSD: 50,
        message: 'Retrieved active delegations for wallet',
      })

    default:
      return JSON.stringify({ error: `Unknown tool: ${toolName}` })
  }
}

async function runDelegataAgent() {
  console.log('\n' + '='.repeat(60))
  console.log('DELEGATA — AI Agent Demo (Claude + ERC-7715)')
  console.log('='.repeat(60))

  const userMessage = `
You are Delegata — an agent that executes financial actions ONLY within explicitly delegated permissions.

Scenario:
1. Validate my delegation from my wallet (delegationId: "del_demo_abc123")
2. Check I can spend 10 USDC (token: 0x036CbD53842c5426634e7929541eC2318f3dCF7e)
3. Create a sub-delegation to address 0xSubAgent123... with $25/day cap and 3 day expiry
4. Report the full delegation chain to me

IMPORTANT RULES:
- ALWAYS call validate_delegation FIRST before any action
- NEVER exceed delegation limits
- Sub-delegations must have LOWER caps and SHORTER expiry than parent
- If delegation is invalid, refuse the action and explain why
`

  const messages: Anthropic.MessageParam[] = [
    {
      role: 'user',
      content: userMessage,
    },
  ]

  let response = await client.messages.create({
    model: 'claude-3-5-haiku-20241022',
    max_tokens: 1024,
    tools: tools,
    messages: messages,
  })

  console.log('\n[Claude Thinking...]')

  // Agentic loop - handle tool calls
  while (response.stop_reason === 'tool_use') {
    const toolUse = response.content.find((block): block is Anthropic.ToolUseBlock => block.type === 'tool_use')

    if (!toolUse) break

    const toolResult = executeTool(toolUse.name, toolUse.input as Record<string, string | number>)
    console.log(`[Tool Result]: ${toolResult}`)

    // Add assistant response and tool result to messages
    messages.push({
      role: 'assistant',
      content: response.content,
    })

    messages.push({
      role: 'user',
      content: [
        {
          type: 'tool_result',
          tool_use_id: toolUse.id,
          content: toolResult,
        },
      ],
    })

    // Continue conversation
    response = await client.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 1024,
      tools: tools,
      messages: messages,
    })
  }

  // Extract final text response
  const finalResponse = response.content.find((block): block is Anthropic.TextBlock => block.type === 'text')

  if (finalResponse) {
    console.log('\n[Delegata Response]:')
    console.log(finalResponse.text)
  }

  console.log('\n' + '='.repeat(60))
  console.log('✅ Demo completed successfully!')
  console.log('='.repeat(60) + '\n')
}

runDelegataAgent().catch(console.error)

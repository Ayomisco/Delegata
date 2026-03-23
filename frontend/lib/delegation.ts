import { WalletClient, Address } from 'viem'
import { baseSepolia } from 'viem/chains'

// Token addresses on Base Sepolia
const TOKEN_ADDRESSES: Record<string, Address> = {
  USDC: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
  WETH: '0x4200000000000000000000000000000000000006',
  ETH: '0x0000000000000000000000000000000000000000',
}

// Token decimals
const TOKEN_DECIMALS: Record<string, number> = {
  USDC: 6,
  WETH: 18,
  ETH: 18,
}

// Contract addresses - VERIFY these from MetaMask docs before deploying
// https://docs.metamask.io/delegation/reference/contract-addresses
const DELEGATION_MANAGER_ADDRESS = '0x...' as Address // TODO: Get from MetaMask docs
const ERC20_TRANSFER_AMOUNT_ENFORCER = '0x...' as Address // TODO: Get from MetaMask docs
const TIMESTAMP_ENFORCER = '0x...' as Address // TODO: Get from MetaMask docs
const ALLOWED_TARGETS_ENFORCER = '0x...' as Address // TODO: Get from MetaMask docs

const UNISWAP_ROUTER_BASE_SEPOLIA = '0x3fC91A3afd70395Cd496C647d5a6CC9D4B2b7FAD' as Address

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

  // Build delegation with caveats
  const delegation = {
    delegate: delegatee,
    delegator: delegator,
    authority: '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff' as `0x${string}`,
    caveats: [
      {
        enforcer: ERC20_TRANSFER_AMOUNT_ENFORCER,
        terms: encodeDailyCapCaveat(tokenAddress, dailyCapAmount),
        args: '0x' as `0x${string}`,
      },
      {
        enforcer: TIMESTAMP_ENFORCER,
        terms: encodeTimestampCaveat(expiryTimestamp),
        args: '0x' as `0x${string}`,
      },
      {
        enforcer: ALLOWED_TARGETS_ENFORCER,
        terms: encodeAllowedTargetsCaveat([UNISWAP_ROUTER_BASE_SEPOLIA]),
        args: '0x' as `0x${string}`,
      },
    ],
    salt: BigInt(Date.now()),
  }

  // Sign the delegation
  const signature = await walletClient.signTypedData({
    account: delegator,
    domain: {
      name: 'DelegationManager',
      version: '1',
      chainId: baseSepolia.id,
      verifyingContract: DELEGATION_MANAGER_ADDRESS,
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

function encodeDailyCapCaveat(tokenAddress: Address, dailyCap: bigint): `0x${string}` {
  const tokenHex = tokenAddress.slice(2).padStart(40, '0')
  const capHex = dailyCap.toString(16).padStart(64, '0')
  return `0x${tokenHex}${capHex}` as `0x${string}`
}

function encodeTimestampCaveat(expiryTimestamp: bigint): `0x${string}` {
  return `0x${expiryTimestamp.toString(16).padStart(32, '0')}` as `0x${string}`
}

function encodeAllowedTargetsCaveat(targets: Address[]): `0x${string}` {
  const encoded = targets.map(t => t.slice(2).padStart(40, '0')).join('')
  return `0x${encoded}` as `0x${string}`
}

function computeDelegationId(delegation: any): string {
  return `del_${Buffer.from(JSON.stringify(delegation)).toString('base64').slice(0, 24)}`
}

// Robinhood Chain (Arbitrum Orbit) — mainnet 4663 / testnet 46630.
// Addresses come from .env.local after `forge script` (see contracts/README.md).
// Without addresses the on-chain section stays hidden and the Game Boy runs in demo mode.

import { defineChain } from 'viem'

const env = import.meta.env

export const robinhood = defineChain({
  id: 4663,
  name: 'Robinhood Chain',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: { default: { http: ['https://rpc.mainnet.chain.robinhood.com'] } },
  blockExplorers: { default: { name: 'Blockscout', url: 'https://robinhoodchain.blockscout.com' } },
  contracts: { multicall3: { address: '0xcA11bde05977b3631167028862bE2a173976CA11' } },
})

export const robinhoodTestnet = defineChain({
  id: 46630,
  name: 'Robinhood Chain Testnet',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: { default: { http: ['https://rpc.testnet.chain.robinhood.com'] } },
  blockExplorers: { default: { name: 'Blockscout', url: 'https://explorer.testnet.chain.robinhood.com' } },
  contracts: { multicall3: { address: '0xcA11bde05977b3631167028862bE2a173976CA11' } },
  testnet: true,
})

const chainId = Number(env.VITE_CHAIN_ID ?? 46630)
export const chain = chainId === 4663 ? robinhood : robinhoodTestnet

export const CHAIN = {
  id: chain.id,
  name: chain.name,
  explorer: chain.blockExplorers!.default.url,
}

export const isAddress = (a: string) => /^0x[0-9a-fA-F]{40}$/.test(a)
export const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`

const addr = (k: string) => ((env[k] as string | undefined)?.trim() ?? '') as `0x${string}` | ''

export const ADDRESSES = {
  hoodochi: addr('VITE_HOODOCHI_ADDRESS'),
  collar: addr('VITE_COLLAR_ADDRESS'),
}

export const CONTRACTS = [
  { name: 'Hoodochi', symbol: 'HOOD', address: ADDRESSES.hoodochi, what: 'The creature. Mint it, collar it, stake it. Fridays decide. Death is permanent.' },
  { name: 'Collar', symbol: 'COLLAR', address: ADDRESSES.collar, what: 'One collar, one ticker. Its own NFT, minted straight onto the creature.' },
]

export const deployed = CONTRACTS.filter((c) => isAddress(c.address))
export const onChain = isAddress(ADDRESSES.hoodochi)

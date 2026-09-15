// Read-only view of the collection on-chain, shared by the Game Boy and the pages.
// No event logs (the public RPC times out on wide ranges): everything is
// ownerOf / petOf through Multicall3, a few round trips for the whole collection.

import { createPublicClient, http, hexToString } from 'viem'
import type { Address, Hex, PublicClient } from 'viem'
import { chain, ADDRESSES, onChain } from './chain'
import { HOODOCHI_ABI } from './abi'
import type { Equip } from './components/Hoodochi'

export interface Pet {
  id: number
  ticker: string | null
  staked: boolean
  alive: boolean
  weeksPlayed: number
  equip: Equip
  level: number
  lastZ10: number
  pending: bigint // units
  deathTicker: string | null
}

export interface PetState extends Pet {
  owner: Address | null
}

export const SLOT_KEYS = ['tete', 'yeux', 'cou', 'poignet', 'main'] as const
export const BATCH = 16_384 // multicall calldata chunk, bytes

export const b8ToString = (h: Hex) => hexToString(h, { size: 8 }).replace(/\0+$/g, '')

export const hoodContract = { address: ADDRESSES.hoodochi as Address, abi: HOODOCHI_ABI } as const

let client: PublicClient | null = null
/** One public client for the whole app. Null in demo mode (no contract address). */
export function publicClient(): PublicClient | null {
  if (!onChain) return null
  if (!client) client = createPublicClient({ chain, transport: http(undefined, { retryCount: 2 }) })
  return client
}

type PetTuple = readonly [bigint, Hex, boolean, boolean, number, readonly number[], number, number, bigint, Hex]

export function toPet(id: number, r: PetTuple): Pet {
  const [, ticker, staked, alive, weeksPlayed, slots, level, lastZ10, pending, deathTicker] = r
  const equip: Equip = {}
  SLOT_KEYS.forEach((k, i) => {
    if ((slots[i] ?? 0) > 0) equip[k] = slots[i]
  })
  const tk = b8ToString(ticker)
  const dk = b8ToString(deathTicker)
  return { id, ticker: tk || null, staked, alive, weeksPlayed, equip, level, lastZ10, pending, deathTicker: dk || null }
}

/** Every minted Hoodochi with its owner and live state. */
export async function readCollection(): Promise<{ total: number; pets: PetState[] }> {
  const pub = publicClient()
  if (!pub) return { total: 0, pets: [] }
  const total = Number(await pub.readContract({ ...hoodContract, functionName: 'totalMinted' }))
  if (total === 0) return { total, pets: [] }
  const ids = Array.from({ length: total }, (_, i) => i + 1)
  const [owners, raw] = await Promise.all([
    pub.multicall({ contracts: ids.map((id) => ({ ...hoodContract, functionName: 'ownerOf', args: [BigInt(id)] }) as const), allowFailure: true, batchSize: BATCH }),
    pub.multicall({ contracts: ids.map((id) => ({ ...hoodContract, functionName: 'petOf', args: [BigInt(id)] }) as const), allowFailure: true, batchSize: BATCH }),
  ])
  const pets: PetState[] = []
  ids.forEach((id, i) => {
    if (raw[i].status !== 'success') return
    pets.push({ ...toPet(id, raw[i].result as PetTuple), owner: owners[i].status === 'success' ? (owners[i].result as Address) : null })
  })
  return { total, pets }
}

/** One Hoodochi, or null if not minted. */
export async function readOne(id: number): Promise<{ total: number; pet: PetState | null }> {
  const pub = publicClient()
  if (!pub) return { total: 0, pet: null }
  const total = Number(await pub.readContract({ ...hoodContract, functionName: 'totalMinted' }))
  if (id < 1 || id > total) return { total, pet: null }
  const [o, r] = await pub.multicall({
    contracts: [
      { ...hoodContract, functionName: 'ownerOf', args: [BigInt(id)] },
      { ...hoodContract, functionName: 'petOf', args: [BigInt(id)] },
    ],
    allowFailure: true,
  })
  if (r.status !== 'success') return { total, pet: null }
  return { total, pet: { ...toPet(id, r.result as PetTuple), owner: o.status === 'success' ? (o.result as Address) : null } }
}

export const UNIT = 1_000_000
export const fmtUnits = (u: bigint) => (Number(u) / UNIT).toFixed(3)

/** One line that says where it stands. */
export function statusWord(p: Pet): string {
  if (!p.alive) return `Dead. Killed by ${p.deathTicker ?? '?'}`
  if (p.staked) return `Staked on ${p.ticker}`
  if (p.ticker) return `${p.ticker} collar on, not staked`
  return 'Naked. No collar yet'
}

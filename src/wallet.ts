// Wallet + contract access for the Game Boy. One hook, two backends:
//  - on-chain (viem, window.ethereum, Robinhood Chain) when VITE_HOODOCHI_ADDRESS is set
//    and the visitor connects a wallet;
//  - demo (in-memory) otherwise, so the Game Boy is playable for everyone. The demo
//    settles a week instantly with a random z-score, so you can see the loop.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createWalletClient, custom, formatEther, stringToHex } from 'viem'
import type { Address, TransactionReceipt, WalletClient } from 'viem'
import { chain, ADDRESSES, onChain } from './chain'
import { HOODOCHI_ABI } from './abi'
import { toPet, hoodContract, BATCH, publicClient, SLOT_KEYS } from './pets'
import type { Pet } from './pets'

export type { Pet } from './pets'

export const UNIT = 1_000_000 // yield units: 1e6 = 1.000000 of the ticker

export type WalletStatus = 'none' | 'disconnected' | 'connecting' | 'wrong-chain' | 'ready'

export interface Backend {
  mode: 'chain' | 'demo'
  status: WalletStatus
  address: Address | null
  error: string | null
  mintPrice: bigint | null
  totalMinted: number
  pets: Pet[]
  ledger: Record<string, bigint>
  busy: string | null // label of the transaction in flight
  syncing: boolean // reading the chain
  connect: () => Promise<void>
  refresh: () => Promise<Pet[]>
  mint: () => Promise<number | null>
  setCollar: (id: number, ticker: string) => Promise<void>
  stake: (id: number) => Promise<void>
  unstake: (id: number) => Promise<void>
  claim: (id: number) => Promise<void>
  /** Demo only: settle a week now (the real one is the keeper on Friday). */
  demoFriday: (id: number, z10?: number) => void
}

const TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'

const stringToB8 = (s: string) => stringToHex(s.toUpperCase(), { size: 8 })

declare global {
  interface Window {
    ethereum?: { request: (args: { method: string; params?: unknown[] }) => Promise<unknown>; on?: (ev: string, cb: (...a: unknown[]) => void) => void }
  }
}

export function useBackend(): Backend {
  const mode: Backend['mode'] = onChain ? 'chain' : 'demo'
  const [status, setStatus] = useState<WalletStatus>(() => (mode === 'demo' ? 'ready' : typeof window !== 'undefined' && window.ethereum ? 'disconnected' : 'none'))
  const [address, setAddress] = useState<Address | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [mintPrice, setMintPrice] = useState<bigint | null>(mode === 'demo' ? 1_000_000_000_000_000n : null)
  const [totalMinted, setTotalMinted] = useState(mode === 'demo' ? 412 : 0)
  const [pets, setPets] = useState<Pet[]>([])
  const [ledger, setLedger] = useState<Record<string, bigint>>({})
  const [busy, setBusy] = useState<string | null>(null)
  const [syncing, setSyncing] = useState(false)
  const walletRef = useRef<WalletClient | null>(null)

  const pub = useMemo(() => (mode === 'chain' ? publicClient() : null), [mode])

  // ---- reads ------------------------------------------------------------
  // No event logs: the public RPC times out on wide eth_getLogs ranges. Ownership is
  // read straight from the contract, ownerOf(1..totalMinted) in a few multicalls.
  const refresh = useCallback(async (): Promise<Pet[]> => {
    if (mode !== 'chain' || !pub) return []
    setSyncing(true)
    try {
      const [price, minted] = await pub.multicall({
        contracts: [
          { ...hoodContract, functionName: 'mintPrice' },
          { ...hoodContract, functionName: 'totalMinted' },
        ],
        allowFailure: false,
      })
      setMintPrice(price)
      const n = Number(minted)
      setTotalMinted(n)
      if (!address || n === 0) {
        setPets([])
        return []
      }
      const ids = Array.from({ length: n }, (_, i) => i + 1)
      const owners = await pub.multicall({
        contracts: ids.map((id) => ({ ...hoodContract, functionName: 'ownerOf', args: [BigInt(id)] }) as const),
        allowFailure: true, // burned / never minted ids revert
        batchSize: BATCH,
      })
      const me = address.toLowerCase()
      const owned = ids.filter((id, i) => owners[i].status === 'success' && String(owners[i].result).toLowerCase() === me)
      const raw = owned.length
        ? await pub.multicall({ contracts: owned.map((id) => ({ ...hoodContract, functionName: 'petOf', args: [BigInt(id)] }) as const), allowFailure: false, batchSize: BATCH })
        : []
      const list = owned.map((id, i) => toPet(id, raw[i] as Parameters<typeof toPet>[1]))
      setPets(list)
      const tickers = [...new Set(list.map((p) => p.ticker ?? p.deathTicker).filter(Boolean) as string[])]
      if (tickers.length) {
        const bal = await pub.multicall({ contracts: tickers.map((t) => ({ ...hoodContract, functionName: 'ledger', args: [address, stringToB8(t)] }) as const), allowFailure: false })
        const led: Record<string, bigint> = {}
        tickers.forEach((t, i) => (led[t] = bal[i]))
        setLedger(led)
      }
      setError(null)
      return list
    } catch (e) {
      const msg = (e as Error).message.split('\n')[0]
      setError(msg.length > 60 ? msg.slice(0, 57) + '…' : msg)
      return pets
    } finally {
      setSyncing(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, pub, address])

  /** Re-read until the chain shows what we expect (the RPC is load-balanced and can lag a few blocks). */
  const refreshUntil = useCallback(
    async (expect: (ps: Pet[]) => boolean, tries = 8, gap = 1500): Promise<Pet[]> => {
      let list: Pet[] = []
      for (let i = 0; i < tries; i++) {
        list = await refresh()
        if (expect(list)) break
        await wait(gap)
      }
      return list
    },
    [refresh],
  )

  useEffect(() => {
    void refresh()
  }, [refresh])

  // ---- wallet -------------------------------------------------------------
  const connect = useCallback(async () => {
    if (mode !== 'chain') return
    if (!window.ethereum) {
      setStatus('none')
      return
    }
    setStatus('connecting')
    setError(null)
    try {
      const wc = createWalletClient({ chain, transport: custom(window.ethereum) })
      const [acc] = await wc.requestAddresses()
      const current = await wc.getChainId()
      if (current !== chain.id) {
        try {
          await wc.switchChain({ id: chain.id })
        } catch {
          await wc.addChain({ chain })
          await wc.switchChain({ id: chain.id })
        }
      }
      walletRef.current = wc
      setAddress(acc)
      setStatus('ready')
    } catch (e) {
      setError((e as Error).message.split('\n')[0])
      setStatus('disconnected')
    }
  }, [mode])

  useEffect(() => {
    const eth = typeof window !== 'undefined' ? window.ethereum : undefined
    if (!eth?.on) return
    eth.on('accountsChanged', (accs: unknown) => {
      const a = (accs as string[])[0]
      setAddress((a as Address) ?? null)
      if (!a) setStatus('disconnected')
    })
    eth.on('chainChanged', (id: unknown) => {
      setStatus(Number(id) === chain.id ? 'ready' : 'wrong-chain')
    })
  }, [])

  // ---- writes -------------------------------------------------------------
  const write = useCallback(
    async (label: string, fn: 'mint' | 'setCollar' | 'stake' | 'unstake' | 'claim', args: readonly unknown[], value?: bigint, expect?: (ps: Pet[]) => boolean): Promise<TransactionReceipt> => {
      const wc = walletRef.current
      if (!wc || !address || !pub) throw new Error('no wallet')
      setBusy(label)
      setError(null)
      try {
        const hash = await wc.writeContract({
          address: ADDRESSES.hoodochi as Address,
          abi: HOODOCHI_ABI,
          functionName: fn,
          args: args as never,
          value: value as never, // union of payable + non-payable fns: viem narrows value to undefined
          account: address,
          chain,
        })
        const receipt = await pub.waitForTransactionReceipt({ hash })
        if (receipt.status !== 'success') throw new Error('TX REVERTED')
        setBusy('SYNCING')
        await refreshUntil(expect ?? (() => true))
        return receipt
      } catch (e) {
        const msg = (e as Error).message.split('\n')[0]
        setError(msg.length > 60 ? msg.slice(0, 57) + '…' : msg)
        throw e
      } finally {
        setBusy(null)
      }
    },
    [address, pub, refreshUntil],
  )

  // ---- demo backend -------------------------------------------------------
  const demoNext = useRef(413)
  const demo = mode === 'demo'

  const mint = useCallback(async (): Promise<number | null> => {
    if (demo) {
      setBusy('MINTING')
      await wait(900)
      const id = demoNext.current++
      setPets((p) => [...p, { id, ticker: null, staked: false, alive: true, weeksPlayed: 0, equip: {}, level: 0, lastZ10: 0, pending: 0n, deathTicker: null }])
      setTotalMinted((n) => n + 1)
      setBusy(null)
      return id
    }
    if (!mintPrice) return null
    // The id comes from the receipt's Transfer log, not from a guess on totalMinted.
    let id = 0
    await write('MINTING', 'mint', [1n], mintPrice, () => id === 0 || pets.some((p) => p.id === id)).then((rc) => {
      const log = rc.logs.find((l) => l.address.toLowerCase() === (ADDRESSES.hoodochi as string).toLowerCase() && l.topics[0] === TRANSFER_TOPIC)
      if (log?.topics[3]) id = Number(BigInt(log.topics[3]))
    })
    if (id) await refreshUntil((ps) => ps.some((p) => p.id === id))
    return id || null
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demo, mintPrice, write, refreshUntil])

  const setCollar = useCallback(
    async (id: number, ticker: string) => {
      if (demo) {
        setBusy('COLLARING')
        await wait(600)
        setPets((ps) => ps.map((p) => (p.id === id ? { ...p, ticker: ticker.toUpperCase() } : p)))
        setBusy(null)
        return
      }
      await write('COLLARING', 'setCollar', [BigInt(id), stringToB8(ticker)], undefined, (ps) => ps.find((p) => p.id === id)?.ticker === ticker.toUpperCase())
    },
    [demo, write],
  )

  const stake = useCallback(
    async (id: number) => {
      if (demo) {
        setBusy('STAKING')
        await wait(600)
        setPets((ps) => ps.map((p) => (p.id === id ? { ...p, staked: true } : p)))
        setBusy(null)
        return
      }
      await write('STAKING', 'stake', [BigInt(id)], undefined, (ps) => ps.find((p) => p.id === id)?.staked === true)
    },
    [demo, write],
  )

  const unstake = useCallback(
    async (id: number) => {
      if (demo) {
        setPets((ps) => ps.map((p) => (p.id === id ? { ...p, staked: false } : p)))
        return
      }
      await write('UNSTAKING', 'unstake', [BigInt(id)], undefined, (ps) => ps.find((p) => p.id === id)?.staked === false)
    },
    [demo, write],
  )

  const claim = useCallback(
    async (id: number) => {
      if (demo) {
        setBusy('CLAIMING')
        await wait(600)
        setPets((ps) =>
          ps.map((p) => {
            if (p.id !== id) return p
            const t = p.ticker ?? p.deathTicker
            if (t) setLedger((l) => ({ ...l, [t]: (l[t] ?? 0n) + p.pending }))
            return { ...p, pending: 0n }
          }),
        )
        setBusy(null)
        return
      }
      await write('CLAIMING', 'claim', [BigInt(id)], undefined, (ps) => ps.find((p) => p.id === id)?.pending === 0n)
    },
    [demo, write],
  )

  // Demo Friday: same rules as the contract (thresholds 3/8/14/20, death ≤ −15, in tenths of σ).
  const demoFriday = useCallback((id: number, z10?: number) => {
    const z = z10 ?? Math.round(gauss() * 10)
    setPets((ps) =>
      ps.map((p) => {
        if (p.id !== id || !p.staked || !p.alive || !p.ticker) return p
        const weeksPlayed = p.weeksPlayed + 1
        if (z <= -15) return { ...p, alive: false, staked: false, equip: {}, level: 0, weeksPlayed, lastZ10: z, deathTicker: p.ticker }
        let tier = 0
        ;[3, 8, 14, 20].forEach((th, i) => {
          if (z >= th) tier = i + 1
        })
        const equip = { ...p.equip }
        if (tier > 0) {
          const el = SLOT_KEYS.filter((s) => (equip[s] ?? 0) < tier)
          if (el.length) equip[el[Math.floor(Math.random() * el.length)]] = tier
        }
        const level = SLOT_KEYS.reduce((a, s) => a + (equip[s] ?? 0), 0)
        const units = z > 0 ? BigInt(Math.round((z / 10) * 0.02 * UNIT)) : 0n // ~$5 stake × weekly move / price, abstract
        return { ...p, equip, level, weeksPlayed, lastZ10: z, pending: p.pending + units }
      }),
    )
  }, [])

  return { mode, status, address, error, mintPrice, totalMinted, pets, ledger, busy, syncing, connect, refresh, mint, setCollar, stake, unstake, claim, demoFriday }
}

export const fmtUnits = (u: bigint) => (Number(u) / UNIT).toFixed(3)
export const fmtEth = (wei: bigint) => `${Number(formatEther(wei)).toFixed(4)} ETH`

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))
function gauss() {
  const u = 1 - Math.random()
  const v = Math.random()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}

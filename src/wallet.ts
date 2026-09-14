// Wallet + contract access for the Game Boy. One hook, two backends:
//  - on-chain (viem, window.ethereum, Robinhood Chain) when VITE_HOODOCHI_ADDRESS is set
//    and the visitor connects a wallet;
//  - demo (in-memory) otherwise, so the Game Boy is playable for everyone. The demo
//    settles a week instantly with a random z-score, so you can see the loop.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPublicClient, createWalletClient, custom, http, formatEther, hexToString, stringToHex, parseAbiItem } from 'viem'
import type { Address, Hex, PublicClient, WalletClient } from 'viem'
import { chain, ADDRESSES, onChain } from './chain'
import { HOODOCHI_ABI } from './abi'
import type { Equip } from './components/Hoodochi'

export const UNIT = 1_000_000 // yield units: 1e6 = 1.000000 of the ticker

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
  connect: () => Promise<void>
  refresh: () => Promise<void>
  mint: () => Promise<number | null>
  setCollar: (id: number, ticker: string) => Promise<void>
  stake: (id: number) => Promise<void>
  unstake: (id: number) => Promise<void>
  claim: (id: number) => Promise<void>
  /** Demo only: settle a week now (the real one is the keeper on Friday). */
  demoFriday: (id: number, z10?: number) => void
}

const SLOT_KEYS = ['tete', 'yeux', 'cou', 'poignet', 'main'] as const
const TRANSFER = parseAbiItem('event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)')

const b8ToString = (h: Hex) => hexToString(h, { size: 8 }).replace(/\0+$/g, '')
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
  const walletRef = useRef<WalletClient | null>(null)

  const pub: PublicClient | null = useMemo(() => (mode === 'chain' ? createPublicClient({ chain, transport: http() }) : null), [mode])

  // ---- reads ------------------------------------------------------------
  const readPet = useCallback(
    async (id: number): Promise<Pet> => {
      const r = await pub!.readContract({ address: ADDRESSES.hoodochi as Address, abi: HOODOCHI_ABI, functionName: 'petOf', args: [BigInt(id)] })
      const [, ticker, staked, alive, weeksPlayed, slots, level, lastZ10, pending, deathTicker] = r
      const equip: Equip = {}
      ;(slots as readonly number[]).forEach((t: number, i: number) => {
        if (t > 0) equip[SLOT_KEYS[i]] = t
      })
      const tk = b8ToString(ticker)
      const dk = b8ToString(deathTicker)
      return { id, ticker: tk || null, staked, alive, weeksPlayed, equip, level, lastZ10, pending, deathTicker: dk || null }
    },
    [pub],
  )

  const refresh = useCallback(async () => {
    if (mode !== 'chain' || !pub) return
    const hood = ADDRESSES.hoodochi as Address
    try {
      const [price, minted] = await Promise.all([
        pub.readContract({ address: hood, abi: HOODOCHI_ABI, functionName: 'mintPrice' }),
        pub.readContract({ address: hood, abi: HOODOCHI_ABI, functionName: 'totalMinted' }),
      ])
      setMintPrice(price)
      setTotalMinted(Number(minted))
      if (!address) return
      // every token that ever came to this wallet, then keep the ones still here
      const logs = await pub.getLogs({ address: hood, event: TRANSFER, args: { to: address }, fromBlock: 0n, toBlock: 'latest' })
      const ids = [...new Set((logs as { args: { tokenId?: bigint } }[]).map((l) => Number(l.args.tokenId ?? 0n)))]
      const owned: number[] = []
      for (const id of ids) {
        const o = (await pub.readContract({ address: hood, abi: HOODOCHI_ABI, functionName: 'ownerOf', args: [BigInt(id)] }).catch(() => null)) as string | null
        if (o && o.toLowerCase() === address.toLowerCase()) owned.push(id)
      }
      const list = await Promise.all(owned.map(readPet))
      setPets(list)
      const tickers = [...new Set(list.map((p) => p.ticker ?? p.deathTicker).filter(Boolean) as string[])]
      const led: Record<string, bigint> = {}
      for (const t of tickers) led[t] = await pub.readContract({ address: hood, abi: HOODOCHI_ABI, functionName: 'ledger', args: [address, stringToB8(t)] })
      setLedger(led)
    } catch (e) {
      setError((e as Error).message.split('\n')[0])
    }
  }, [mode, pub, address, readPet])

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
    async (label: string, fn: 'mint' | 'setCollar' | 'stake' | 'unstake' | 'claim', args: readonly unknown[], value?: bigint) => {
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
        await pub.waitForTransactionReceipt({ hash })
        await refresh()
      } catch (e) {
        const msg = (e as Error).message.split('\n')[0]
        setError(msg.length > 60 ? msg.slice(0, 57) + '…' : msg)
        throw e
      } finally {
        setBusy(null)
      }
    },
    [address, pub, refresh],
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
    const before = totalMinted
    await write('MINTING', 'mint', [1n], mintPrice)
    return before + 1
  }, [demo, mintPrice, totalMinted, write])

  const setCollar = useCallback(
    async (id: number, ticker: string) => {
      if (demo) {
        setBusy('COLLARING')
        await wait(600)
        setPets((ps) => ps.map((p) => (p.id === id ? { ...p, ticker: ticker.toUpperCase() } : p)))
        setBusy(null)
        return
      }
      await write('COLLARING', 'setCollar', [BigInt(id), stringToB8(ticker)])
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
      await write('STAKING', 'stake', [BigInt(id)])
    },
    [demo, write],
  )

  const unstake = useCallback(
    async (id: number) => {
      if (demo) {
        setPets((ps) => ps.map((p) => (p.id === id ? { ...p, staked: false } : p)))
        return
      }
      await write('UNSTAKING', 'unstake', [BigInt(id)])
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
      await write('CLAIMING', 'claim', [BigInt(id)])
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

  return { mode, status, address, error, mintPrice, totalMinted, pets, ledger, busy, connect, refresh, mint, setCollar, stake, unstake, claim, demoFriday }
}

export const fmtUnits = (u: bigint) => (Number(u) / UNIT).toFixed(3)
export const fmtEth = (wei: bigint) => `${Number(formatEther(wei)).toFixed(4)} ETH`

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))
function gauss() {
  const u = 1 - Math.random()
  const v = Math.random()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}

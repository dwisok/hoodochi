// Minimal ABIs for the v2 contracts (contracts/src). Human-readable, parsed by viem.
import { parseAbi } from 'viem'

export const HOODOCHI_ABI = parseAbi([
  // reads
  'function mintPrice() view returns (uint256)',
  'function totalMinted() view returns (uint256)',
  'function ownerOf(uint256 id) view returns (address)',
  'function balanceOf(address owner) view returns (uint256)',
  'function petOf(uint256 id) view returns (uint256 collarId, bytes8 ticker, bool staked, bool alive, uint32 weeksPlayed, uint8[5] slots, uint8 level, int16 lastZ10, uint256 pending, bytes8 deathTicker)',
  'function pendingYield(uint256 id) view returns (uint256)',
  'function claimedYield(uint256 id) view returns (uint256)',
  'function ledger(address owner, bytes8 ticker) view returns (uint256)',
  'function tierZ10(uint256 i) view returns (int16)',
  'function deathZ10() view returns (int16)',
  // writes
  'function mint(uint256 n) payable',
  'function setCollar(uint256 id, bytes8 ticker)',
  'function removeCollar(uint256 id)',
  'function stake(uint256 id)',
  'function unstake(uint256 id)',
  'function claim(uint256 id)',
  // events
  'event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)',
  'event Minted(uint256 indexed id, address indexed to)',
  'event Settled(uint256 indexed id, int16 z10, uint8 slot, uint8 tier, uint256 yieldUnits)',
  'event Died(uint256 indexed id, bytes8 ticker, uint32 weeksPlayed)',
  'event Claimed(uint256 indexed id, address indexed to, bytes8 ticker, uint256 units)',
])

export const COLLAR_ABI = parseAbi(['function tickerOf(uint256 id) view returns (bytes8)', 'function tickerString(uint256 id) view returns (string)'])

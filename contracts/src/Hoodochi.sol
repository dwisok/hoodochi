// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {IERC721Receiver} from "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";
import {Collar} from "./Collar.sol";

/// @notice Optional hook for where claimed yield goes. Unset by default (BRIEF-NFT §10).
interface IYieldSink {
    function onClaim(address to, uint256 hoodochiId, bytes8 ticker, uint256 units) external;
}

/// @title Hoodochi v2 — a pixel pet that lives on a stock, one week at a time
/// @notice BRIEF v2 / BRIEF-NFT. 1,000 creatures with birth traits fixed off-chain (the
///         collection is pre-generated; `tokenURI` points at the renderer). The loop:
///         collar (pick a ticker) → stake → the keeper settles every Friday with the
///         week's move in standard deviations → one item (5 slots × 4 tiers), nothing,
///         or death. Items are permanent; death burns them. Yield accrues in units
///         labelled with the collar's ticker; `claim` moves them to a ledger. Nothing here
///         is a share, a token or an exposure to a real asset until a `sink` is attached
///         after the legal review.
contract Hoodochi is ERC721, IERC721Receiver, Ownable, ReentrancyGuard {
    // ---- errors -------------------------------------------------------------
    error NotKeeper();
    error NotYours();
    error Dead();
    error NoCollar();
    error Staked();
    error NotStaked();
    error SoldOut();
    error WrongPrice();
    error TooMany();
    error BadTicker();
    error CollarFrozen();
    error LengthMismatch();
    error TransferLocked();

    // ---- types --------------------------------------------------------------
    enum DeathPolicy {
        Frozen, // collar stays on the corpse (BRIEF §9.1, open — default)
        Released // owner may take the collar off the corpse
    }

    struct Pet {
        uint256 collarId; // 0 = no collar (it sleeps)
        uint64 stakedSince; // 0 = not staked
        uint64 diedAt; // 0 = alive
        uint32 weeksPlayed; // settled weeks while staked
        uint8[5] slots; // tier per slot: head, eyewear, neck, wrist, hand (0 = empty, 1–4)
        int16 lastZ10; // last settled week, tenths of a standard deviation
        bytes8 deathTicker; // the collar that killed it
    }

    // ---- constants ----------------------------------------------------------
    uint256 public constant MAX_SUPPLY = 1000;
    uint256 public constant MAX_PER_TX = 5;
    uint8 public constant SLOTS = 5;
    uint8 public constant MAX_TIER = 4;

    // ---- storage ------------------------------------------------------------
    Collar public immutable collar;
    address public keeper;
    IYieldSink public sink;
    DeathPolicy public deathPolicy;
    string public baseURI; // renderer: baseURI + id (json), baseURI + id + ".png"
    bytes32 public immutable provenance; // sha256 of the 1,000 base images, in order
    uint256 public mintPrice; // wei; set at deploy from the $5 target, adjustable
    uint256 public nextId = 1;

    /// @dev Thresholds in tenths of σ (BRIEF §9.3 — provisional, owner-adjustable).
    ///      A week at or above tierZ10[i] can earn tier i+1; at or below deathZ10 kills.
    int16[4] public tierZ10 = [int16(3), int16(8), int16(14), int16(20)];
    int16 public deathZ10 = -15;

    mapping(uint256 => Pet) internal _pets;
    mapping(uint256 => uint256) public pendingYield; // units, per creature
    mapping(uint256 => uint256) public claimedYield; // lifetime, per creature
    mapping(address => mapping(bytes8 => uint256)) public ledger; // claimed units per owner per ticker

    // ---- events -------------------------------------------------------------
    event KeeperSet(address indexed keeper);
    event SinkSet(address indexed sink);
    event DeathPolicySet(DeathPolicy policy);
    event BaseURISet(string baseURI);
    event MintPriceSet(uint256 wei_);
    event ThresholdsSet(int16[4] tierZ10, int16 deathZ10);
    event Minted(uint256 indexed id, address indexed to);
    event Collared(uint256 indexed id, uint256 indexed collarId, bytes8 ticker);
    event Uncollared(uint256 indexed id, uint256 indexed collarId);
    event StakedOn(uint256 indexed id, bytes8 ticker);
    event Unstaked(uint256 indexed id);
    event Settled(uint256 indexed id, int16 z10, uint8 slot, uint8 tier, uint256 yieldUnits);
    event Died(uint256 indexed id, bytes8 ticker, uint32 weeksPlayed);
    event Claimed(uint256 indexed id, address indexed to, bytes8 ticker, uint256 units);

    constructor(Collar collar_, address keeper_, uint256 mintPrice_, bytes32 provenance_, string memory baseURI_)
        ERC721("Hoodochi", "HOOD")
        Ownable(msg.sender)
    {
        collar = collar_;
        keeper = keeper_;
        mintPrice = mintPrice_;
        provenance = provenance_;
        baseURI = baseURI_;
    }

    // ---- admin --------------------------------------------------------------
    function setKeeper(address keeper_) external onlyOwner {
        keeper = keeper_;
        emit KeeperSet(keeper_);
    }

    function setSink(IYieldSink sink_) external onlyOwner {
        sink = sink_;
        emit SinkSet(address(sink_));
    }

    function setDeathPolicy(DeathPolicy policy) external onlyOwner {
        deathPolicy = policy;
        emit DeathPolicySet(policy);
    }

    function setBaseURI(string calldata uri) external onlyOwner {
        baseURI = uri;
        emit BaseURISet(uri);
    }

    function setMintPrice(uint256 wei_) external onlyOwner {
        mintPrice = wei_;
        emit MintPriceSet(wei_);
    }

    function setThresholds(int16[4] calldata tiers, int16 death) external onlyOwner {
        tierZ10 = tiers;
        deathZ10 = death;
        emit ThresholdsSet(tiers, death);
    }

    function withdraw(address payable to) external onlyOwner {
        (bool ok,) = to.call{value: address(this).balance}("");
        require(ok, "withdraw");
    }

    // ---- mint ---------------------------------------------------------------
    /// @notice Public mint, fixed price, 1,000 max. Traits are fixed by id (pre-generated).
    function mint(uint256 n) external payable nonReentrant {
        if (n == 0 || n > MAX_PER_TX) revert TooMany();
        if (nextId + n - 1 > MAX_SUPPLY) revert SoldOut();
        if (msg.value != mintPrice * n) revert WrongPrice();
        for (uint256 i; i < n; i++) {
            uint256 id = nextId++;
            _safeMint(msg.sender, id);
            emit Minted(id, msg.sender);
        }
    }

    // ---- collar -------------------------------------------------------------
    /// @notice Put a ticker on its collar. Mints the collar straight into escrow; if it
    ///         already wears one, the old collar goes back to your wallet. Not while staked.
    function setCollar(uint256 id, bytes8 ticker) external nonReentrant {
        Pet storage p = _pet(id, msg.sender);
        if (p.diedAt != 0) revert Dead();
        if (p.stakedSince != 0) revert Staked();
        if (!_validTicker(ticker)) revert BadTicker();
        if (p.collarId != 0) {
            uint256 old = p.collarId;
            p.collarId = 0;
            collar.transferFrom(address(this), msg.sender, old);
            emit Uncollared(id, old);
        }
        uint256 c = collar.mint(address(this), ticker);
        p.collarId = c;
        emit Collared(id, c, ticker);
    }

    /// @notice Clip on a collar you already own (from another Hoodochi, or bought).
    function equipCollar(uint256 id, uint256 collarId) external nonReentrant {
        Pet storage p = _pet(id, msg.sender);
        if (p.diedAt != 0) revert Dead();
        if (p.stakedSince != 0) revert Staked();
        if (p.collarId != 0) {
            uint256 old = p.collarId;
            p.collarId = 0;
            collar.transferFrom(address(this), msg.sender, old);
            emit Uncollared(id, old);
        }
        collar.transferFrom(msg.sender, address(this), collarId);
        p.collarId = collarId;
        emit Collared(id, collarId, collar.tickerOf(collarId));
    }

    /// @notice Take the collar off. It sleeps. Dead → only if the policy allows.
    function removeCollar(uint256 id) external nonReentrant {
        Pet storage p = _pet(id, msg.sender);
        if (p.stakedSince != 0) revert Staked();
        uint256 c = p.collarId;
        if (c == 0) revert NoCollar();
        if (p.diedAt != 0 && deathPolicy == DeathPolicy.Frozen) revert CollarFrozen();
        p.collarId = 0;
        collar.transferFrom(address(this), msg.sender, c);
        emit Uncollared(id, c);
    }

    // ---- stake --------------------------------------------------------------
    /// @notice Stake it on the stock on its collar. It stays in your wallet but cannot be
    ///         transferred while staked. From now on Fridays count.
    function stake(uint256 id) external {
        Pet storage p = _pet(id, msg.sender);
        if (p.diedAt != 0) revert Dead();
        if (p.collarId == 0) revert NoCollar();
        if (p.stakedSince != 0) revert Staked();
        p.stakedSince = uint64(block.timestamp);
        emit StakedOn(id, collar.tickerOf(p.collarId));
    }

    /// @notice Stop playing. Pending yield stays claimable, items stay on.
    function unstake(uint256 id) external {
        Pet storage p = _pet(id, msg.sender);
        if (p.stakedSince == 0) revert NotStaked();
        p.stakedSince = 0;
        emit Unstaked(id);
    }

    // ---- friday -------------------------------------------------------------
    /// @notice Keeper settles the week for staked, living creatures. `z10` is the week's
    ///         return in tenths of the ticker's own weekly σ; `units` the yield to accrue.
    ///         The contract decides item / nothing / death from the thresholds, and draws
    ///         the slot. Unstaked or dead ids are skipped, never reverted.
    function settleWeek(uint256[] calldata ids, int16[] calldata z10, uint256[] calldata units) external {
        if (msg.sender != keeper) revert NotKeeper();
        uint256 n = ids.length;
        if (z10.length != n || units.length != n) revert LengthMismatch();
        for (uint256 i; i < n; i++) {
            uint256 id = ids[i];
            Pet storage p = _pets[id];
            if (p.stakedSince == 0 || p.diedAt != 0 || p.collarId == 0) continue;
            p.weeksPlayed += 1;
            p.lastZ10 = z10[i];
            bytes8 ticker = collar.tickerOf(p.collarId);

            if (z10[i] <= deathZ10) {
                p.diedAt = uint64(block.timestamp);
                p.deathTicker = ticker;
                p.stakedSince = 0;
                delete p.slots; // everything it wore burns with it
                emit Settled(id, z10[i], 0, 0, 0);
                emit Died(id, ticker, p.weeksPlayed);
                continue;
            }

            uint8 tier = _tierFor(z10[i]);
            uint8 slot = 0;
            if (tier > 0) {
                (bool found, uint8 s) = _drawSlot(id, p.slots, tier);
                if (found) {
                    p.slots[s] = tier;
                    slot = s + 1; // 1-based in the event, 0 = none
                }
            }
            if (units[i] > 0) pendingYield[id] += units[i];
            emit Settled(id, z10[i], slot, slot == 0 ? 0 : tier, units[i]);
        }
    }

    /// @notice Move pending units to your ledger, labelled with the collar's ticker.
    function claim(uint256 id) external nonReentrant {
        Pet storage p = _pet(id, msg.sender);
        uint256 u = pendingYield[id];
        if (u == 0) return;
        bytes8 ticker = p.collarId != 0 ? collar.tickerOf(p.collarId) : p.deathTicker;
        pendingYield[id] = 0;
        claimedYield[id] += u;
        ledger[msg.sender][ticker] += u;
        emit Claimed(id, msg.sender, ticker, u);
        if (address(sink) != address(0)) sink.onClaim(msg.sender, id, ticker, u);
    }

    // ---- views --------------------------------------------------------------
    function petOf(uint256 id)
        external
        view
        returns (
            uint256 collarId,
            bytes8 ticker,
            bool staked,
            bool alive,
            uint32 weeksPlayed,
            uint8[5] memory slots,
            uint8 level,
            int16 lastZ10,
            uint256 pending,
            bytes8 deathTicker
        )
    {
        _requireOwned(id);
        Pet storage p = _pets[id];
        collarId = p.collarId;
        ticker = p.collarId != 0 ? collar.tickerOf(p.collarId) : bytes8(0);
        staked = p.stakedSince != 0;
        alive = p.diedAt == 0;
        weeksPlayed = p.weeksPlayed;
        slots = p.slots;
        level = levelOf(id);
        lastZ10 = p.lastZ10;
        pending = pendingYield[id];
        deathTicker = p.deathTicker;
    }

    function isAlive(uint256 id) public view returns (bool) {
        return _pets[id].diedAt == 0;
    }

    function isStaked(uint256 id) public view returns (bool) {
        return _pets[id].stakedSince != 0;
    }

    function collarOf(uint256 id) external view returns (uint256) {
        return _pets[id].collarId;
    }

    function levelOf(uint256 id) public view returns (uint8 lvl) {
        uint8[5] storage s = _pets[id].slots;
        for (uint256 i; i < SLOTS; i++) lvl += s[i];
    }

    function totalMinted() external view returns (uint256) {
        return nextId - 1;
    }

    /// @notice Metadata lives at the renderer (state changes every Monday and Friday).
    function tokenURI(uint256 id) public view override returns (string memory) {
        _requireOwned(id);
        return string.concat(baseURI, Strings.toString(id));
    }

    // ---- internals ----------------------------------------------------------
    function _pet(uint256 id, address who) internal view returns (Pet storage p) {
        if (ownerOf(id) != who) revert NotYours();
        p = _pets[id];
    }

    function _tierFor(int16 z) internal view returns (uint8 tier) {
        for (uint8 i; i < 4; i++) {
            if (z >= tierZ10[i]) tier = i + 1;
        }
    }

    /// @dev Draw a slot among those that can take this tier (empty, or a lower tier).
    function _drawSlot(uint256 id, uint8[5] storage slots, uint8 tier) internal view returns (bool, uint8) {
        uint8[5] memory eligible;
        uint8 n;
        for (uint8 i; i < SLOTS; i++) {
            if (slots[i] < tier) eligible[n++] = i;
        }
        if (n == 0) return (false, 0);
        uint256 r = uint256(keccak256(abi.encodePacked(blockhash(block.number - 1), id, block.timestamp)));
        return (true, eligible[r % n]);
    }

    function _validTicker(bytes8 t) internal pure returns (bool) {
        if (t[0] == 0) return false;
        bool ended;
        for (uint256 i; i < 8; i++) {
            bytes1 c = t[i];
            if (c == 0) {
                ended = true;
                continue;
            }
            if (ended) return false; // no gaps
            if (c < 0x41 || c > 0x5A) return false; // A–Z only
        }
        return true;
    }

    /// @dev Staked creatures cannot move (soft escrow — no transfer to the contract needed).
    function _update(address to, uint256 id, address auth) internal override returns (address) {
        address from = _ownerOf(id);
        if (from != address(0) && to != address(0) && _pets[id].stakedSince != 0) revert TransferLocked();
        return super._update(to, id, auth);
    }

    function onERC721Received(address, address, uint256, bytes calldata) external pure override returns (bytes4) {
        return IERC721Receiver.onERC721Received.selector;
    }
}

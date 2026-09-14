// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";
import {Base64} from "@openzeppelin/contracts/utils/Base64.sol";

/// @title Hoodochi Collar
/// @notice One collar = one ticker (BRIEF §2.2). A collar is its own NFT: the Hoodochi
///         contract mints it straight into escrow when you pick a stock, and hands it back
///         when you take it off. Letters only — no logos, no positions, no financial claim.
contract Collar is ERC721, Ownable {
    error NotMinter();
    error BadTicker();

    /// @dev Ticker as up-to-8 ASCII letters, right-padded with zero bytes.
    mapping(uint256 => bytes8) public tickerOf;
    mapping(address => bool) public minters;
    uint256 public nextId = 1;

    event MinterSet(address indexed minter, bool allowed);
    event CollarMinted(uint256 indexed id, bytes8 ticker, address indexed to);

    constructor() ERC721("Hoodochi Collar", "COLLAR") Ownable(msg.sender) {}

    function setMinter(address minter, bool allowed) external onlyOwner {
        minters[minter] = allowed;
        emit MinterSet(minter, allowed);
    }

    /// @notice Mint a collar engraved with `ticker` (e.g. bytes8("NVDA")).
    function mint(address to, bytes8 ticker) external returns (uint256 id) {
        if (!minters[msg.sender] && msg.sender != owner()) revert NotMinter();
        if (ticker == bytes8(0)) revert BadTicker();
        id = nextId++;
        tickerOf[id] = ticker;
        _safeMint(to, id);
        emit CollarMinted(id, ticker, to);
    }

    /// @notice The ticker as a plain string, zero padding stripped.
    function tickerString(uint256 id) public view returns (string memory) {
        bytes8 t = tickerOf[id];
        uint256 len;
        while (len < 8 && t[len] != 0) len++;
        bytes memory out = new bytes(len);
        for (uint256 i; i < len; i++) out[i] = t[i];
        return string(out);
    }

    /// @notice Fully on-chain metadata: the plate as it is on the site — short gold chain,
    ///         big gold plate with rounded corners, the ticker engraved.
    function tokenURI(uint256 id) public view override returns (string memory) {
        _requireOwned(id);
        string memory t = tickerString(id);
        string memory svg = string.concat(
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" shape-rendering="crispEdges">',
            '<rect width="48" height="48" fill="#1a1f3a"/>',
            // chain
            '<rect x="12" y="10" width="2" height="2" fill="#ffd73c"/><rect x="14" y="12" width="2" height="2" fill="#ffd73c"/>',
            '<rect x="34" y="10" width="2" height="2" fill="#ffd73c"/><rect x="32" y="12" width="2" height="2" fill="#ffd73c"/>',
            '<rect x="14" y="14" width="20" height="1" fill="#ffd73c"/>',
            // plate, corners left out
            '<rect x="10" y="15" width="28" height="18" fill="#1e1e1e"/>',
            '<rect x="9" y="16" width="30" height="16" fill="#1e1e1e"/>',
            '<rect x="10" y="16" width="28" height="16" fill="#ffd73c"/>',
            '<text x="24" y="27.5" font-family="monospace" font-size="8" font-weight="700" text-anchor="middle" fill="#1e1e1e">',
            t,
            "</text></svg>"
        );
        string memory json = string.concat(
            '{"name":"',
            t,
            " collar #",
            Strings.toString(id),
            '","description":"One collar, one ticker. Put it on a Hoodochi, stake it, earn the stock. Tickers are letters, not endorsements.",',
            '"attributes":[{"trait_type":"Ticker","value":"',
            t,
            '"}],"image":"data:image/svg+xml;base64,',
            Base64.encode(bytes(svg)),
            '"}'
        );
        return string.concat("data:application/json;base64,", Base64.encode(bytes(json)));
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console} from "forge-std/Test.sol";
import {Collar} from "../src/Collar.sol";
import {Hoodochi} from "../src/Hoodochi.sol";

/// End-to-end against the contracts deployed on Robinhood Chain mainnet, on a fork.
/// forge test --match-path test/MainnetFork.t.sol --fork-url robinhood -vv
contract MainnetForkTest is Test {
    Hoodochi constant hood = Hoodochi(0x23409CaD886380f066329eF237a37d55950AF9Ad);
    Collar constant collar = Collar(0xCCc7C1EA864E99CBe43788c203Af9c1BDfaba7c0);
    address player = address(0xBEEF);
    bytes8 constant NVDA = bytes8("NVDA");

    function setUp() public {
        vm.skip(block.chainid != 4663);
        vm.deal(player, 1 ether);
    }

    function test_fullLoopOnMainnetBytecode() public {
        address keeper = hood.keeper();
        uint256 price = hood.mintPrice();
        console.log("keeper", keeper);
        console.log("price ", price);
        assertTrue(collar.minters(address(hood)), "hoodochi is collar minter");

        // 1. mint
        vm.prank(player);
        hood.mint{value: price}(1);
        uint256 id = hood.totalMinted();
        assertEq(hood.ownerOf(id), player, "minted to player");

        // 2. collar
        vm.prank(player);
        hood.setCollar(id, NVDA);
        uint256 cid = hood.collarOf(id);
        assertGt(cid, 0, "collar minted");
        assertEq(collar.ownerOf(cid), address(hood), "collar in escrow");

        // 3. stake, transfer locked
        vm.prank(player);
        hood.stake(id);
        assertTrue(hood.isStaked(id), "staked");
        vm.prank(player);
        vm.expectRevert();
        hood.transferFrom(player, address(0xCAFE), id);

        // 4. keeper settles a +1.5 sigma week with 1000 yield units
        uint256[] memory ids = new uint256[](1);
        int16[] memory z = new int16[](1);
        uint256[] memory units = new uint256[](1);
        ids[0] = id;
        z[0] = 15;
        units[0] = 1000;
        vm.prank(player);
        vm.expectRevert();
        hood.settleWeek(ids, z, units); // not the keeper
        vm.prank(keeper);
        hood.settleWeek(ids, z, units);
        uint8 lvl = hood.levelOf(id); // sum of tiers: exactly one item, tier 1..4
        assertTrue(lvl >= 1 && lvl <= 4, "one item after an up week");
        console.log("item tier after +1.5 sigma", lvl);
        assertTrue(hood.isAlive(id), "alive");
        assertEq(hood.pendingYield(id), 1000, "yield pending");

        // 5. claim to the ledger
        vm.prank(player);
        hood.claim(id);
        assertEq(hood.ledger(player, NVDA), 1000, "ledger credited");
        assertEq(hood.pendingYield(id), 0, "pending cleared");

        // 6. fatal week
        z[0] = -30;
        units[0] = 0;
        vm.prank(keeper);
        hood.settleWeek(ids, z, units);
        assertFalse(hood.isAlive(id), "dead after -3 sigma");
        assertEq(hood.levelOf(id), 0, "items burned");
        assertFalse(hood.isStaked(id), "unstaked on death");

        // 7. owner withdraws the mint proceeds
        address owner = hood.owner();
        uint256 before = owner.balance;
        vm.prank(owner);
        hood.withdraw(payable(owner));
        assertEq(owner.balance - before, price, "proceeds withdrawn");
        console.log("tokenURI", hood.tokenURI(id));
    }
}

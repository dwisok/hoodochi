// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {Collar} from "../src/Collar.sol";
import {Hoodochi} from "../src/Hoodochi.sol";

contract HoodochiTest is Test {
    Collar collar;
    Hoodochi hood;

    address keeper = address(0xCAFE);
    address alice = address(0xA11CE);
    address bob = address(0xB0B);
    uint256 constant PRICE = 0.002 ether;

    function setUp() public {
        collar = new Collar();
        hood = new Hoodochi(collar, keeper, PRICE, keccak256("provenance"), "https://api.hoodochi.io/token/");
        collar.setMinter(address(hood), true);
        vm.deal(alice, 1 ether);
        vm.deal(bob, 1 ether);
    }

    function _mint(address who) internal returns (uint256 id) {
        vm.prank(who);
        hood.mint{value: PRICE}(1);
        id = hood.nextId() - 1;
    }

    function _collarAndStake(address who, uint256 id, bytes8 t) internal {
        vm.startPrank(who);
        hood.setCollar(id, t);
        hood.stake(id);
        vm.stopPrank();
    }

    function _settle(uint256 id, int16 z10, uint256 units) internal {
        uint256[] memory ids = new uint256[](1);
        int16[] memory z = new int16[](1);
        uint256[] memory u = new uint256[](1);
        ids[0] = id;
        z[0] = z10;
        u[0] = units;
        vm.prank(keeper);
        hood.settleWeek(ids, z, u);
    }

    // ---- mint ---------------------------------------------------------------
    function test_mintPriceAndSupply() public {
        uint256 id = _mint(alice);
        assertEq(hood.ownerOf(id), alice);
        assertEq(hood.totalMinted(), 1);
        assertEq(address(hood).balance, PRICE);

        vm.prank(alice);
        vm.expectRevert(Hoodochi.WrongPrice.selector);
        hood.mint{value: PRICE - 1}(1);

        vm.prank(alice);
        vm.expectRevert(Hoodochi.TooMany.selector);
        hood.mint{value: PRICE * 6}(6);

        assertEq(hood.tokenURI(id), "https://api.hoodochi.io/token/1");
    }

    function test_withdraw() public {
        _mint(alice);
        address payable to = payable(address(0xD00D));
        hood.withdraw(to);
        assertEq(to.balance, PRICE);
    }

    // ---- collar -------------------------------------------------------------
    function test_setCollarMintsIntoEscrow() public {
        uint256 id = _mint(alice);
        vm.prank(alice);
        hood.setCollar(id, bytes8("NVDA"));
        uint256 c = hood.collarOf(id);
        assertEq(collar.ownerOf(c), address(hood));
        assertEq(collar.tickerString(c), "NVDA");

        // swap: old collar goes back to alice
        vm.prank(alice);
        hood.setCollar(id, bytes8("TSLA"));
        assertEq(collar.ownerOf(c), alice);
        assertEq(collar.tickerString(hood.collarOf(id)), "TSLA");
    }

    function test_badTickerRejected() public {
        uint256 id = _mint(alice);
        vm.startPrank(alice);
        vm.expectRevert(Hoodochi.BadTicker.selector);
        hood.setCollar(id, bytes8("nvda"));
        vm.expectRevert(Hoodochi.BadTicker.selector);
        hood.setCollar(id, bytes8("NV DA"));
        vm.stopPrank();
    }

    function test_notYours() public {
        uint256 id = _mint(alice);
        vm.prank(bob);
        vm.expectRevert(Hoodochi.NotYours.selector);
        hood.setCollar(id, bytes8("NVDA"));
    }

    // ---- stake --------------------------------------------------------------
    function test_stakeNeedsCollarAndLocksTransfer() public {
        uint256 id = _mint(alice);
        vm.prank(alice);
        vm.expectRevert(Hoodochi.NoCollar.selector);
        hood.stake(id);

        _collarAndStake(alice, id, bytes8("NVDA"));
        assertTrue(hood.isStaked(id));

        vm.prank(alice);
        vm.expectRevert(Hoodochi.TransferLocked.selector);
        hood.transferFrom(alice, bob, id);

        vm.prank(alice);
        vm.expectRevert(Hoodochi.Staked.selector);
        hood.setCollar(id, bytes8("TSLA"));

        vm.prank(alice);
        hood.unstake(id);
        vm.prank(alice);
        hood.transferFrom(alice, bob, id);
        assertEq(hood.ownerOf(id), bob);
    }

    // ---- friday -------------------------------------------------------------
    function test_upWeekGivesOneItemAndYield() public {
        uint256 id = _mint(alice);
        _collarAndStake(alice, id, bytes8("NVDA"));
        _settle(id, 9, 1_500_000); // +0.9σ → tier 2
        (,,,, uint32 weeksPlayed, uint8[5] memory slots, uint8 level,, uint256 pending,) = hood.petOf(id);
        assertEq(weeksPlayed, 1);
        assertEq(level, 2);
        uint8 filled;
        for (uint256 i; i < 5; i++) {
            if (slots[i] != 0) filled++;
        }
        assertEq(filled, 1);
        assertEq(pending, 1_500_000);
    }

    function test_flatWeekGivesNothing() public {
        uint256 id = _mint(alice);
        _collarAndStake(alice, id, bytes8("KO"));
        _settle(id, 1, 0);
        assertEq(hood.levelOf(id), 0);
        assertTrue(hood.isAlive(id));
    }

    function test_badWeekKeepsItems() public {
        uint256 id = _mint(alice);
        _collarAndStake(alice, id, bytes8("KO"));
        _settle(id, 25, 0); // tier 4
        assertEq(hood.levelOf(id), 4);
        _settle(id, -12, 0); // down, not dead
        assertEq(hood.levelOf(id), 4);
        assertTrue(hood.isAlive(id));
    }

    function test_itemsOnlyUpgrade() public {
        uint256 id = _mint(alice);
        _collarAndStake(alice, id, bytes8("AMD"));
        for (uint256 i; i < 5; i++) _settle(id, 25, 0); // fill all five slots at tier 4
        assertEq(hood.levelOf(id), 20);
        _settle(id, 25, 0); // nothing left to wear: no change, no revert
        assertEq(hood.levelOf(id), 20);
    }

    function test_deathBurnsItemsAndUnstakes() public {
        uint256 id = _mint(alice);
        _collarAndStake(alice, id, bytes8("GME"));
        _settle(id, 15, 0);
        assertEq(hood.levelOf(id), 3);
        _settle(id, -20, 0);
        assertFalse(hood.isAlive(id));
        assertFalse(hood.isStaked(id));
        assertEq(hood.levelOf(id), 0);
        (,,,,,,,,, bytes8 deathTicker) = hood.petOf(id);
        assertEq(deathTicker, bytes8("GME"));

        // dead: cannot collar or stake again; collar frozen by default
        vm.startPrank(alice);
        vm.expectRevert(Hoodochi.Dead.selector);
        hood.setCollar(id, bytes8("NVDA"));
        vm.expectRevert(Hoodochi.CollarFrozen.selector);
        hood.removeCollar(id);
        vm.stopPrank();

        hood.setDeathPolicy(Hoodochi.DeathPolicy.Released);
        vm.prank(alice);
        hood.removeCollar(id);
        assertEq(collar.ownerOf(1), alice);
    }

    function test_settleSkipsUnstakedAndDead() public {
        uint256 a = _mint(alice);
        uint256 b = _mint(bob);
        _collarAndStake(alice, a, bytes8("NVDA"));
        vm.prank(bob);
        hood.setCollar(b, bytes8("NVDA")); // collared, not staked
        uint256[] memory ids = new uint256[](2);
        int16[] memory z = new int16[](2);
        uint256[] memory u = new uint256[](2);
        ids[0] = a;
        ids[1] = b;
        z[0] = 9;
        z[1] = 9;
        u[0] = 10;
        u[1] = 10;
        vm.prank(keeper);
        hood.settleWeek(ids, z, u);
        assertEq(hood.pendingYield(a), 10);
        assertEq(hood.pendingYield(b), 0);
    }

    function test_onlyKeeperSettles() public {
        uint256 id = _mint(alice);
        _collarAndStake(alice, id, bytes8("NVDA"));
        uint256[] memory ids = new uint256[](1);
        int16[] memory z = new int16[](1);
        uint256[] memory u = new uint256[](1);
        ids[0] = id;
        vm.prank(alice);
        vm.expectRevert(Hoodochi.NotKeeper.selector);
        hood.settleWeek(ids, z, u);
    }

    // ---- claim --------------------------------------------------------------
    function test_claimGoesToLedgerByTicker() public {
        uint256 id = _mint(alice);
        _collarAndStake(alice, id, bytes8("NVDA"));
        _settle(id, 9, 1_000_000);
        _settle(id, 9, 500_000);
        vm.prank(alice);
        hood.claim(id);
        assertEq(hood.pendingYield(id), 0);
        assertEq(hood.claimedYield(id), 1_500_000);
        assertEq(hood.ledger(alice, bytes8("NVDA")), 1_500_000);
    }

    function test_claimAfterDeathUsesDeathTicker() public {
        uint256 id = _mint(alice);
        _collarAndStake(alice, id, bytes8("GME"));
        _settle(id, 9, 700);
        _settle(id, -30, 0);
        vm.prank(alice);
        hood.claim(id);
        assertEq(hood.ledger(alice, bytes8("GME")), 700);
    }

    function test_thresholdsAdjustable() public {
        int16[4] memory t = [int16(5), int16(10), int16(15), int16(25)];
        hood.setThresholds(t, -20);
        uint256 id = _mint(alice);
        _collarAndStake(alice, id, bytes8("NVDA"));
        _settle(id, 4, 0); // below new tier-1 threshold
        assertEq(hood.levelOf(id), 0);
        _settle(id, -16, 0); // above new death threshold
        assertTrue(hood.isAlive(id));
    }

    function test_collarTokenURI() public {
        uint256 id = _mint(alice);
        vm.prank(alice);
        hood.setCollar(id, bytes8("KO"));
        assertGt(bytes(collar.tokenURI(1)).length, 100);
    }
}

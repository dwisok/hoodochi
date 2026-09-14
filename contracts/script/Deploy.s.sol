// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {Collar} from "../src/Collar.sol";
import {Hoodochi} from "../src/Hoodochi.sol";

/// forge script script/Deploy.s.sol --rpc-url robinhood_testnet --broadcast --verify --verifier blockscout
contract Deploy is Script {
    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        address keeper = vm.envOr("KEEPER", vm.addr(pk));
        uint256 mintPrice = vm.envUint("MINT_PRICE_WEI"); // $5 at today's ETH price
        bytes32 provenance = vm.envBytes32("PROVENANCE"); // collection.json → provenance
        string memory baseURI = vm.envOr("BASE_URI", string("https://api.hoodochi.io/token/"));

        vm.startBroadcast(pk);
        Collar collar = new Collar();
        Hoodochi hoodochi = new Hoodochi(collar, keeper, mintPrice, provenance, baseURI);
        collar.setMinter(address(hoodochi), true);
        vm.stopBroadcast();

        console.log("Collar   ", address(collar));
        console.log("Hoodochi ", address(hoodochi));
        console.log("Keeper   ", keeper);
        console.log("Price wei", mintPrice);
    }
}

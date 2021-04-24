// SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import "./aggregators/Aggregator.sol";

// A stub for an RRP dAPI contract
// When the user wants to deploy a dAPI contract, they inherit the specific
// aggregator contract such as:
//       contract myRrpDapi is rrpDapi, Median {
//           // Any specific implementation required
//       }
abstract contract rrpDapi is Aggregator {
    // TODO: Implement
}

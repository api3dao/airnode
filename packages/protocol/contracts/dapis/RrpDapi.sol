// SPDX-License-Identifier: MIT
pragma solidity 0.8.4;

import "./reducers/Reducer.sol";

// A stub for an RRP dAPI contract
// When the user wants to deploy a dAPI contract, they inherit the specific
// reducer contract such as:
//       contract myRrpDapi is rrpDapi, Median {
//           // Any specific implementation required
//       }
abstract contract RrpDapi is Reducer {
  // TODO: Implement
}

// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "@openzeppelin/contracts/utils/Multicall.sol";

contract ExtendedMulticall is Multicall {
    function getBalance(address account) external view returns (uint256) {
        return account.balance;
    }

    function getCurrentBlockTimestamp() external view returns (uint256) {
        return block.timestamp;
    }
}

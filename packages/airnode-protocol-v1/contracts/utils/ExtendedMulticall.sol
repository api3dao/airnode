// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "@openzeppelin/contracts/utils/Multicall.sol";

contract ExtendedMulticall is Multicall {
    function getChainId() external view returns (uint256) {
        return block.chainid;
    }

    function getBalance(address account) external view returns (uint256) {
        return account.balance;
    }

    function getBlockNumber() external view returns (uint256) {
        return block.number;
    }

    function getBlockTimestamp() external view returns (uint256) {
        return block.timestamp;
    }

    function getBlockBasefee() external view returns (uint256) {
        return block.basefee;
    }
}

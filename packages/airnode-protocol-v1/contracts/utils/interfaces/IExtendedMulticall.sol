// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "./IMulticall.sol";

interface IExtendedMulticall is IMulticall {
    function getChainId() external view returns (uint256);

    function getBalance(address account) external view returns (uint256);

    function getBlockNumber() external view returns (uint256);

    function getBlockTimestamp() external view returns (uint256);

    function getBlockBasefee() external view returns (uint256);
}

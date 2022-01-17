// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

interface IRequesterAuthorizerRegistryReader {
    function requesterAuthorizerRegistry() external view returns (address);
}

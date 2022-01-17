// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

interface IAirnodeEndpointFeeRegistryReader {
    function airnodeEndpointFeeRegistry() external view returns (address);
}

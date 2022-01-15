// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "./IAirnodePspV1.sol";

interface IAirnodeProtocolV1 is IAirnodePspV1 {
    function verifySignature(
        bytes32 templateId,
        bytes calldata parameters,
        uint256 timestamp,
        bytes calldata data,
        bytes calldata signature
    ) external view returns (bytes32 requestHash, address airnode);
}

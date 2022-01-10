// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "./AirnodeUser.sol";
import "./interfaces/IAirnodeRequester.sol";

/// @title Contract to be inherited to interact with the Airnode protocol
contract AirnodeRequester is AirnodeUser, IAirnodeRequester {
    /// @dev Reverts if the sender is not the Airnode protocol contract. Use
    /// this modifier with `fulfillRrp()` and `fulfillPsp()` implementations.
    /// that are meant to receive Airnode request or subscription fulfillments.
    modifier onlyAirnodeProtocol() {
        require(
            msg.sender == address(airnodeProtocol),
            "Sender not Airnode protocol"
        );
        _;
    }

    /// @dev Reverts if the signature is not valid for the given `templateId`,
    /// `parameters`, `timestamp` and `data`
    modifier onlyValidSignature(
        bytes32 templateId,
        bytes calldata parameters,
        uint256 timestamp,
        bytes calldata data,
        bytes calldata signature
    ) {
        IAirnodeProtocol(airnodeProtocol).verifyData(
            templateId,
            parameters,
            timestamp,
            data,
            signature
        );
        _;
    }

    /// @dev Reverts if the timestamp is not at most 1 hour old
    /// @param timestamp Timestamp used in the signature
    modifier onlyFreshTimestamp(uint256 timestamp) {
        require(timestamp + 1 hours > block.timestamp, "Timestamp stale");
        require(timestamp < block.timestamp, "Timestamp from future");
        _;
    }

    /// @param _airnodeProtocol AirnodeProtocol contract address
    constructor(address _airnodeProtocol) AirnodeUser(_airnodeProtocol) {}
}

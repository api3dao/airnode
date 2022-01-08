// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "./interfaces/IAirnodeProtocol.sol";
import "./interfaces/IAirnodeUser.sol";

/// @title Contract to be inherited to interact with the Airnode protocol
contract AirnodeUser is IAirnodeUser {
    /// @notice AirnodeProtocol contract address
    address public immutable override airnodeProtocol;

    /// @dev Reverts if the sender is not the Airnode protocol contract or if
    /// the signature is not at most 1 hour old. Use this modifier with methods
    /// that are meant to receive Airnode request or subscription fulfillments.
    /// The signature age is checked to confirm that:
    /// (1) The fulfillment was confirmed in less than an hour
    /// (2) The sponsor wallet address was attested to less than an hour ago
    /// @param timestamp Timestamp used in the signature
    modifier onlyValidAirnodeFulfillment(uint256 timestamp) {
        require(
            msg.sender == address(airnodeProtocol),
            "Sender not Airnode protocol"
        );
        require(timestamp + 1 hours > block.timestamp, "Fulfillment stale");
        require(timestamp < block.timestamp, "Fulfillment from future");
        _;
    }

    /// @param _airnodeProtocol AirnodeProtocol contract address
    constructor(address _airnodeProtocol) {
        require(
            _airnodeProtocol != address(0),
            "Airnode protocol address zero"
        );
        airnodeProtocol = _airnodeProtocol;
    }
}

// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "./AirnodeUser.sol";
import "./interfaces/IAirnodeRequester.sol";

/// @title Contract to be inherited to make Airnode requests and receive
/// fulfillments
contract AirnodeRequester is AirnodeUser, IAirnodeRequester {
    /// @dev Reverts if the sender is not the Airnode protocol contract. Use
    /// this modifier with `fulfillRrp()` and `fulfillPsp()` implementations.
    /// that are meant to receive Airnode request or subscription fulfillments.
    /// Reverts if the timestamp is not at most 1 hour old, which is
    /// appropriate in most cases. Adjust this in your implementation at your
    /// own risk.
    /// @param timestamp Timestamp used in the signature
    modifier onlyValidAirnodeFulfillment(uint256 timestamp) {
        require(
            msg.sender == address(airnodeProtocol),
            "Sender not Airnode protocol"
        );
        require(timestamp + 1 hours > block.timestamp, "Timestamp stale");
        require(timestamp < block.timestamp, "Timestamp from future");
        _;
    }

    /// @param _airnodeProtocol AirnodeProtocol contract address
    constructor(address _airnodeProtocol) AirnodeUser(_airnodeProtocol) {}
}

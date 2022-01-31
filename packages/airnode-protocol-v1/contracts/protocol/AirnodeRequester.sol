// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "./interfaces/IAirnodeProtocol.sol";
import "./interfaces/IAirnodeRequester.sol";

/// @title Contract to be inherited to make Airnode requests and receive
/// fulfillments
contract AirnodeRequester is IAirnodeRequester {
    /// @notice AirnodeProtocol contract address
    address public immutable override airnodeProtocol;

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

    /// @dev Reverts if the timestamp is not valid
    /// @param timestamp Timestamp used in the signature
    modifier onlyValidTimestamp(uint256 timestamp) {
        require(timestampIsValid(timestamp), "Timestamp not valid");
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

    /// @notice Returns if the timestamp used in the signature is valid
    /// @dev Returns `false` if the timestamp is not at most 1 hour old to
    /// prevent replays. Returns `false` if the timestamp is not from the past,
    /// with some leeway to accomodate for minimal time drift. These values are
    /// appropriate in most cases, adjust them in your implementation at your
    /// own risk.
    /// @param timestamp Timestamp used in the signature
    function timestampIsValid(uint256 timestamp) internal view returns (bool) {
        return
            timestamp + 1 hours > block.timestamp &&
            timestamp < block.timestamp + 15 minutes;
    }
}

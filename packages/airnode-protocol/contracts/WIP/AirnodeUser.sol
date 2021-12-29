// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "./interfaces/IAirnodeProtocol.sol";
import "./interfaces/IAirnodeUser.sol";

/// @title Contract to be inherited to interact with the Airnode protocol
contract AirnodeUser is IAirnodeUser {
    /// @notice AirnodeProtocol contract address
    address public immutable override airnodeProtocol;

    /// @dev Reverts if the sender is not the Airnode protocol contract
    modifier onlyAirnodeProtocol() {
        require(
            msg.sender == address(airnodeProtocol),
            "Sender not Airnode protocol"
        );
        _;
    }

    /// @dev AirnodeUser is made its own sponsor by default. AirnodeUser can
    /// also be sponsored by others and use these sponsorships while making
    /// requests, i.e., using this default sponsorship is optional.
    /// @param _airnodeProtocol AirnodeProtocol contract address
    constructor(address _airnodeProtocol) {
        require(
            _airnodeProtocol != address(0),
            "Airnode protocol address zero"
        );
        airnodeProtocol = _airnodeProtocol;
        IAirnodeProtocol(_airnodeProtocol).initializeRole(
            IAirnodeProtocol(_airnodeProtocol).deriveRootRole(address(this)),
            IAirnodeProtocol(_airnodeProtocol)
                .SPONSORED_REQUESTER_ROLE_DESCRIPTION()
        );
    }
}

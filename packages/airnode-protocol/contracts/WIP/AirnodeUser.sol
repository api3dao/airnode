// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "./interfaces/IAirnodeProtocol.sol";
import "./interfaces/IAirnodeUser.sol";

/// @title The contract to be inherited to interact with the Airnode protocol
contract AirnodeUser is IAirnodeUser {
    address public immutable override airnodeProtocol;

    /// @dev Reverts if the sender is not the Airnode protocol contract
    modifier onlyAirnodeProtocol() {
        require(
            msg.sender == address(airnodeProtocol),
            "Sender not Airnode protocol"
        );
        _;
    }

    /// @dev Airnode protocol contract address is set at deployment and is
    /// immutable. AirnodeUser is made its own sponsor by default. AirnodeUser
    /// can also be sponsored by others and use these sponsorships while making
    /// requests, i.e., using this default sponsorship is optional.
    /// @param _airnodeProtocol Airnode RRP contract address
    constructor(address _airnodeProtocol) {
        require(
            _airnodeProtocol != address(0),
            "Airnode protocol address zero"
        );
        airnodeProtocol = _airnodeProtocol;
        IAirnodeProtocol(_airnodeProtocol).setSponsorshipStatus(
            address(this),
            true
        );
    }
}

// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "./interfaces/IAirnodeProtocolV1.sol";
import "./interfaces/IAirnodeUser.sol";

/// @title Contract to be inherited to interact with the Airnode protocol
contract AirnodeUser is IAirnodeUser {
    /// @notice AirnodeProtocol contract address
    address public immutable override airnodeProtocol;

    /// @param _airnodeProtocol AirnodeProtocol contract address
    constructor(address _airnodeProtocol) {
        require(
            _airnodeProtocol != address(0),
            "Airnode protocol address zero"
        );
        airnodeProtocol = _airnodeProtocol;
    }
}

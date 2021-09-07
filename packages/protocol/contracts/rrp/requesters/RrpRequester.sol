// SPDX-License-Identifier: MIT
pragma solidity 0.8.6;

import "../interfaces/IAirnodeRrp.sol";

/// @title The contract to be inherited from to use Airnode to make requests
contract RrpRequester {
    IAirnodeRrp public immutable airnodeRrp;

    /// @dev Reverts if the caller is not the Airnode RRP contract
    /// Use it as a modifier for fulfill and error callback methods
    modifier onlyAirnodeRrp() {
        require(msg.sender == address(airnodeRrp), "Caller not Airnode RRP");
        _;
    }

    /// @dev Airnode RRP address is set at deployment and is immutable.
    /// RrpRequester is made its own sponsor by default. RrpRequester can also
    /// be sponsored by others and use these sponsorships while making
    /// requests, i.e., using this default sponsorship is optional.
    /// @param airnodeRrpAddress Airnode RRP contract address
    constructor(address airnodeRrpAddress) {
        airnodeRrp = IAirnodeRrp(airnodeRrpAddress);
        IAirnodeRrp(airnodeRrpAddress).setSponsorshipStatus(
            address(this),
            true
        );
    }
}

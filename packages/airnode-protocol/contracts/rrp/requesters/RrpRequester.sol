// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../interfaces/IAirnodeRrp.sol";

/// @title The contract to be inherited to make Airnode RRP requests
contract RrpRequester {
    IAirnodeRrp public immutable airnodeRrp;

    /// @dev Reverts if the caller is not the Airnode RRP contract.
    /// Use it as a modifier for fulfill and error callback methods, but also
    /// check `requestId`.
    modifier onlyAirnodeRrp() {
        require(msg.sender == address(airnodeRrp), "Caller not Airnode RRP");
        _;
    }

    /// @dev Airnode RRP address is set at deployment and is immutable.
    /// RrpRequester is made its own sponsor by default. RrpRequester can also
    /// be sponsored by others and use these sponsorships while making
    /// requests, i.e., using this default sponsorship is optional.
    /// @param _airnodeRrp Airnode RRP contract address
    constructor(address _airnodeRrp) {
        airnodeRrp = IAirnodeRrp(_airnodeRrp);
        IAirnodeRrp(_airnodeRrp).setSponsorshipStatus(address(this), true);
    }
}

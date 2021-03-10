// SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import "./interfaces/IAirnode.sol";

/// @title The contract to be inherited from to use Airnode to make requests
contract AirnodeClient {
    IAirnode public airnode;

    /// @dev Reverts if the caller is not the Airnode contract
    /// Use it as a modifier for fulfill and error callback methods
    modifier onlyAirnode()
    {
        require(
            msg.sender == address(airnode),
            "Caller not the Airnode contract"
            );
        _;
    }

    /// @dev Airnode address is set at deployment. If you need to be able to
    /// update it, you will have to implement that functionality (and probably
    /// put it behind onlyOwner).
    /// @param airnodeAddress Airnode contract address
    constructor (address airnodeAddress)
    {
        airnode = IAirnode(airnodeAddress);
    }
}

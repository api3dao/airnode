// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;

import "./interfaces/IAirnodeClient.sol";
import "./interfaces/IAirnode.sol";


/// @title The contract to be inherited from to use Airnode to make requests
contract AirnodeClient is IAirnodeClient {
    IAirnode public airnode;

    /// @dev Airnode address is set at deployment. If you need to be able to
    /// update them, you will have to implement that functionality (and
    /// probably put it behind onlyOwner).
    /// @param _airnode Airnode contract address
    constructor (address _airnode)
        public
    {
        airnode = IAirnode(_airnode);
    }

    /// @notice Returns the Airnode contract address used by this client
    /// @return _airnodeAddress Airnode contract address
    function airnodeAddress()
        external
        view
        override
        returns(address _airnodeAddress)
    {
        _airnodeAddress = address(airnode);
    }

    /// @dev Reverts if the caller is not the Airnode contract
    /// Use it as a modifier for fulfill and error callback methods
    modifier onlyAirnode()
    {
        require(
            msg.sender == address(airnode),
            "Can only be called by the designated Airnode contract"
            );
        _;
    }
}

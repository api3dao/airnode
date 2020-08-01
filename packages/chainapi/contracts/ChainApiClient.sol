// SPDX-License-Identifier: MIT
pragma solidity 0.6.8;

import "./interfaces/IChainApiClient.sol";
import "./interfaces/IChainApi.sol";
import "./interfaces/IRequesterStore.sol";


/// @title The contract to be inherited from to use ChainApi to make requests
/// @notice In addition to referencing the ChainApi contract instance it uses,
/// the contract authorizes a requester to endorse it by announcing its
/// ID at requesterId.
contract ChainApiClient is IChainApiClient {
    IChainApi public chainApi;

    /// @dev ChainApi address and the endorser ID are set at deployment. If you
    /// need to be able to update them, you will have to implement that
    /// functionality (and probably put it behind onlyOwner).
    /// @param _chainApi ChainApi contract address
    /// @param _requesterId Requester ID from RequestStore
    constructor (
        address _chainApi,
        bytes32 _requesterId
        )
        public
    {
        chainApi = IChainApi(_chainApi);
        IRequesterStore requesterStore = IRequesterStore(_chainApi);
        requesterStore.updateEndorsementPermission(_requesterId);
    }

    /// @notice Returns the ChainApi contract address used by this client
    /// @return _chainApiAddress ChainApi contract address
    function chainApiAddress()
        external
        view
        override
        returns(address _chainApiAddress)
    {
        _chainApiAddress = address(chainApi);
    }

    /// @dev Reverts if the caller is not the ChainAPI contract
    /// Use it as a modifier for fulfill and error callback methods
    modifier onlyChainApi()
    {
        require(
            msg.sender == address(chainApi),
            "Can only be called by the designated ChainAPI contract"
            );
        _;
    }
}

// SPDX-License-Identifier: MIT
pragma solidity 0.6.8;

import "./interfaces/ClientInterface.sol";
import "./interfaces/ChainApiInterface.sol";


/// @title The contract to be inherited from to use ChainApi to make requests
/// @notice In addition to referencing the ChainApi contract instance it uses,
/// the contract authorizes a requester to endorse it by announcing its
/// ID at requesterId.
contract Client is ClientInterface {
    ChainApiInterface public chainApi;
    bytes32 public override requesterId;

    /// @dev ChainApi address and the endorser ID are set at deployment. If you
    /// need to be able to update them, you will have to implement that
    /// functionality.
    /// @param _chainApi ChainApi contract address
    /// @param _requesterId Endorser ID from RequestStore
    constructor (
        address _chainApi,
        bytes32 _requesterId
        )
        public
    {
        chainApi = ChainApiInterface(_chainApi);
        requesterId = _requesterId;
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

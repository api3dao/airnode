// SPDX-License-Identifier: MIT
pragma solidity 0.6.8;

import "./interfaces/Client.sol";
import "./interfaces/ChainApi.sol";


/// @title An example ChainAPI client contract
/// @notice The contract authorizes a requester to endorse it by announcing its
/// ID at endorserId
contract ExampleClient is Client {
    ChainApi public chainApi;
    bytes32 public override endorserId;
    bytes32 public data;
    bytes32 public requestId;

    constructor (
        address _chainApi,
        bytes32 _endorserId
        )
        public
    {
        chainApi = ChainApi(_chainApi);
        endorserId = _endorserId;
    }

    /// @notice Called to make a request to the ChainAPI contract
    /// @param providerId Provider ID
    /// @param templateId Template ID
    /// @param parameters Runtime parameters in addition to the ones defines in
    /// the template addressed by templateId
    function request(
        bytes32 providerId,
        bytes32 templateId,
        bytes calldata parameters
        )
        external
    {
        requestId = chainApi.makeRequest(
            providerId,
            templateId,
            address(this),
            this.fulfill.selector,
            parameters
            );
    }

    /// @notice Called by the provider wallet through the ChainAPI contract to
    /// deliver the response
    /// @param _requestId Request ID
    /// @param _data Data returned by the provider
    function fulfill(
        bytes32 _requestId,
        bytes32 _data
        )
        external
        onlyChainApi()
    {
        require(
            _requestId == requestId,
            "Example request ID check"
            );
        data = _data;
    }

    /// @dev Reverts if the caller is not the ChainAPI contract
    modifier onlyChainApi()
    {
        require(
            msg.sender == address(chainApi),
            "Can only be called by the ChainAPI contract"
            );
        _;
    }
}

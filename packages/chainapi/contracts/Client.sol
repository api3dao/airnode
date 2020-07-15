// SPDX-License-Identifier: MIT
pragma solidity 0.6.8;

import "./interfaces/ClientInterface.sol";
import "./interfaces/ChainApiInterface.sol";


contract Client is ClientInterface {
    ChainApiInterface public chainApi;
    bytes32 public override endorserId;


    constructor (
        address _chainApi,
        bytes32 _endorserId
        )
        public
    {
        chainApi = ChainApiInterface(_chainApi);
        endorserId = _endorserId;
    }

    function chainApiAddress()
        external
        view
        override
        returns(address _chainApiAddress)
    {
        _chainApiAddress = address(chainApi);
    }

    /// @dev Reverts if the caller is not the ChainAPI contract
    modifier onlyChainApi()
    {
        require(
            msg.sender == address(chainApi),
            "Can only be called by the designated ChainAPI contract"
            );
        _;
    }
}

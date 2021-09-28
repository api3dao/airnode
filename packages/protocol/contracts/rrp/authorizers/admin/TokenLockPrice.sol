// SPDX-License-Identifier: MIT
pragma solidity 0.8.6;

import "../../../adminnable/Adminnable.sol";
import "./interfaces/ITokenLockPrice.sol";

/// @title Contract that is used to fetch the price for calculating
/// the amount of tokens to be locked.
/// @notice An oracle contract can be used to update the price of API3
/// within this contract
contract TokenLockPrice is Adminnable, ITokenLockPrice {
    enum AdminRank {
        Unauthorized,
        Admin
    }

    /// @dev The price of API3 in terms of USD
    uint256 public api3PriceInUsd;
    /// @dev The default amount of tokens to be locked in USD value
    uint256 public tokenLockAmountInUsd;
    /// @dev The amount of tokens to be locked for each chains in USD value
    mapping(uint256 => uint256) public chainIdToTokenLockAmountInUsd;
    /// @dev mapping used to store all the oracle addresses
    mapping(address => bool) public isOracle;

    /// @dev Reverts if the caller is not an Oracle
    modifier onlyOracle() {
        require(isOracle[msg.sender], "Caller not Oracle");
        _;
    }

    /// @dev Called by an admin or higher rank to set the status of an oracle address
    /// @param _oracle The address of the oracle that can update the price
    /// @param _status The status to be set
    function setOracle(address _oracle, bool _status)
        external
        override
        onlyWithRank(uint256(AdminRank.Admin))
    {
        isOracle[_oracle] = _status;
        emit SetOracle(_oracle, _status);
    }

    /// @dev Called by an admin or higher rank to set the default tokenLockAmountInUsd
    /// @param _tokenLockAmountInUsd The Token Lock amount in terms of USD value
    function setTokenLockAmount(uint256 _tokenLockAmountInUsd)
        external
        override
        onlyWithRank(uint256(AdminRank.Admin))
    {
        tokenLockAmountInUsd = _tokenLockAmountInUsd;
        emit SetTokenLockAmount(_tokenLockAmountInUsd);
    }

    /// @dev Called by an admin or higher rank to set the amount of tokens to be
    /// locked for a specific chain
    /// @param _tokenLockAmountInUsd The Token Lock amount in terms of USD value
    /// @param _chainId The chainId of the chain
    function setTokenLockAmount(uint256 _tokenLockAmountInUsd, uint256 _chainId)
        external
        override
        onlyWithRank(uint256(AdminRank.Admin))
    {
        chainIdToTokenLockAmountInUsd[_chainId] = _tokenLockAmountInUsd;
        emit SetTokenLockAmount(_tokenLockAmountInUsd, _chainId);
    }

    /// @dev Called to get the total amount of tokens to be locked for a specific chain
    /// @notice reverts to the default token lock amount if the token lock amount for a chain is not
    /// specified
    /// @param chainId The chainId of the chain
    function getTokenLockAmount(uint256 chainId)
        external
        view
        override
        returns (uint256)
    {
        if (chainIdToTokenLockAmountInUsd[chainId] != 0) {
            return chainIdToTokenLockAmountInUsd[chainId] / api3PriceInUsd;
        } else {
            return tokenLockAmountInUsd / api3PriceInUsd;
        }
    }

    /// @dev Called by an oracle address to update the price of API in USD
    /// @param _api3PriceInUsd The price of API in USD
    function updateApi3Price(uint256 _api3PriceInUsd)
        external
        override
        onlyOracle
    {
        api3PriceInUsd = _api3PriceInUsd;
        emit UpdatedApi3Price(_api3PriceInUsd);
    }
}

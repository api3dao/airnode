// SPDX-License-Identifier: MIT
pragma solidity 0.8.6;

interface ITokenLockPrice {
    event SetOracle(address oracle, bool status);

    event SetTokenLockAmount(uint256 tokenLockAmountInUsd);

    event SetTokenLockAmount(uint256 tokenLockAmountInUsd, uint256 chainId);

    event UpdatedApi3Price(uint256 api3PriceInUsd);

    function setOracle(address oracle, bool status) external;

    function setTokenLockAmount(uint256 tokenLockAmountInUsd) external;

    function setTokenLockAmount(uint256 tokenLockAmountInUsd, uint256 chainId)
        external;

    function getTokenLockAmount(uint256 chainId)
        external
        view
        returns (uint256 tokenLockAmountInUsd);

    function updateApi3Price(uint256 api3PriceInUsd) external;
}

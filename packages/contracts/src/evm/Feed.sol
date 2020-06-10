// SPDX-License-Identifier: MIT
pragma solidity 0.6.8;

/// @title An abstract contract that describes the general interface of a
/// data feed contract
/// @notice This contract partially imitates the Chainlink AggregatorInterface.
/// It should be updated as Chainlink makes breaking changes to it if we want
/// to use Chainlink feeds.
abstract contract Feed {
    /// @notice Returns the latest answer received/aggregated at the feed
    /// @dev This has no guarantee of freshness
    /// @return Latest answer received/aggregated at the feed
    function latestAnswer()
        virtual
        external
        view
        returns (int256);
}

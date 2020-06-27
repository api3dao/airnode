// SPDX-License-Identifier: MIT
pragma solidity 0.6.8;

import "../Feed.sol";


/// @title A mock feed contract
/// @notice Use this to simulate an aggregator data feed
contract MockFeed is Feed {
    int256 private data;

    /// @notice Updates data
    /// @param data_ Updated data
    function updateLatestAnswer(int256 data_)
        external
    {
        data = data_;
    }

    /// @notice Returns data as the latest answer
    /// @return data
    function latestAnswer()
        external
        view
        override
        returns (int256)
    {
        return data;
    }
}

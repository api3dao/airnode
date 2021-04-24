// SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import "./Aggregator.sol";

/// @title Mean aggregation contract
/// @notice Mean aggregation result can be skewed even with a single misreport.
/// Therefore, it should either be used in special circumstances or as a part
/// of a more complex aggregation method such as MeanMedianHybrid.sol.
/// @dev Note that there is a potential for overflow while summing large enough
/// values. If that is a probability, use Median.sol instead.
contract Mean is Aggregator {
    /// @notice Aggregates the array of values by computing their median
    /// @param values Values to be aggregated
    function aggregateInplace(int256[] memory values)
        internal
        view
        virtual
        override
        returns (int256)
    {
        int256 mean = 0;
        for (uint256 i = 0; i < values.length; i++) {
          mean += values[i];
        }
        mean /= int256(values.length);
        return mean;
    }
}

// SPDX-License-Identifier: MIT
pragma solidity 0.8.4;

/// @title Mean reduction contract
/// @notice Mean reduction result can be skewed even with a single misreport.
/// Therefore, it should either be used in special circumstances or as a part
/// of a more complex reduction method such as MeanMedianHybrid.sol.
/// @dev Note that there is a potential for overflow while summing large enough
/// values. If that is a probability, use Median.sol instead.
contract Mean {
    /// @notice Reduces the array of values by computing their mean
    /// @param values Values to be reduced
    function computeMean(int256[] memory values)
        internal
        pure
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

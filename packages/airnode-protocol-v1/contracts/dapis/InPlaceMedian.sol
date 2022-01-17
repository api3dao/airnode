// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "./InPlaceSort.sol";

/// @title Contract that sorts an `int256` array in-place and returns the median
contract InPlaceMedian is InPlaceSort {
    /// @notice Called to sort an array in-place and return the median
    /// @dev This will revert if the array to be sorted exceeds the maximum
    /// length
    /// @param values Values to be sorted before returning the median
    /// @return Median of the values in the array
    function computeMedianInPlace(int256[] memory values)
        internal
        pure
        returns (int256)
    {
        uint256 arrayLength = values.length;
        require(arrayLength <= MAX_ARRAY_LENGTH, "Array longer than maximum");
        sortValuesInPlace(values);
        if (arrayLength % 2 == 1) {
            return values[arrayLength / 2];
        }
        // Divide by 2 first to avoid a potential overflow (at the cost of
        // minimal precision)
        return values[arrayLength / 2] / 2 + values[arrayLength / 2 + 1] / 2;
    }
}

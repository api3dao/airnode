// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "./Sort.sol";
import "./QuickSelect.sol";

/// @title Contract that calculates the median of an array
/// @notice The operation will be in-place, i.e., the array provided as the
/// argument will be modified.
contract Median is Sort, Quickselect {
    /// @notice Returns the median of the array
    /// @dev Alternates between different methods for gas cost efficiency
    /// @param array Array whose median is to be calculated
    /// @return Median of the array
    function median(int256[] memory array) internal pure returns (int256) {
        if (array.length <= MAX_SORT_LENGTH) {
            return medianBySort(array);
        } else {
            return medianByQuickselect(array);
        }
    }

    /// @notice Returns the median of the array by sorting it
    /// @param array Array whose median is to be calculated
    /// @return Median of the array
    function medianBySort(int256[] memory array) private pure returns (int256) {
        sort(array);
        uint256 arrayLength = array.length;
        if (arrayLength % 2 == 1) {
            return array[arrayLength / 2];
        }
        return (array[arrayLength / 2 - 1] + array[arrayLength / 2]) / 2;
    }

    /// @notice Returns the median of the array by using quickselect
    /// @param array Array whose median is to be calculated
    /// @return Median of the array
    function medianByQuickselect(int256[] memory array)
        private
        pure
        returns (int256)
    {
        uint256 arrayLength = array.length;
        if (arrayLength % 2 == 1) {
            uint256 mid = quickselectK(array, arrayLength / 2);
            return array[mid];
        }
        (uint256 mid1, uint256 mid2) = quickselectKPlusOne(
            array,
            arrayLength / 2 - 1
        );
        return (array[mid1] + array[mid2]) / 2;
    }
}

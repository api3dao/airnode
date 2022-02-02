// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "./Sort.sol";
import "./QuickSelect.sol";

/// @title Contract that calculates the median of an array
/// @notice The operation will be in-place, i.e., the array provided as the
/// argument will be modified.
contract Median is Sort, Quickselect {
    /// @notice Returns the median of the array
    /// @dev Uses an unrolled sorting implementation for shorter arrays and
    /// quickselect for longer arrays for gas cost efficiency
    /// @param array Array whose median is to be calculated
    /// @return Median of the array
    function median(int256[] memory array) internal pure returns (int256) {
        uint256 arrayLength = array.length;
        if (arrayLength <= MAX_SORT_LENGTH) {
            sort(array);
            if (arrayLength % 2 == 1) {
                return array[arrayLength / 2];
            } else {
                return
                    (array[arrayLength / 2 - 1] + array[arrayLength / 2]) / 2;
            }
        } else {
            if (arrayLength % 2 == 1) {
                return array[quickselectK(array, arrayLength / 2)];
            } else {
                (uint256 mid1, uint256 mid2) = quickselectKPlusOne(
                    array,
                    arrayLength / 2 - 1
                );
                return (array[mid1] + array[mid2]) / 2;
            }
        }
    }
}

// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

/// @title Contract that sorts an `int256` array in-place
/// @dev See the original by Sasa here:
/// https://gist.github.com/bbenligiray/739bed51ba744584252836614e03ee2f
contract InPlaceSort {
    // Consider exposing this value in the inheriting contract
    uint256 internal constant MAX_ARRAY_LENGTH = 13;

    /// @notice Called to sort an array in-place
    /// @param values Values to be sorted
    function sortValuesInPlace(int256[] memory values) internal pure {
        uint256 arrayLength = values.length;
        assert(arrayLength <= MAX_ARRAY_LENGTH);
        // Do a sort of a binary search that favors shorter array lengths
        if (arrayLength < 6) {
            // Possible lengths: 2, 3, 4, 5
            if (arrayLength < 4) {
                // Possible lengths: 2, 3
                if (arrayLength == 2) {
                    // Length: 2
                    swapIfFirstIsLarger(values, 0, 1);
                } else {
                    // Length: 3
                    swapIfFirstIsLarger(values, 0, 1);
                    swapIfFirstIsLarger(values, 1, 2);
                    swapIfFirstIsLarger(values, 0, 1);
                }
            } else {
                // Possible lengths: 4, 5
                if (arrayLength == 4) {
                    // Length: 4
                    swapIfFirstIsLarger(values, 0, 1);
                    swapIfFirstIsLarger(values, 2, 3);
                    swapIfFirstIsLarger(values, 1, 3);
                    swapIfFirstIsLarger(values, 0, 2);
                    swapIfFirstIsLarger(values, 1, 2);
                } else {
                    // Length: 5
                    swapIfFirstIsLarger(values, 1, 2);
                    swapIfFirstIsLarger(values, 3, 4);
                    swapIfFirstIsLarger(values, 1, 3);
                    swapIfFirstIsLarger(values, 0, 2);
                    swapIfFirstIsLarger(values, 2, 4);
                    swapIfFirstIsLarger(values, 0, 3);
                    swapIfFirstIsLarger(values, 0, 1);
                    swapIfFirstIsLarger(values, 2, 3);
                    swapIfFirstIsLarger(values, 1, 2);
                }
            }
        } else if (arrayLength < 10) {
            // Possible lengths: 6, 7, 8, 9
            if (arrayLength < 8) {
                // Possible lengths: 6, 7
                if (arrayLength == 6) {
                    // Length: 6
                    swapIfFirstIsLarger(values, 0, 1);
                    swapIfFirstIsLarger(values, 2, 3);
                    swapIfFirstIsLarger(values, 4, 5);
                    swapIfFirstIsLarger(values, 1, 3);
                    swapIfFirstIsLarger(values, 3, 5);
                    swapIfFirstIsLarger(values, 1, 3);
                    swapIfFirstIsLarger(values, 2, 4);
                    swapIfFirstIsLarger(values, 0, 2);
                    swapIfFirstIsLarger(values, 2, 4);
                    swapIfFirstIsLarger(values, 3, 4);
                    swapIfFirstIsLarger(values, 1, 2);
                    swapIfFirstIsLarger(values, 2, 3);
                } else {
                    // Length: 7
                    swapIfFirstIsLarger(values, 1, 2);
                    swapIfFirstIsLarger(values, 3, 4);
                    swapIfFirstIsLarger(values, 5, 6);
                    swapIfFirstIsLarger(values, 0, 2);
                    swapIfFirstIsLarger(values, 4, 6);
                    swapIfFirstIsLarger(values, 3, 5);
                    swapIfFirstIsLarger(values, 2, 6);
                    swapIfFirstIsLarger(values, 1, 5);
                    swapIfFirstIsLarger(values, 0, 4);
                    swapIfFirstIsLarger(values, 2, 5);
                    swapIfFirstIsLarger(values, 0, 3);
                    swapIfFirstIsLarger(values, 2, 4);
                    swapIfFirstIsLarger(values, 1, 3);
                    swapIfFirstIsLarger(values, 0, 1);
                    swapIfFirstIsLarger(values, 2, 3);
                    swapIfFirstIsLarger(values, 4, 5);
                }
            } else {
                // Possible lengths: 8, 9
                if (arrayLength == 8) {
                    // Length: 8
                    swapIfFirstIsLarger(values, 0, 7);
                    swapIfFirstIsLarger(values, 1, 6);
                    swapIfFirstIsLarger(values, 2, 5);
                    swapIfFirstIsLarger(values, 3, 4);
                    swapIfFirstIsLarger(values, 0, 3);
                    swapIfFirstIsLarger(values, 4, 7);
                    swapIfFirstIsLarger(values, 1, 2);
                    swapIfFirstIsLarger(values, 5, 6);
                    swapIfFirstIsLarger(values, 0, 1);
                    swapIfFirstIsLarger(values, 2, 3);
                    swapIfFirstIsLarger(values, 4, 5);
                    swapIfFirstIsLarger(values, 6, 7);
                    swapIfFirstIsLarger(values, 3, 5);
                    swapIfFirstIsLarger(values, 2, 4);
                    swapIfFirstIsLarger(values, 1, 2);
                    swapIfFirstIsLarger(values, 3, 4);
                    swapIfFirstIsLarger(values, 5, 6);
                    swapIfFirstIsLarger(values, 2, 3);
                    swapIfFirstIsLarger(values, 4, 5);
                } else {
                    // Length: 9
                    swapIfFirstIsLarger(values, 1, 8);
                    swapIfFirstIsLarger(values, 2, 7);
                    swapIfFirstIsLarger(values, 3, 6);
                    swapIfFirstIsLarger(values, 4, 5);
                    swapIfFirstIsLarger(values, 1, 4);
                    swapIfFirstIsLarger(values, 5, 8);
                    swapIfFirstIsLarger(values, 0, 2);
                    swapIfFirstIsLarger(values, 6, 7);
                    swapIfFirstIsLarger(values, 2, 6);
                    swapIfFirstIsLarger(values, 7, 8);
                    swapIfFirstIsLarger(values, 0, 3);
                    swapIfFirstIsLarger(values, 4, 5);
                    swapIfFirstIsLarger(values, 0, 1);
                    swapIfFirstIsLarger(values, 3, 5);
                    swapIfFirstIsLarger(values, 6, 7);
                    swapIfFirstIsLarger(values, 2, 4);
                    swapIfFirstIsLarger(values, 1, 3);
                    swapIfFirstIsLarger(values, 5, 7);
                    swapIfFirstIsLarger(values, 4, 6);
                    swapIfFirstIsLarger(values, 1, 2);
                    swapIfFirstIsLarger(values, 3, 4);
                    swapIfFirstIsLarger(values, 5, 6);
                    swapIfFirstIsLarger(values, 7, 8);
                    swapIfFirstIsLarger(values, 2, 3);
                    swapIfFirstIsLarger(values, 4, 5);
                }
            }
        } else {
            // Possible lengths: 10, 11, 12, 13
            if (arrayLength < 12) {
                // Possible lengths: 10, 11
                if (arrayLength == 10) {
                    // Length: 10
                    swapIfFirstIsLarger(values, 0, 1);
                    swapIfFirstIsLarger(values, 2, 3);
                    swapIfFirstIsLarger(values, 4, 5);
                    swapIfFirstIsLarger(values, 6, 7);
                    swapIfFirstIsLarger(values, 8, 9);
                    swapIfFirstIsLarger(values, 4, 9);
                    swapIfFirstIsLarger(values, 0, 5);
                    swapIfFirstIsLarger(values, 1, 8);
                    swapIfFirstIsLarger(values, 3, 7);
                    swapIfFirstIsLarger(values, 2, 6);
                    swapIfFirstIsLarger(values, 0, 2);
                    swapIfFirstIsLarger(values, 3, 6);
                    swapIfFirstIsLarger(values, 7, 9);
                    swapIfFirstIsLarger(values, 1, 4);
                    swapIfFirstIsLarger(values, 5, 8);
                    swapIfFirstIsLarger(values, 0, 1);
                    swapIfFirstIsLarger(values, 2, 7);
                    swapIfFirstIsLarger(values, 8, 9);
                    swapIfFirstIsLarger(values, 4, 6);
                    swapIfFirstIsLarger(values, 3, 5);
                    swapIfFirstIsLarger(values, 2, 4);
                    swapIfFirstIsLarger(values, 6, 8);
                    swapIfFirstIsLarger(values, 1, 3);
                    swapIfFirstIsLarger(values, 5, 7);
                    swapIfFirstIsLarger(values, 1, 2);
                    swapIfFirstIsLarger(values, 3, 4);
                    swapIfFirstIsLarger(values, 5, 6);
                    swapIfFirstIsLarger(values, 7, 8);
                    swapIfFirstIsLarger(values, 2, 3);
                    swapIfFirstIsLarger(values, 4, 5);
                    swapIfFirstIsLarger(values, 6, 7);
                } else {
                    // Length: 11
                    swapIfFirstIsLarger(values, 0, 9);
                    swapIfFirstIsLarger(values, 1, 8);
                    swapIfFirstIsLarger(values, 2, 7);
                    swapIfFirstIsLarger(values, 3, 6);
                    swapIfFirstIsLarger(values, 4, 5);
                    swapIfFirstIsLarger(values, 0, 3);
                    swapIfFirstIsLarger(values, 1, 2);
                    swapIfFirstIsLarger(values, 4, 10);
                    swapIfFirstIsLarger(values, 6, 9);
                    swapIfFirstIsLarger(values, 7, 8);
                    swapIfFirstIsLarger(values, 0, 1);
                    swapIfFirstIsLarger(values, 2, 3);
                    swapIfFirstIsLarger(values, 5, 8);
                    swapIfFirstIsLarger(values, 9, 10);
                    swapIfFirstIsLarger(values, 6, 7);
                    swapIfFirstIsLarger(values, 1, 2);
                    swapIfFirstIsLarger(values, 4, 6);
                    swapIfFirstIsLarger(values, 8, 10);
                    swapIfFirstIsLarger(values, 5, 9);
                    swapIfFirstIsLarger(values, 0, 4);
                    swapIfFirstIsLarger(values, 7, 8);
                    swapIfFirstIsLarger(values, 1, 5);
                    swapIfFirstIsLarger(values, 2, 9);
                    swapIfFirstIsLarger(values, 3, 6);
                    swapIfFirstIsLarger(values, 1, 4);
                    swapIfFirstIsLarger(values, 5, 7);
                    swapIfFirstIsLarger(values, 2, 3);
                    swapIfFirstIsLarger(values, 6, 9);
                    swapIfFirstIsLarger(values, 2, 4);
                    swapIfFirstIsLarger(values, 6, 7);
                    swapIfFirstIsLarger(values, 8, 9);
                    swapIfFirstIsLarger(values, 3, 5);
                    swapIfFirstIsLarger(values, 3, 4);
                    swapIfFirstIsLarger(values, 5, 6);
                    swapIfFirstIsLarger(values, 7, 8);
                }
            } else {
                // Possible lengths: 12, 13
                if (arrayLength == 12) {
                    // Length: 12
                    swapIfFirstIsLarger(values, 0, 6);
                    swapIfFirstIsLarger(values, 1, 7);
                    swapIfFirstIsLarger(values, 2, 8);
                    swapIfFirstIsLarger(values, 3, 9);
                    swapIfFirstIsLarger(values, 4, 10);
                    swapIfFirstIsLarger(values, 5, 11);
                    swapIfFirstIsLarger(values, 0, 3);
                    swapIfFirstIsLarger(values, 1, 4);
                    swapIfFirstIsLarger(values, 2, 5);
                    swapIfFirstIsLarger(values, 6, 9);
                    swapIfFirstIsLarger(values, 7, 10);
                    swapIfFirstIsLarger(values, 8, 11);
                    swapIfFirstIsLarger(values, 0, 1);
                    swapIfFirstIsLarger(values, 3, 4);
                    swapIfFirstIsLarger(values, 5, 8);
                    swapIfFirstIsLarger(values, 10, 11);
                    swapIfFirstIsLarger(values, 6, 7);
                    swapIfFirstIsLarger(values, 1, 2);
                    swapIfFirstIsLarger(values, 3, 6);
                    swapIfFirstIsLarger(values, 7, 8);
                    swapIfFirstIsLarger(values, 9, 10);
                    swapIfFirstIsLarger(values, 4, 5);
                    swapIfFirstIsLarger(values, 0, 1);
                    swapIfFirstIsLarger(values, 2, 9);
                    swapIfFirstIsLarger(values, 10, 11);
                    swapIfFirstIsLarger(values, 3, 4);
                    swapIfFirstIsLarger(values, 5, 8);
                    swapIfFirstIsLarger(values, 6, 7);
                    swapIfFirstIsLarger(values, 1, 3);
                    swapIfFirstIsLarger(values, 4, 7);
                    swapIfFirstIsLarger(values, 8, 10);
                    swapIfFirstIsLarger(values, 2, 6);
                    swapIfFirstIsLarger(values, 5, 9);
                    swapIfFirstIsLarger(values, 2, 3);
                    swapIfFirstIsLarger(values, 4, 6);
                    swapIfFirstIsLarger(values, 8, 9);
                    swapIfFirstIsLarger(values, 5, 7);
                    swapIfFirstIsLarger(values, 3, 4);
                    swapIfFirstIsLarger(values, 5, 6);
                    swapIfFirstIsLarger(values, 7, 8);
                } else {
                    // Length: 13
                    swapIfFirstIsLarger(values, 1, 12);
                    swapIfFirstIsLarger(values, 2, 11);
                    swapIfFirstIsLarger(values, 3, 10);
                    swapIfFirstIsLarger(values, 4, 9);
                    swapIfFirstIsLarger(values, 5, 8);
                    swapIfFirstIsLarger(values, 6, 7);
                    swapIfFirstIsLarger(values, 0, 5);
                    swapIfFirstIsLarger(values, 1, 4);
                    swapIfFirstIsLarger(values, 2, 3);
                    swapIfFirstIsLarger(values, 9, 12);
                    swapIfFirstIsLarger(values, 10, 11);
                    swapIfFirstIsLarger(values, 3, 6);
                    swapIfFirstIsLarger(values, 7, 10);
                    swapIfFirstIsLarger(values, 0, 1);
                    swapIfFirstIsLarger(values, 4, 5);
                    swapIfFirstIsLarger(values, 8, 9);
                    swapIfFirstIsLarger(values, 1, 7);
                    swapIfFirstIsLarger(values, 9, 10);
                    swapIfFirstIsLarger(values, 2, 8);
                    swapIfFirstIsLarger(values, 3, 4);
                    swapIfFirstIsLarger(values, 5, 11);
                    swapIfFirstIsLarger(values, 6, 12);
                    swapIfFirstIsLarger(values, 0, 3);
                    swapIfFirstIsLarger(values, 4, 9);
                    swapIfFirstIsLarger(values, 1, 2);
                    swapIfFirstIsLarger(values, 5, 8);
                    swapIfFirstIsLarger(values, 11, 12);
                    swapIfFirstIsLarger(values, 6, 7);
                    swapIfFirstIsLarger(values, 0, 1);
                    swapIfFirstIsLarger(values, 2, 3);
                    swapIfFirstIsLarger(values, 4, 7);
                    swapIfFirstIsLarger(values, 10, 11);
                    swapIfFirstIsLarger(values, 5, 9);
                    swapIfFirstIsLarger(values, 6, 8);
                    swapIfFirstIsLarger(values, 1, 2);
                    swapIfFirstIsLarger(values, 3, 5);
                    swapIfFirstIsLarger(values, 8, 10);
                    swapIfFirstIsLarger(values, 11, 12);
                    swapIfFirstIsLarger(values, 4, 6);
                    swapIfFirstIsLarger(values, 7, 9);
                    swapIfFirstIsLarger(values, 3, 4);
                    swapIfFirstIsLarger(values, 5, 6);
                    swapIfFirstIsLarger(values, 7, 8);
                    swapIfFirstIsLarger(values, 9, 10);
                    swapIfFirstIsLarger(values, 2, 3);
                    swapIfFirstIsLarger(values, 4, 5);
                    swapIfFirstIsLarger(values, 6, 7);
                    swapIfFirstIsLarger(values, 8, 9);
                    swapIfFirstIsLarger(values, 10, 11);
                }
            }
        }
    }

    /// @notice Called to swap two elements of an array if the first element is
    /// greater than the second
    /// @param values Array whose elements are to be swapped
    /// @param i Index of the first element
    /// @param j Index of the second element
    function swapIfFirstIsLarger(
        int256[] memory values,
        uint256 i,
        uint256 j
    ) private pure {
        assert(i < j);
        if (values[i] > values[j]) {
            (values[i], values[j]) = (values[j], values[i]);
        }
    }
}

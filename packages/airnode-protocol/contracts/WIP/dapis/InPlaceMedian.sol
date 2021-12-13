// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

/// @author Sasa Milic
/// @dev The original supports arrays of arbitrary length by switching to
/// quicksort where array length is greater than 16. This is a simplified
/// version that can compute median in arrays with length up to 15.
contract InPlaceMedian {
    uint256 public constant MAX_ARRAY_LENGTH = 15;

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
        return (values[arrayLength / 2] + values[arrayLength / 2 + 1]) / 2;
    }

    function sortValuesInPlace(int256[] memory values) private pure {
        uint256 arrayLength = values.length;
        assert(arrayLength <= MAX_ARRAY_LENGTH);
        // 3, 5, 7, 9 are first-class citizens assuming they will be used most
        // frequently
        if (arrayLength == 3) {
            swapIfFirstIsLarger(values, 0, 1);
            swapIfFirstIsLarger(values, 1, 2);
            swapIfFirstIsLarger(values, 0, 1);
        } else if (arrayLength == 5) {
            swapIfFirstIsLarger(values, 1, 2);
            swapIfFirstIsLarger(values, 3, 4);
            swapIfFirstIsLarger(values, 1, 3);
            swapIfFirstIsLarger(values, 0, 2);
            swapIfFirstIsLarger(values, 2, 4);
            swapIfFirstIsLarger(values, 0, 3);
            swapIfFirstIsLarger(values, 0, 1);
            swapIfFirstIsLarger(values, 2, 3);
            swapIfFirstIsLarger(values, 1, 2);
        } else if (arrayLength == 7) {
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
        } else if (arrayLength == 9) {
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
        } else if (arrayLength == 2) {
            swapIfFirstIsLarger(values, 0, 1);
        } else if (arrayLength == 4) {
            swapIfFirstIsLarger(values, 0, 1);
            swapIfFirstIsLarger(values, 2, 3);
            swapIfFirstIsLarger(values, 1, 3);
            swapIfFirstIsLarger(values, 0, 2);
            swapIfFirstIsLarger(values, 1, 2);
        } else if (arrayLength == 6) {
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
        } else if (arrayLength == 8) {
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
        } else if (arrayLength == 10) {
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
        } else if (arrayLength == 11) {
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
        } else if (arrayLength == 12) {
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
        } else if (arrayLength == 13) {
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
        } else if (arrayLength == 14) {
            swapIfFirstIsLarger(values, 0, 13);
            swapIfFirstIsLarger(values, 1, 12);
            swapIfFirstIsLarger(values, 2, 11);
            swapIfFirstIsLarger(values, 3, 10);
            swapIfFirstIsLarger(values, 4, 9);
            swapIfFirstIsLarger(values, 5, 8);
            swapIfFirstIsLarger(values, 6, 7);
            swapIfFirstIsLarger(values, 0, 5);
            swapIfFirstIsLarger(values, 1, 4);
            swapIfFirstIsLarger(values, 2, 3);
            swapIfFirstIsLarger(values, 8, 13);
            swapIfFirstIsLarger(values, 9, 12);
            swapIfFirstIsLarger(values, 10, 11);
            swapIfFirstIsLarger(values, 3, 6);
            swapIfFirstIsLarger(values, 7, 10);
            swapIfFirstIsLarger(values, 0, 1);
            swapIfFirstIsLarger(values, 4, 5);
            swapIfFirstIsLarger(values, 8, 9);
            swapIfFirstIsLarger(values, 12, 13);
            swapIfFirstIsLarger(values, 1, 7);
            swapIfFirstIsLarger(values, 9, 10);
            swapIfFirstIsLarger(values, 2, 8);
            swapIfFirstIsLarger(values, 3, 4);
            swapIfFirstIsLarger(values, 5, 11);
            swapIfFirstIsLarger(values, 6, 12);
            swapIfFirstIsLarger(values, 0, 3);
            swapIfFirstIsLarger(values, 4, 9);
            swapIfFirstIsLarger(values, 10, 13);
            swapIfFirstIsLarger(values, 1, 2);
            swapIfFirstIsLarger(values, 5, 8);
            swapIfFirstIsLarger(values, 11, 12);
            swapIfFirstIsLarger(values, 6, 7);
            swapIfFirstIsLarger(values, 0, 1);
            swapIfFirstIsLarger(values, 2, 3);
            swapIfFirstIsLarger(values, 4, 7);
            swapIfFirstIsLarger(values, 10, 11);
            swapIfFirstIsLarger(values, 12, 13);
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
        } else if (arrayLength == 15) {
            swapIfFirstIsLarger(values, 1, 14);
            swapIfFirstIsLarger(values, 2, 13);
            swapIfFirstIsLarger(values, 3, 12);
            swapIfFirstIsLarger(values, 4, 11);
            swapIfFirstIsLarger(values, 5, 10);
            swapIfFirstIsLarger(values, 6, 9);
            swapIfFirstIsLarger(values, 7, 8);
            swapIfFirstIsLarger(values, 0, 7);
            swapIfFirstIsLarger(values, 1, 6);
            swapIfFirstIsLarger(values, 2, 5);
            swapIfFirstIsLarger(values, 3, 4);
            swapIfFirstIsLarger(values, 9, 14);
            swapIfFirstIsLarger(values, 10, 13);
            swapIfFirstIsLarger(values, 11, 12);
            swapIfFirstIsLarger(values, 0, 3);
            swapIfFirstIsLarger(values, 4, 7);
            swapIfFirstIsLarger(values, 8, 11);
            swapIfFirstIsLarger(values, 1, 2);
            swapIfFirstIsLarger(values, 5, 6);
            swapIfFirstIsLarger(values, 9, 10);
            swapIfFirstIsLarger(values, 13, 14);
            swapIfFirstIsLarger(values, 0, 1);
            swapIfFirstIsLarger(values, 2, 8);
            swapIfFirstIsLarger(values, 10, 11);
            swapIfFirstIsLarger(values, 3, 9);
            swapIfFirstIsLarger(values, 4, 5);
            swapIfFirstIsLarger(values, 6, 12);
            swapIfFirstIsLarger(values, 7, 13);
            swapIfFirstIsLarger(values, 1, 4);
            swapIfFirstIsLarger(values, 5, 10);
            swapIfFirstIsLarger(values, 11, 14);
            swapIfFirstIsLarger(values, 2, 3);
            swapIfFirstIsLarger(values, 6, 9);
            swapIfFirstIsLarger(values, 12, 13);
            swapIfFirstIsLarger(values, 7, 8);
            swapIfFirstIsLarger(values, 1, 2);
            swapIfFirstIsLarger(values, 3, 4);
            swapIfFirstIsLarger(values, 5, 8);
            swapIfFirstIsLarger(values, 11, 12);
            swapIfFirstIsLarger(values, 13, 14);
            swapIfFirstIsLarger(values, 6, 10);
            swapIfFirstIsLarger(values, 7, 9);
            swapIfFirstIsLarger(values, 2, 3);
            swapIfFirstIsLarger(values, 4, 6);
            swapIfFirstIsLarger(values, 9, 11);
            swapIfFirstIsLarger(values, 12, 13);
            swapIfFirstIsLarger(values, 5, 7);
            swapIfFirstIsLarger(values, 8, 10);
            swapIfFirstIsLarger(values, 4, 5);
            swapIfFirstIsLarger(values, 6, 7);
            swapIfFirstIsLarger(values, 8, 9);
            swapIfFirstIsLarger(values, 10, 11);
            swapIfFirstIsLarger(values, 3, 4);
            swapIfFirstIsLarger(values, 5, 6);
            swapIfFirstIsLarger(values, 7, 8);
            swapIfFirstIsLarger(values, 9, 10);
            swapIfFirstIsLarger(values, 11, 12);
        }
    }

    /// Swap two elements of an array if the first element
    /// is greater than the second.
    /// @param values an array of signed integers
    /// @param i the first index
    /// @param j the second index
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

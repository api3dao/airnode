// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

/// @title Contract that calculates the index of the k-th and optionally
/// (k+1)-th largest elements in the array
/// @notice Uses quickselect, which operates in-place, i.e., the array provided
/// as the argument will be modified.
contract Quickselect {
    /// @notice Returns the index of the k-th largest element in the array
    /// @param array Array in which k-th largest element will be searched
    /// @param k K
    /// @return indK Index of the k-th largest element
    function quickselectK(int256[] memory array, uint256 k)
        internal
        pure
        returns (uint256 indK)
    {
        (indK, ) = quickselect(array, 0, array.length - 1, k, false);
    }

    /// @notice Returns the index of the k-th and (k+1)-th largest elements in
    /// the array
    /// @param array Array in which k-th and (k+1)-th largest elements will be
    /// searched
    /// @param k K
    /// @return indK Index of the k-th largest element
    /// @return indKPlusOne Index of the (k+1)-th largest element
    function quickselectKPlusOne(int256[] memory array, uint256 k)
        internal
        pure
        returns (uint256 indK, uint256 indKPlusOne)
    {
        uint256 arrayLength = array.length;
        require(arrayLength > 1, "Array too short to select k+1");
        return quickselect(array, 0, arrayLength - 1, k, true);
    }

    /// @notice Returns the index of the k-th largest element in the specified
    /// section of the (potentially unsorted) array
    /// @param array Array in which K will be searched for
    /// @param lo Starting index of the section of the array that K will be
    /// searched in
    /// @param hi Last index of the section of the array that K will be
    /// searched in
    /// @param k K
    /// @param selectKPlusOne If the index of the (k+1)-th largest element is
    /// to be returned
    /// @return indK Index of the k-th largest element
    /// @return indKPlusOne Index of the (k+1)-th largest element (only set if
    /// `selectKPlusOne` is `true`)
    function quickselect(
        int256[] memory array,
        uint256 lo,
        uint256 hi,
        uint256 k,
        bool selectKPlusOne
    ) private pure returns (uint256 indK, uint256 indKPlusOne) {
        if (lo == hi) {
            return (k, 0);
        }
        uint256 indPivot = partition(array, lo, hi);
        if (k < indPivot) {
            (indK, ) = quickselect(array, lo, indPivot - 1, k, false);
        } else if (k > indPivot) {
            (indK, ) = quickselect(array, indPivot + 1, hi, k, false);
        } else {
            indK = indPivot;
        }
        // Since Quickselect ends in the array being partitioned around the
        // k-th largest element, we can continue searching towards right for
        // the (k+1)-th largest element, which is useful in calculating the
        // median of an array with even length
        if (selectKPlusOne) {
            indKPlusOne = indK + 1;
            for (uint256 i = indKPlusOne + 1; i < array.length; i++) {
                if (array[i] < array[indKPlusOne]) {
                    indKPlusOne = i;
                }
            }
        }
    }

    /// @notice Partitions the array into two around a pivot
    /// @param array Array that will be partitioned
    /// @param lo Starting index of the section of the array that will be
    /// partitioned
    /// @param hi Last index of the section of the array that will be
    /// partitioned
    /// @return pivotInd Pivot index
    function partition(
        int256[] memory array,
        uint256 lo,
        uint256 hi
    ) private pure returns (uint256 pivotInd) {
        if (lo == hi) {
            return lo;
        }
        int256 pivot = array[lo];
        uint256 i = lo;
        pivotInd = hi + 1;
        while (true) {
            do {
                i++;
            } while (i < array.length && array[i] < pivot);
            do {
                pivotInd--;
            } while (array[pivotInd] > pivot);
            if (i >= pivotInd) {
                (array[lo], array[pivotInd]) = (array[pivotInd], array[lo]);
                return pivotInd;
            }
            (array[i], array[pivotInd]) = (array[pivotInd], array[i]);
        }
    }
}

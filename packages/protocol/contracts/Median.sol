// SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

/// @title A contract for computing the median of an array of uints.
/// @author Sasa Milic - <sasa@api3.org>
contract Median {

    // External functions

    /// Checks a given value is the correct median of an array.
    /// @param array An array of unsigned integers.
    /// @param median given value to check
    /// @return true iff `median` is the true median of an array 
    function check
    (
      uint256[] calldata array,
      uint256 median
    )
      external
      pure
      returns (bool)
    {

      uint lessthan;
      uint greaterthan;
      for (uint i=0; i<array.length; i++) {
        if (array[i] < median) {
          lessthan++;
        } else if (array[i] > median) {
          greaterthan++;
        }
      }
      if (lessthan != greaterthan) {
        return false;
      }
      if (array.length % 2 == 1) {
        return true;
      }
      // additional check is needed if array is even-length;
      // i.e. if the median is an average of two elements
      uint256 greatestLessThan = 0;
      uint256 leastGreaterThan = type(uint256).max; // effectively acts as "infinity"
      for (uint i=0; i<array.length; i++) {
        if (array[i] < median && array[i] > greatestLessThan) {
          greatestLessThan = array[i];
        } else if (array[i] > median && array[i] < leastGreaterThan) {
          leastGreaterThan = array[i];
        }
      }
      return median == (greatestLessThan + leastGreaterThan) / 2;
    }

    /// Computes a median on an array of unsigned integers of any length.
    /// @param array An array of unsigned integers.
    /// @return median of `array` 
    function compute
    (
      uint256[] memory array
    )
      external
      pure
      returns (uint256 median)
    {
      bool isOddLength = array.length % 2 == 1; 

      if (array.length <= 7) {
        (uint m1, uint m2) = _selectMiddleElements(array);
        if (isOddLength) {
          return m1;
        } else {
          return (m1 + m2) / 2;
        } 
      }
      uint256 pivotVal = array[0];
      
      if (isOddLength) {
        uint idx = _quickSelect1(
          array, 0, array.length - 1, array.length / 2 + 1, pivotVal
        );
        median = array[idx];
      } else {
        (uint idx1, uint idx2) = _quickSelect2(
          array, 0, array.length - 1, array.length / 2, pivotVal
        );
        median = (array[idx1] + array[idx2]) / 2;
      }
    }

    // Private functions

    /// Select the kth element in an array.
    /// @param array an array of uints.
    /// @param left the left index to begin search.
    /// @param right the right index to begin search.
    /// @param k.
    /// @param pivotVal the value of the element we pivot on.
    /// @dev the pre-condition is that the kth smallest element
    ///   is not in array[0:left-1] or in array[right+1:]
    /// @return result the kth smallest element in the array
    function _quickSelect1
    (
      uint256[] memory array,
      uint256 left,
      uint256 right,
      uint256 k,
      uint256 pivotVal
    )
      private
      pure
      returns (uint256 result)
    {
      assert(left <= k - 1 && k - 1 <= right);
      if (left == right) {return left;}

      if (right - left == 1) {
        if (array[left] > array[right]) {
          (array[left], array[right]) = (array[right], array[left]);
        }
        return k - 1;
      }

      uint256 pivotIdx = _partition(array, left, right, pivotVal);

      if (k == pivotIdx + 1) {
        result = pivotIdx;
      } else if (k < pivotIdx + 1){
        pivotVal = array[left]; 
        result = _quickSelect1(array, left, pivotIdx - 1, k, pivotVal);
      } else {
        pivotVal = array[pivotIdx + 1]; 
        result = _quickSelect1(array, pivotIdx + 1, right, k, pivotVal);
      }
    }

    /// Select the kth and (k+1)th elements in an array.
    /// @param array an array of uints.
    /// @param left the left index to begin search.
    /// @param right the right index to begin search.
    /// @param k.
    /// @param pivotVal the value of the element we pivot on.
    /// @dev the function calls _quickselect1 to find the kth smallest element
    ///   and then finds the smallest element in the right partition, which
    ///   is equal to the (k+1)th smallest element in the entire array.
    /// @return idx1 the index of the  kth smallest element in the array
    /// @return idx2 the index of the (k+1)th smallest element in the array
    function _quickSelect2
    (
      uint256[] memory array,
      uint256 left,
      uint256 right,
      uint256 k,
      uint256 pivotVal
    )
      private
      pure
      returns (uint idx1, uint idx2)
    {
      idx1 = _quickSelect1(array, left, right, k, pivotVal);
      assert(idx1 != array.length - 1);
      // In order to find (k+1)th element,
      // find minimum in right partition of array
      idx2 = idx1 + 1;
      for (uint i=idx1+2; i<array.length; i++) {
        if (array[i] < array[idx2]) {
          idx2 = i;
        }
      }
    }

    /// Partition the array around a pivot.
    /// @param array an array of uints.
    /// @param left index of array from which we begin partition 
    /// @param right index of array from which we end partition 
    /// @param pivotVal the value of the element we select as our pivot.
    /// @dev We only partition the subarray array[left...right]
    /// @return idx the resulting index of the pivot
    function _partition
    (
      uint256[] memory array,
      uint256 left,
      uint256 right,
      uint256 pivotVal
    )
      private
      pure
      returns (uint256 idx)
    {
      uint i = left;
      uint j = left;
      while (j < right) {
        if (array[j] < pivotVal) {
          (array[i], array[j]) = (array[j], array[i]);
          i++;
          j++;
        } else if (array[j] == pivotVal && pivotVal != array[right]) {
          (array[j], array[right]) = (array[right], array[j]);
        } else {
          j++;
        }
      }
      (array[i], array[right]) = (array[right], array[i]);
      idx = i;
    }

  /// Select one or two middle elements of a (at most) length-7 array.
  /// @param arr an array of at most length 7
  /// @return the middle element(s) of `arr` - the second element
  ///   is 0 when the array is odd-length.
  function _selectMiddleElements
  (
    uint256[] memory arr
  )
      private
      pure
      returns (uint, uint)
  {
    assert(1 <= arr.length && arr.length <= 7);

    if (arr.length == 1) {
      return (arr[0], 0);
    }
    if (arr.length == 2) {
      return (arr[0], arr[1]);
    }
    if (arr.length == 3) {
      if (arr[0] > arr[1]) {(arr[0], arr[1]) = (arr[1], arr[0]);}
      if (arr[1] > arr[2]) {(arr[1], arr[2]) = (arr[2], arr[1]);}
      if (arr[0] > arr[1]) {(arr[0], arr[1]) = (arr[1], arr[0]);}
      return (arr[1], 0);
    }
    if (arr.length == 4) {
      if (arr[0] > arr[1]) {(arr[0], arr[1]) = (arr[1], arr[0]);}
      if (arr[2] > arr[3]) {(arr[2], arr[3]) = (arr[3], arr[2]);}
      if (arr[1] > arr[3]) {(arr[1], arr[3]) = (arr[3], arr[1]);}
      if (arr[0] > arr[2]) {(arr[0], arr[2]) = (arr[2], arr[0]);}
      return (arr[1], arr[2]);
    }
    if (arr.length == 5) {
      if (arr[0] > arr[1]) {(arr[0], arr[1]) = (arr[1], arr[0]);}
      if (arr[2] > arr[3]) {(arr[2], arr[3]) = (arr[3], arr[2]);}
      if (arr[1] > arr[3]) {(arr[1], arr[3]) = (arr[3], arr[1]);}
      if (arr[0] > arr[2]) {(arr[0], arr[2]) = (arr[2], arr[0]);}
      if (arr[1] > arr[2]) {(arr[1], arr[2]) = (arr[2], arr[1]);}
      if (arr[4] < arr[1]) {
          return (arr[1], 0);
      } else if (arr[4] > arr[2]) {
          return (arr[2], 0);
      } else {
          return (arr[4], 0);
      }
    }
    if (arr[0] > arr[1]) {(arr[0], arr[1]) = (arr[1], arr[0]);}
    if (arr[2] > arr[3]) {(arr[2], arr[3]) = (arr[3], arr[2]);}
    if (arr[4] > arr[5]) {(arr[4], arr[5]) = (arr[5], arr[4]);}
    if (arr[1] > arr[3]) {(arr[1], arr[3]) = (arr[3], arr[1]);}
    if (arr[3] > arr[5]) {(arr[3], arr[5]) = (arr[5], arr[3]);}
    if (arr[1] > arr[3]) {(arr[1], arr[3]) = (arr[3], arr[1]);}
    if (arr[2] > arr[4]) {(arr[2], arr[4]) = (arr[4], arr[2]);}
    if (arr[0] > arr[2]) {(arr[0], arr[2]) = (arr[2], arr[0]);}
    if (arr[2] > arr[4]) {(arr[2], arr[4]) = (arr[4], arr[2]);}
    if (arr[3] > arr[4]) {(arr[3], arr[4]) = (arr[4], arr[3]);}
    if (arr[1] > arr[2]) {(arr[1], arr[2]) = (arr[2], arr[1]);}

    if (arr.length == 6) {
      return (arr[2], arr[3]);
    }
    if (arr[2] > arr[3]) {(arr[2], arr[3]) = (arr[3], arr[2]);}
    if (arr[2] > arr[6]) {
      return (arr[2], 0);
    } else if (arr[6] > arr[3]) {
      return (arr[3], 0);
    } else {
      return (arr[6], 0);
    }
  }
}

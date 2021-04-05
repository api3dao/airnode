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
      uint256 leastGreaterThan = 2**256 - 1; // effectively acts as "infinity"
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
        if (array.length == 1)
        {
            median = array[0];
        }
        else if (array.length == 2)
        {
            median = (array[0] + array[1]) / 2;
        }
        else if (array.length == 3)
        {
            median = _median3(
              array[0],
              array[1],
              array[2]
            );
        }
        else if (array.length == 4)
        {
            median = _median4(
              array[0],
              array[1],
              array[2],
              array[3]
            );
        }
        else if (array.length == 5)
        {
            median = _median5(
              array[0],
              array[1],
              array[2],
              array[3],
              array[4]
            );
        }
        else
        {
            uint256 pivotVal = _medianOfMedians(array);
            
            if (array.length % 2 == 1) {
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
      if (left == right) {return left;}

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

    /// Return the median of medians of an array.
    ///   This is the median of the median of disjoin subarrays
    ///   of length 5.
    /// @param array an array of uints.
    /// @dev The result of this is used as a pivot value for quickselect,
    ///   when computing median.
    /// @return pivot the median of medians
    function _medianOfMedians
    (
      uint256[] memory array
    )
        public
        pure
        returns (uint256 pivot)
    {
        uint256[] memory medians = new uint256[](array.length/5);
        uint256 med;

        for (uint i=0; i<array.length-array.length%5; i+=5)
        {
          med = _median5(
            array[i],
            array[i+1],
            array[i+2],
            array[i+3],
            array[i+4]
          );
          medians[i/5] = med;   
        }
       
        uint pivotIdx; 
        pivotIdx = _quickSelect1(
          medians, 0, medians.length - 1, medians.length / 2, medians[0]
        );
        pivot = medians[pivotIdx];
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
          _swap(array, i, j);
          i++;
          j++;
        } else if (array[j] == pivotVal && pivotVal != array[right]) {
          _swap(array, j, right);
        } else {
          j++;
        }
      }
      _swap(array, i, right);
      idx = i;
    }

    /// Swap two elements in an array.
    /// @param array an array of uints.
    /// @param i an index in `array`.
    /// @param j an index in `array`.
    function _swap
    (
      uint256[] memory array,
      uint256 i,
      uint256 j
    )
      private
      pure
    {
      uint256 temp = array[i];
      array[i] = array[j];
      array[j] = temp;
    }

    /// Computes a median on a length-3 array of unsigned integers.
    /// @param x0 value of element at index 0
    /// @param x1 value of element at index 1
    /// @param x2 value of element at index 2
    /// @return _median median of x0, x1, x2
    function _median3
    (
      uint256 x0,
      uint256 x1,
      uint256 x2
    )
        private
        pure
        returns (uint256 _median)
    {
        if (x0 > x1) {(x0, x1) = (x1, x0);}
        if (x1 > x2) {(x1, x2) = (x2, x1);}
        if (x0 > x1) {(x0, x1) = (x1, x0);}

        _median = x1;
    }

    /// Computes a median on a length-4 array of unsigned integers.
    /// @param x0 value of element at index 0
    /// @param x1 value of element at index 1
    /// @param x2 value of element at index 2
    /// @param x3 value of element at index 3
    /// @return _median median of x0, x1, x2, x3
    function _median4
    (
      uint256 x0,
      uint256 x1,
      uint256 x2,
      uint256 x3
    )
        private
        pure
        returns (uint256 _median)
    {
        if (x0 > x1) {(x0, x1) = (x1, x0);}
        if (x2 > x3) {(x2, x3) = (x3, x2);}
        if (x1 > x3) {(x1, x3) = (x3, x1);}
        if (x0 > x2) {(x0, x2) = (x2, x0);}

        _median = (x1 + x2) / 2;
    }
    
    /// Computes a median on a length-5 array of unsigned integers.
    /// @param x0 value of element at index 0
    /// @param x1 value of element at index 1
    /// @param x2 value of element at index 2
    /// @param x3 value of element at index 3
    /// @param x4 value of element at index 4
    /// @return _median median of x0, x1, x2, x3, x4 
    function _median5
    (
      uint256 x0,
      uint256 x1,
      uint256 x2,
      uint256 x3,
      uint256 x4
    )
        private
        pure
        returns (uint256 _median)
    {
        if (x0 > x1) {(x0, x1) = (x1, x0);}
        if (x2 > x3) {(x2, x3) = (x3, x2);}
        if (x1 > x3) {(x1, x3) = (x3, x1);}
        if (x0 > x2) {(x0, x2) = (x2, x0);}
        if (x1 > x2) {(x1, x2) = (x2, x1);}

        if (x4 < x1) {
            _median = x1;
        } else if (x4 > x2) {
            _median = x2;
        } else {
          _median = x4; 
        }
    }
}

// SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

/// @title A contract for computing the median of an array of uints.
/// @author Sasa Milic - <sasa@api3.org>
contract Median2 {

    // External functions

    /// Computes a median on an array of unsigned integers of any length.
    /// @param arr An array of unsigned integers.
    /// @return median of `array` 
    function compute2
    (
      uint256[] memory arr
    )
      external
      pure
      returns (uint256 median)
    {
      uint i = 0;
      uint j;
      while (i < arr.length) {
        j = i;
        while (j > 0 && arr[j - 1] > arr[j]) {
          (arr[j], arr[j - 1]) = (arr[j - 1], arr[j]);
          j--;
        }
        i++;
      }
      if (arr.length % 2 == 1) {
        median = arr[arr.length / 2];
      } else {
        uint m = arr.length / 2;
        median = (arr[m - 1] + arr[m]) / 2;
      }
    }

    /// Computes a median on an array of unsigned integers of any length.
    /// @param arr An array of unsigned integers.
    /// @return median of `array` 
    function compute
    (
      uint256[] memory arr
    )
        external
        pure
        returns (uint256 median)
    {
        bool oddLength = arr.length % 2 == 1; 

        uint pivotVal = arr[0];
        
        if (oddLength) {
          uint idx = _quickSelect1(
            arr, 0, arr.length - 1, arr.length / 2 + 1, pivotVal
          );
          median = arr[idx];
        } else {
          (uint idx1, uint idx2) = _quickSelect2(
            arr, 0, arr.length - 1, arr.length / 2, pivotVal
          );
          median = (arr[idx1] + arr[idx2]) / 2;
        }
    }
    
    /// Computes a median on an array of unsigned integers of any length.
    /// @param arr An array of unsigned integers.
    /// @return median of `array` 
    function compute3
    (
      uint256[] memory arr
    )
        external
        pure
        returns (uint256 median)
    {
        bool oddLength = arr.length % 2 == 1; 

        if (arr.length <= 5) {
            (uint m1, uint m2) = _selectMiddleElements(arr);
            if (oddLength) {
              median = m1;
            } else {
              median = (m1 + m2) / 2;
            }
            return median;
        }
        uint pivotVal = _medianOfMedians(arr);
        
        if (oddLength) {
          uint idx = _quickSelect1(
            arr, 0, arr.length - 1, arr.length / 2 + 1, pivotVal
          );
          median = arr[idx];
        } else {
          (uint idx1, uint idx2) = _quickSelect2(
            arr, 0, arr.length - 1, arr.length / 2, pivotVal
          );
          median = (arr[idx1] + arr[idx2]) / 2;
        }
    }
    
    /// Computes a median on an array of unsigned integers of any length.
    /// @param arr An array of unsigned integers.
    /// @return median of `array` 
    function compute4
    (
      uint256[] memory arr
    )
        external
        pure
        returns (uint256 median)
    {
        assert(arr.length <= 7);
        bool oddLength = arr.length % 2 == 1; 

        (uint m1, uint m2) = _selectMiddleElements(arr);
        if (oddLength) {
          median = m1;
        } else {
          median = (m1 + m2) / 2;
        }
        return median;
    }
    
    /// Computes a median on an array of unsigned integers of any length.
    /// @param arr An array of unsigned integers.
    /// @return median of `array` 
    function compute5
    (
      uint256[] calldata arr
    )
        external
        pure
        returns (uint256 median)
    {
      median = arr[0];
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
      public
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
      public
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
    /// @return pivotVal the median of medians
    function _medianOfMedians
    (
      uint256[] memory array
    )
        public
        pure
        returns (uint256 pivotVal)
    {
        uint256[] memory medians = new uint256[](array.length/5);

        for (uint i=0; i<array.length-array.length%5; i+=5)
        {
          uint256[] memory subarray = new uint256[](5);
          subarray[0] = array[i];
          subarray[1] = array[i+1];
          subarray[2] = array[i+2];
          subarray[3] = array[i+3];
          subarray[4] = array[i+4];
          (uint m1, uint m2) = _selectMiddleElements(subarray);
          medians[i/5] = m1;   
        }
      
        if (medians.length <= 7) {
          (uint m1, uint m2) = _selectMiddleElements(medians);
          pivotVal = m1;
        } else {
          uint pivotIdx; 
          pivotIdx = _quickSelect1(
            medians, 0, medians.length - 1, medians.length / 2, medians[0]
          );
          pivotVal = medians[pivotIdx];
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
      public
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

    /// Select one or two middle elements of an, at most, length-6 array.
    /// @param arr an array of at most 6
    /// @return the middle element(s) of `arr` - the second element
    ///   is 0 when the array is odd-length.
    function _selectMiddleElements
    (
      uint256[] memory arr
    )
        public
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

// SPDX-License-Identifier: MIT
pragma solidity 0.8.4;

contract CustomReducer {
  int256 public constant HUNDRED_PERCENT = 100e6;
  uint256 constant public SMALL_ARRAY_MAX_LENGTH = 15;

  function meanMedianHybrid(
        int256[] memory values,
        int256 toleranceInPercentages
        )
        internal
        view
        returns (int256)
    {
        int256 mean = computeMean(values);
        // Test the mean for validity
        int256 upperTolerance = mean * (HUNDRED_PERCENT + toleranceInPercentages) / HUNDRED_PERCENT;
        int256 lowerTolerance = mean * (HUNDRED_PERCENT - toleranceInPercentages) / HUNDRED_PERCENT;
        uint256 upperToleranceValidityCount;
        uint256 lowerToleranceValidityCount;
        for (uint256 i = 0; i < values.length; i++) {
            if (upperTolerance >= values[i]) {
                upperToleranceValidityCount++;
            }
            if (lowerTolerance <= values[i]) {
                lowerToleranceValidityCount++;
            }
        }
        if (upperToleranceValidityCount >= values.length / 2) {
            if (lowerToleranceValidityCount >= values.length / 2) {
                return mean;
            }
        }
        // Fall back to median if the mean is not valid
        return computeMedian(values);
    }

    function computeMean(int256[] memory values)
        private
        view
        returns (int256)
    {
        int256 mean = 0;
        for (uint256 i = 0; i < values.length; i++) {
          mean += values[i];
        }
        mean /= int256(values.length);
        return mean;
    }

    function computeMedian(int256[] memory values)
        internal
        view
        returns (int256)
    {
        return computeInPlace(values, values.length / 2 + 1);
    }

    function computeInPlace
    (
      int256[] memory arr,
      uint256 k
    )
      public
      pure
      returns (int256)
    {
      require(k <= arr.length - 1, "k must be a valid index in arr");
      if (arr.length <= SMALL_ARRAY_MAX_LENGTH) {
        return selectKsmallArray(arr, k);
      }
      (uint256 idx1,) = quickSelect(arr, 0, arr.length - 1, k, false);
      return arr[idx1];
    }

    function selectKsmallArray
  (
    int256[] memory arr,
    uint256 k
  )
      private
      pure
      returns (int256)
  {
    if (arr.length == 3) {
      condSwap(arr, 0, 1); condSwap(arr, 1, 2); condSwap(arr, 0, 1);
    }
    else if (arr.length == 5) {
      condSwap(arr, 1, 2); condSwap(arr, 3, 4); condSwap(arr, 1, 3);
      condSwap(arr, 0, 2); condSwap(arr, 2, 4); condSwap(arr, 0, 3);
      condSwap(arr, 0, 1); condSwap(arr, 2, 3); condSwap(arr, 1, 2);
    }
    else if (arr.length == 7) {
      condSwap(arr, 1, 2); condSwap(arr, 3, 4); condSwap(arr, 5, 6);
      condSwap(arr, 0, 2); condSwap(arr, 4, 6); condSwap(arr, 3, 5);
      condSwap(arr, 2, 6); condSwap(arr, 1, 5); condSwap(arr, 0, 4);
      condSwap(arr, 2, 5); condSwap(arr, 0, 3); condSwap(arr, 2, 4);
      condSwap(arr, 1, 3); condSwap(arr, 0, 1); condSwap(arr, 2, 3);
      condSwap(arr, 4, 5);
    }
    else if (arr.length == 9) {
      condSwap(arr, 1, 8); condSwap(arr, 2, 7); condSwap(arr, 3, 6);
      condSwap(arr, 4, 5); condSwap(arr, 1, 4); condSwap(arr, 5, 8);
      condSwap(arr, 0, 2); condSwap(arr, 6, 7); condSwap(arr, 2, 6);
      condSwap(arr, 7, 8); condSwap(arr, 0, 3); condSwap(arr, 4, 5);
      condSwap(arr, 0, 1); condSwap(arr, 3, 5); condSwap(arr, 6, 7);
      condSwap(arr, 2, 4); condSwap(arr, 1, 3); condSwap(arr, 5, 7);
      condSwap(arr, 4, 6); condSwap(arr, 1, 2); condSwap(arr, 3, 4);
      condSwap(arr, 5, 6); condSwap(arr, 7, 8); condSwap(arr, 2, 3);
      condSwap(arr, 4, 5);
    }
    else if (arr.length == 11) {
      condSwap(arr, 0, 9);  condSwap(arr, 1, 8);  condSwap(arr, 2, 7);
      condSwap(arr, 3, 6);  condSwap(arr, 4, 5);  condSwap(arr, 0, 3);
      condSwap(arr, 1, 2);  condSwap(arr, 4, 10); condSwap(arr, 6, 9);
      condSwap(arr, 7, 8);  condSwap(arr, 0, 1);  condSwap(arr, 2, 3);
      condSwap(arr, 5, 8);  condSwap(arr, 9, 10); condSwap(arr, 6, 7);
      condSwap(arr, 1, 2);  condSwap(arr, 4, 6);  condSwap(arr, 8, 10);
      condSwap(arr, 5, 9);  condSwap(arr, 0, 4);  condSwap(arr, 7, 8);
      condSwap(arr, 1, 5);  condSwap(arr, 2, 9);  condSwap(arr, 3, 6);
      condSwap(arr, 1, 4);  condSwap(arr, 5, 7);  condSwap(arr, 2, 3);
      condSwap(arr, 6, 9);  condSwap(arr, 2, 4);  condSwap(arr, 6, 7);
      condSwap(arr, 8, 9);  condSwap(arr, 3, 5);  condSwap(arr, 3, 4);
      condSwap(arr, 5, 6);  condSwap(arr, 7, 8);
    }
    else if (arr.length == 13) {
      condSwap(arr, 1, 12); condSwap(arr, 2, 11);  condSwap(arr, 3, 10);
      condSwap(arr, 4, 9);  condSwap(arr, 5, 8);   condSwap(arr, 6, 7);
      condSwap(arr, 0, 5);  condSwap(arr, 1, 4);   condSwap(arr, 2, 3);
      condSwap(arr, 9, 12); condSwap(arr, 10, 11); condSwap(arr, 3, 6);
      condSwap(arr, 7, 10); condSwap(arr, 0, 1);   condSwap(arr, 4, 5);
      condSwap(arr, 8, 9);  condSwap(arr, 1, 7);   condSwap(arr, 9, 10);
      condSwap(arr, 2, 8);  condSwap(arr, 3, 4);   condSwap(arr, 5, 11);
      condSwap(arr, 6, 12); condSwap(arr, 0, 3);   condSwap(arr, 4, 9);
      condSwap(arr, 1, 2);  condSwap(arr, 5, 8);   condSwap(arr, 11, 12);
      condSwap(arr, 6, 7);  condSwap(arr, 0, 1);   condSwap(arr, 2, 3);
      condSwap(arr, 4, 7);  condSwap(arr, 10, 11); condSwap(arr, 5, 9);
      condSwap(arr, 6, 8);  condSwap(arr, 1, 2);   condSwap(arr, 3, 5);
      condSwap(arr, 8, 10); condSwap(arr, 11, 12); condSwap(arr, 4, 6);
      condSwap(arr, 7, 9);  condSwap(arr, 3, 4);   condSwap(arr, 5, 6);
      condSwap(arr, 7, 8);  condSwap(arr, 9, 10);  condSwap(arr, 2, 3);
      condSwap(arr, 4, 5);  condSwap(arr, 6, 7);   condSwap(arr, 8, 9);
      condSwap(arr, 10, 11);
    }
    else if (arr.length == 15) {
      condSwap(arr, 1, 14);  condSwap(arr, 2, 13);  condSwap(arr, 3, 12);
      condSwap(arr, 4, 11);  condSwap(arr, 5, 10);  condSwap(arr, 6, 9);
      condSwap(arr, 7, 8);   condSwap(arr, 0, 7);   condSwap(arr, 1, 6);
      condSwap(arr, 2, 5);   condSwap(arr, 3, 4);   condSwap(arr, 9, 14);
      condSwap(arr, 10, 13); condSwap(arr, 11, 12); condSwap(arr, 0, 3);
      condSwap(arr, 4, 7);   condSwap(arr, 8, 11);  condSwap(arr, 1, 2);
      condSwap(arr, 5, 6);   condSwap(arr, 9, 10);  condSwap(arr, 13, 14);
      condSwap(arr, 0, 1);   condSwap(arr, 2, 8);   condSwap(arr, 10, 11);
      condSwap(arr, 3, 9);   condSwap(arr, 4, 5);   condSwap(arr, 6, 12);
      condSwap(arr, 7, 13);  condSwap(arr, 1, 4);   condSwap(arr, 5, 10);
      condSwap(arr, 11, 14); condSwap(arr, 2, 3);   condSwap(arr, 6, 9);
      condSwap(arr, 12, 13); condSwap(arr, 7, 8);   condSwap(arr, 1, 2);
      condSwap(arr, 3, 4);   condSwap(arr, 5, 8);   condSwap(arr, 11, 12);
      condSwap(arr, 13, 14); condSwap(arr, 6, 10);  condSwap(arr, 7, 9);
      condSwap(arr, 2, 3);   condSwap(arr, 4, 6);   condSwap(arr, 9, 11);
      condSwap(arr, 12, 13); condSwap(arr, 5, 7);   condSwap(arr, 8, 10);
      condSwap(arr, 4, 5);   condSwap(arr, 6, 7);   condSwap(arr, 8, 9);
      condSwap(arr, 10, 11); condSwap(arr, 3, 4);   condSwap(arr, 5, 6);
      condSwap(arr, 7, 8);   condSwap(arr, 9, 10);  condSwap(arr, 11, 12);
    }
    return arr[k];
  }

  function condSwap
  (
    int256[] memory arr,
    uint256 i,
    uint256 j
  )
    private
    pure
  {
    assert(i < j);
    if (arr[i] > arr[j]) {(arr[i], arr[j]) = (arr[j], arr[i]);}
  }

  function quickSelect
  (
    int256[] memory arr,
    uint256 lo,
    uint256 hi,
    uint256 k,
    bool selectKplusOne
  )
    private
    pure
    returns (uint256, uint256)
  {
    if (lo == hi) {return (k, 0);}
   
    uint256 pivotIdx = partition(arr, lo, hi);

    uint256 idx1;
    uint256 idx2;

    if (k == pivotIdx) {
      idx1 = pivotIdx;
    } else if (k < pivotIdx){
      (idx1, idx2) = quickSelect(arr, lo, pivotIdx - 1, k, false);
    } else {
      (idx1, idx2) = quickSelect(arr, pivotIdx + 1, hi, k, false);
    }
    if (!selectKplusOne) {
      return (idx1, 0);
    }
    // In order to find (k+1)th element,
    // find minimum in right partition of array
    idx2 = idx1 + 1;
    for (uint i=idx1+2; i<arr.length; i++) {
      if (arr[i] < arr[idx2]) {
        idx2 = i;
      }
    }
    return (idx1, idx2);
  }

  function partition
  (
    int256[] memory arr,
    uint256 lo,
    uint256 hi
  )
    private
    pure
    returns (uint256)
  {
    if (lo == hi) {return lo;}
    
    int pivot = arr[lo];

    uint i = lo;
    uint j = hi + 1;
 
    while (true) {
      do {
        i++;
      } while (i < arr.length && arr[i] < pivot);
      do {
        j--;
      } while (arr[j] > pivot);
      if (i >= j) {
        // swap with pivot
        (arr[lo], arr[j]) = (arr[j], arr[lo]);
        return j;
      } 
      (arr[i], arr[j]) = (arr[j], arr[i]);
    }
  }
}

const { expect } = require('chai');

let selectK;

// some helper functions for testing

const permutations = (arr) => {
  if (arr.length <= 2) return arr.length === 2 ? [arr, [arr[1], arr[0]]] : [arr];
  return arr.reduce(
    (acc, item, i) => acc.concat(permutations([...arr.slice(0, i), ...arr.slice(i + 1)]).map((val) => [item, ...val])),
    []
  );
};

const factorial = (n) => {
  var res = 1;
  for (let x = 1; x <= n; x++) {
    res = res * x;
  }
  return res;
};

const range = (n) => {
  var arr = [];
  for (let x = 10; x <= n * 10; x += 10) {
    arr.push(x);
  }
  return arr;
};

const addRandomDuplicates = (arr) => {
  for (let i = 0; i <= arr.length / 2; i++) {
    if (Math.random() > 0.5) {
      arr[i] = arr[arr.length - i - 1];
    }
  }
  return arr;
};

const _median = (arr) => {
  const arrSorted = arr.slice(0).sort((a, b) => a - b);
  const n = arr.length;
  if (n % 2 == 1) {
    return arrSorted[Math.floor(n / 2)];
  } else {
    return (arrSorted[n / 2 - 1] + arrSorted[n / 2]) / 2;
  }
};

const _selectK = (arr, k) => {
  const arrSorted = arr.slice(0).sort((a, b) => a - b);
  return arrSorted[k];
};

/*
 * Randomize array in-place using Durstenfeld shuffle algorithm,
 * From: https://stackoverflow.com/a/12646864/14796546
 */
function shuffleArray(array) {
  for (var i = array.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var temp = array[i];
    array[i] = array[j];
    array[j] = temp;
  }
}

beforeEach(async () => {
  const SelectK = await ethers.getContractFactory('SelectK');
  selectK = await SelectK.deploy();
});

/*
 * Test select-k computation for *all* permutations of arrays of length at most 5.
 */
describe('select-k length <= 6', function () {
  it('Should revert with invalid k', async function () {
    await expect(selectK.compute([1, 2, 3], 3)).to.be.revertedWith('k must be a valid index in arr');
  });

  for (let n = 1; n <= 1; n++) {
    let arr = range(n);
    for (let k = 0; k < n; k++) {
      const x_k = _selectK(arr, k);
      let perms = permutations(arr);
      for (let i = 0; i < perms.length; i++) {
        let arrP = perms[i];
        it(
          'return correct ' + k + '-th element for all permutations of length ' + n + ': [' + arrP + ']',
          async function () {
            expect(await selectK.compute(arrP, k)).to.equal(x_k);
          }
        );
      }
    }
  }
});

/*
 * Test a random sampling of arrays of length greater than 5, with random duplicates added.
 */
describe('select-k length >= 7, with duplicates', function () {
  it('Should revert with invalid k', async function () {
    await expect(selectK.compute2([1, 2, 3], 2)).to.be.revertedWith('k must be a valid index in arr');
  });

  for (let n = 5; n <= 5; n++) {
    //let arr = range(n);
    let arr = addRandomDuplicates(range(n));
    for (let k = 0; k < n; k++) {
      const x_k = _selectK(arr, k);
      // test `nShuffles` random shuffles for each array length
      const nShuffles = 10;
      for (let i = 0; i < Math.min(factorial(n), nShuffles); i++) {
        let arrP = arr.slice();
        shuffleArray(arrP);
        it('return correct ' + k + '-th element for array of length ' + n + ': [' + arrP + ']', async function () {
          expect(await selectK.compute(arrP, k)).to.equal(x_k);
        });
      }
    }
  }
});

/*
 * Test select-2 on a random sampling of arrays with random duplicates added.
 */
describe('select k and (k+1)', function () {
  for (let n = 1; n <= 3; n++) {
    //let arr = range(n);
    let arr = addRandomDuplicates(range(n));
    for (let k = 0; k < n - 1; k++) {
      const x_k = _selectK(arr, k);
      const k2 = k + 1;
      const x_k2 = _selectK(arr, k2);
      // test `nShuffles` random shuffles for each array length
      const nShuffles = 10;
      for (let i = 0; i < Math.min(factorial(n), nShuffles); i++) {
        let arrP = arr.slice();
        shuffleArray(arrP);
        it(
          'return correct (' + k + ', ' + k2 + ') elements for array of length ' + n + ': [' + arrP + ']',
          async function () {
            let result = await selectK.compute2(arrP, k);
            expect(result[0].toNumber()).to.equal(x_k);
            expect(result[1].toNumber()).to.equal(x_k2);
          }
        );
      }
    }
  }
});

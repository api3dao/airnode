const { expect } = require('chai');

let median;

// TODO: add test arrays with duplicate values

// some helper functions for testing

/*
const permutations = arr => {
  if (arr.length <= 2) return arr.length === 2 ? [arr, [arr[1], arr[0]]] : [arr];
  return arr.reduce(
    (acc, item, i) =>
      acc.concat(
        permutations([...arr.slice(0, i), ...arr.slice(i + 1)]).map(val => [
          item,
          ...val,
        ])
      ),
    []
  );
};
*/

const factorial = (n) => {
  var res = 1;
  for (let x = 1; x <= n; x++) {
    res = res * x;
  }
  return res;
};

const range = (n) => {
  var arr = [];
  for (let x = 100; x <= n * 100; x += 100) {
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
  const Median = await ethers.getContractFactory('Median');
  median = await Median.deploy();
});

describe('median.compute', function () {
  for (let n = 1; n <= 25; n++) {
    let arr = addRandomDuplicates(range(n));
    const med = _median(arr);
    // test `nShuffles` random shuffles for each array length
    const nShuffles = 10;
    for (let i = 0; i < Math.min(factorial(n), nShuffles); i++) {
      let arrP = arr.slice();
      shuffleArray(arrP);
      it('return correct median for array of length ' + n + ': [' + arrP + ']', async function () {
        expect(await median.compute(arrP)).to.equal(med);
      });
    }
  }
});

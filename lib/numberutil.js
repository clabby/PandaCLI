const BigNumber = require('bignumber.js');

const decimate = (bigNumber, decimals = 18) => {
  return bigNumber.div(new BigNumber(10).pow(decimals));
}

module.exports = { decimate };

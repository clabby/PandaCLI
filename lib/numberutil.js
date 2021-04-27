const BigNumber = require('bignumber.js');

const decimate = (bigNumber, decimals = 18) => {
  return bigNumber.div(new BigNumber(10).pow(decimals));
}

const formatNumber = (balance, decimals = 18) => {
  const displayBalance = balance.dividedBy(new BigNumber(10).pow(decimals));
  return displayBalance
      .toNumber()
      .toFixed(2)
      .toString()
      .replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

module.exports = { decimate, formatNumber };

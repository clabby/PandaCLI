/*
 $$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$
 $$$$$$$$$$$$$$$$$$$$$$$$**$$$$$$$$$**$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$
 $$$$$$$$$$$$$$$$$$$$$$"   ^$$$$$$F    *$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$
 $$$$$$$$$$$$$$$$$$$$$     z$$$$$$L    ^$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$
 $$$$$$$$$$$$$$$$$$$$$    e$$$$$$$$$e  J$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$
 $$$$$$$$$$$$$$$$$$$$$eee$$$$$$$$$$$$$e$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$
 $$$$$$$$$$$$$$$$$$$$b$$$$$$$$$$$$$$$$$$*$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$
 $$$$$$$$$$$$$$$$$$$)$$$$P"e^$$$F$r*$$$$F"$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$
 $$$$$$$$$$$$$$$$$$$d$$$$  "z$$$$"  $$$$%  $3$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$
 $$$$$$$$$$$$$$$$*"""*$$$  .$$$$$$ z$$$*   ^$e*$$$$$$$$$$$$$$$$$$$$$$$$$$$$$
 $$$$$$$$$$$$$$$"     *$$ee$$$$$$$$$$*"     $$$C$$$$$$$$$$$$$$$$$$$$$$$$$$$$
 $$$$$$$$$$$$$$$.      "***$$"*"$$""        $$$$e*$$$$$$$$$$$$$$$$$$$$$$$$$$
 $$$$$$$$$$$$$$$b          "$b.$$"          $$$$$b"$$$$$$$$$$$$$$$$$$$$$$$$$
 $$$$$$$$$$$$$$$$$c.         """            $$$$$$$^$$$$$$$$$$$$$$$$$$$$$$$$
 $$$$$$$$$$$$$$$$$$$e..                     $$$$$$$$^$$$$$$$$$$$$$$$$$$$$$$$
 $$$$$$$$$$$$$$$$$$$$$$$$eeee..            J$$$$$$$$b"$$$$$$$$$$$$$$$$$$$$$$
 $$$$$$$$$$$$$$$$$$$$$$$$$$$$$$r          z$$$$$$$$$$r$$$$$$$$$$$$$$$$$$$$$$
 $$$$$$$$$$$$$$$$$$$$$$$$$$$$$$"         z$$$$$**$$$$$^$$$$$$$$$$$$$$$$$$$$$
 $$$$$$$$$$$$$$$$$$$$$$$$$$$*"          z$$$P"   ^*$$$ $$$$$$$$$$$$$$$$$$$$$
 $$$$$$$$$$$$$$$$$$$$$$$$*"           .d$$$$       $$$ $$$$$$$$$$$$$$$$$$$$$
 $$$$$$$$$$$$$$$$$$$$$$$"           .e$$$$$F       3$$ $$$$$$$$$$$$$$$$$$$$$
 $$$$$$$$$$$$$$$$$$$$$$$.         .d$$$$$$$         $PJ$$$$$$$$$$$$$$$$$$$$$
 $$$$$$$$$$$$$$$$$$$$$$$$eeeeeeed$*""""**""         $\$$$$$$$$$$$$$$$$$$$$$$
 $$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$                  $d$$$$$$$$$$$$$$$$$$$$$$
 $$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$.                 $$$$$$$$$$$$$$$$$$$$$$$$
 $$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$e.              d$$$$$$$$$$$$$$$$$$$$$$$$
 $$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$eeeeeee$$$$$$$$$$$$$$$$$$$$$$$$$$
 $$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$
 $$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$
 */

const Web3 = require('web3');
const BigNumber = require('bignumber.js');
const _ = require('lodash');
const inquirer = require('inquirer');
const chalk = require('chalk');

const Logger = require('./lib/logger');
const { decimate, formatNumber } = require('./lib/numberutil');

/*
 * Set up Web3
 */
const provider = 'https://bsc-dataseed.binance.org/'; // BSC JSON RPC
const web3Provider = new Web3.providers.HttpProvider(provider);
const web3 = new Web3(web3Provider);

/*
 * ABIs
 */
const erc20Abi = require('./lib/abi/erc20.json');
const lpAbi = require('./lib/abi/uni_v2_lp.json');
const masterChefAbi = require('./lib/abi/masterchef.json');

/*
 * Constants
 */
const supportedPools = require('./lib/pools');
const priceOracles = require('./lib/oracles')(web3);

const MASTER_CHEF_ADDRESS = '0x9942cb4c6180820E6211183ab29831641F58577A';
const masterChefContract = new web3.eth.Contract(
  masterChefAbi,
  MASTER_CHEF_ADDRESS // Panda Farming Contract Address
);

// BSC has an approx 3s block time
// 365 * 24 * 60 * (60 / 3) = 10512000
// (365 / 12) * 24 * 60 * (60 / 3) = 876000
// (365 / 52) * 24 * 60 * (60 / 3) = 20214
const BLOCKS_PER_YEAR = new BigNumber(10512000);
const BLOCKS_PER_MONTH = new BigNumber(876000);
const BLOCKS_PER_WEEK = new BigNumber(20214);

const run = async (pool, log = true) => {
  // Create LP Contract
  const lpAddress = pool.lpAddresses[56];
  const lpContract = new web3.eth.Contract(
    lpAbi,
    lpAddress
  );

  if (log) {
    Logger.debug('Calling chain...');
    Logger.info('LP Name: ' + chalk.yellow(pool.name));
    Logger.info('LP Symbol: ' + chalk.yellow(pool.symbol));
  }

  // Get token addresses from LP Contract
  const [
    token0,
    token1,
  ] = await Promise.all([
    lpContract.methods.token0().call(),
    lpContract.methods.token1().call(),
  ]);

  // Create Token contracts
  const token0Contract = new web3.eth.Contract(erc20Abi, token0);
  const token1Contract = new web3.eth.Contract(erc20Abi, token1);

  // Get token symbols/decimals and LP contract reserves
  const [
    token0Symbol,
    token0Decimals,
    token1Symbol,
    token1Decimals,
    reserves
  ] = await Promise.all([
    token0Contract.methods.symbol().call(),
    token0Contract.methods.decimals().call(),
    token1Contract.methods.symbol().call(),
    token1Contract.methods.decimals().call(),
    lpContract.methods.getReserves().call()
  ]);

  if (log) {
    Logger.info(
      'Tokens: ' +
      chalk.cyan(token0Symbol) + ' (' + chalk.blue(token0) + ') - ' +
      chalk.cyan(token1Symbol) + ' (' + chalk.blue(token1) + ')'
    );

    Logger.separator();

    Logger.info('Reserves: ');
    Logger.info(
      formatNumber(new BigNumber(reserves[0]), token0Decimals) +
      ' ' + chalk.cyan(token0Symbol)
    );
    Logger.info(
      formatNumber(new BigNumber(reserves[1]), token1Decimals) +
      ' ' + chalk.cyan(token1Symbol)
    );
  }

  // Check which underlying asset inside of the LP Token has a price oracle
  const oracleToken = _.includes(_.keys(priceOracles), token0Symbol);
  const [oracleTokenPrice, oracleTokenDecimals] =
    oracleToken
      ? await getOraclePrice(token0Symbol, log)
      : await getOraclePrice(token1Symbol, log);

  const tvl = decimate(new BigNumber(reserves[oracleToken ? 0 : 1]))
    .times(
      decimate(new BigNumber(oracleTokenPrice), oracleTokenDecimals).toNumber()
    )
    .times(2)
    .toNumber().toFixed(2);

  if (log) Logger.separator();

  // Get reward per block, total LP supply, and total LP locked
  const [
    reward,
    totalSupply,
    totalLocked,
  ] = await Promise.all([
    masterChefContract.methods.getNewRewardPerBlock(pool.pid + 1).call(),
    lpContract.methods.totalSupply().call(),
    lpContract.methods.balanceOf(MASTER_CHEF_ADDRESS).call(),
  ]);

  if (log) {
    Logger.info(
      'Total Supply (LP): ' +
      chalk.magenta(formatNumber(new BigNumber(totalSupply)))
    );
    Logger.info(
      'Total Locked (LP): ' +
      chalk.magenta(formatNumber(new BigNumber(totalLocked)))
    );

    const lockedPercentage = new BigNumber(totalLocked)
      .div(new BigNumber(totalSupply))
      .times(100)
      .toNumber()
      .toFixed(2);

    Logger.info(
      'Locked Ratio: ' + chalk.yellow(lockedPercentage + '%')
    );
    Logger.info(
      'Total Supply Value: ' +
      chalk.green('$' + formatNumber(new BigNumber(tvl), 0))
    );

    const lockedUsd = (tvl * (lockedPercentage / 100));
    Logger.info(
      'Total Locked Value: ' +
      chalk.green('$' + formatNumber(new BigNumber(lockedUsd), 0))
    );

    const pndaPrice = await pndaPriceUsd();
    Logger.info('PNDA Price USD: ' + chalk.green('$' + pndaPrice))

    Logger.separator();

    const decimatedReward = decimate(new BigNumber(reward), 17 /* pnda decimals - 1 */);
    Logger.info(
      'Current Reward Per Block: ' +
      chalk.red(decimate(new BigNumber(reward)))
    );

    // Calculate ROIs
    const roi = {
      apy: new BigNumber(pndaPrice)
            .times(decimatedReward)
            .times(BLOCKS_PER_YEAR)
            .div(lockedUsd),
      mpy: new BigNumber(pndaPrice)
            .times(decimatedReward)
            .times(BLOCKS_PER_MONTH)
            .div(lockedUsd),
      wpy: new BigNumber(pndaPrice)
            .times(decimatedReward)
            .times(BLOCKS_PER_WEEK)
            .div(lockedUsd)
    };

    Logger.info('ROI (1 year): ' + chalk.yellow(formatNumber(roi.apy, 0) + '%'));
    Logger.info('ROI (1 month): ' + chalk.yellow(formatNumber(roi.mpy, 0) + '%'));
    Logger.info('ROI (1 week): ' + chalk.yellow(formatNumber(roi.wpy, 0) + '%'));

    prompt();
  } else {
    const token = oracleToken ? 1 : 0;

    return new BigNumber(tvl / 2).div(
      decimate(
        new BigNumber(reserves[token]),
        token1Decimals
      )
    );
  }
};

/* Average PNDA Price across 5 pools */
const pndaPriceUsd = async () => {
  const [
    resultA,
    resultB,
    resultC,
    resultD,
    resultE,
  ] = await Promise.all([
    run(_.find(supportedPools, { pid: 0 }), false),
    run(_.find(supportedPools, { pid: 1 }), false),
    run(_.find(supportedPools, { pid: 2 }), false),
    run(_.find(supportedPools, { pid: 3 }), false),
    run(_.find(supportedPools, { pid: 4 }), false),
  ]);

  return resultA
    .plus(resultB)
    .plus(resultC)
    .plus(resultD)
    .plus(resultE)
    .div(5)
    .toNumber();
}

/* Get oracle token price and decimals */
const getOraclePrice = async (tokenSymbol, log) => {
  const [
    tokenPrice,
    tokenDecimals,
  ] = await Promise.all([
    priceOracles[tokenSymbol].contract.methods.latestAnswer().call(),
    priceOracles[tokenSymbol].contract.methods.decimals().call()
  ]);

  if (log)
    Logger.info(
      tokenSymbol + ' Price: ' +
      chalk.green(
          '$' + formatNumber(new BigNumber(tokenPrice), tokenDecimals)
      )
    );

  return [tokenPrice, tokenDecimals];
}

const prompt = () =>
  inquirer.prompt({
    type: 'input',
    name: 'input',
    message: 'Enter pid to query (\'exit\' to quit the program)'
  }).then(function (pid) {
    pid = pid.input;

    if (pid.toLowerCase() === 'exit' ||
        pid.toLowerCase() === 'quit' ||
        pid.toLowerCase() === 'q' ||
        pid.toLowerCase() === 'stop')
      return Logger.success('Exited Program.');
    else if (isNaN(pid) || !_.find(supportedPools, { pid: parseInt(pid) })) {
      Logger.error('Input is not a valid PID.')
      return prompt();
    }

    run(_.find(supportedPools, { pid: parseInt(pid) }));
  });

// Run prompt initially
prompt();

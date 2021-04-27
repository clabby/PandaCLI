# 🐼 PandaCLI

PandaCLI is a Node.js console application that queries [Bao Finance](https://bao.finance)'s [PandaSwap (PNDA)](https://docs.bao.finance/franchises/panda) LP Contracts on Binance Smart Chain.

This project is a testing ground for me to figure out how to interact with the Panda Farm contracts and BSC, and it will probably not be updated again once the Panda Farms stats are implemented into [BaoView](https://github.com/clabby/BaoView).

## Features

PandaView CLI currently displays:
* LP Contract Reserves
* LP in Supply
* LP Locked in Panda Farms
* LP Supply USD Value
* Locked LP USD Value
* Locked / Supply Ratio
* Current PNDA Price from ChainLink price oracles deployed on BSC.
* Current Reward per block
* ROI (Year / Month / Week)

For all double-sided pools on Panda Farms.

## Usage

Clone the repo

`git clone git@github.com:clabby/PandaCLI.git`

Install dependencies

`yarn` or `npm install`

Start program

`yarn start` or `npm run start` or `node index.js`

## Preview

![Preview](https://i.imgur.com/0igLD1s.gif)

## License

See LICENSE.md

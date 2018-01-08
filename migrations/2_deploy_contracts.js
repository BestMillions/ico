var BestMillionsCrowdsale = artifacts.require('BestMillionsCrowdsale.sol');

var config = require('../icoConfig.json');

module.exports = function(deployer, network, accounts) {
  // Use deployer to state migration tasks.

  return liveDeploy(deployer, network, accounts);

};

function latestTime () {

  return web3.eth.getBlock('latest').timestamp;

}

function ether (n) {

  return new web3.BigNumber(web3.toWei(n, 'ether'));

}

const duration = {
  seconds: function (val) { return val; },
  minutes: function (val) { return val * this.seconds(60); },
  hours: function (val) { return val * this.minutes(60); },
  days: function (val) { return val * this.hours(24); },
  weeks: function (val) { return val * this.days(7); },
  years: function (val) { return val * this.days(365); },
};

async function liveDeploy(deployer, network, accounts) {

  const BigNumber = web3.BigNumber;

  let START_TIME;
  let END_TIME;

  if ( network == 'development' ) {

    START_TIME  = latestTime() + duration.hours(1);
    END_TIME    = START_TIME + (config.icoEnd - config.icoStart);

  } else {

    START_TIME  = config.icoStart;
    END_TIME    = config.icoEnd;

  }

  const RATE        = new BigNumber(config.baseRate);
  const CAP         = ether(config.crowdSaleCap_ETH);
  const GOAL        = ether(config.crowdSaleGoal_ETH);  
  const COIN_CAP    = ether(config.tokenCap);

  /*
  console.log([
    START_TIME,
    END_TIME,
    RATE.toNumber(),
    accounts[0],
    CAP.toNumber(),
    GOAL.toNumber(),
    COIN_CAP.toNumber()
  ]);
  */

  // uint256 _startTime, uint256 _endTime, uint256 _rate, address _wallet, uint256 _cap, uint256 _goal, uint256 _coinCap
  return deployer.deploy(BestMillionsCrowdsale, START_TIME, END_TIME, RATE, accounts[0], CAP, GOAL, COIN_CAP).then(async () => {
    const instance  = await BestMillionsCrowdsale.deployed();
    const token     = await instance.token.call();

    console.log('Crowdsale address', instance.address);
    console.log('Token address', token);

  });

}

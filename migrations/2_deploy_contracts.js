var BestMillionsCrowdsale = artifacts.require('BestMillionsCrowdsale.sol');

module.exports = function(deployer, network, accounts) {
  // Use deployer to state migration tasks.

  return liveDeploy(deployer, accounts);

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

async function liveDeploy(deployer, accounts) {

  const BigNumber = web3.BigNumber;

  const startTime = latestTime() + duration.weeks(1);
  const endTime   = startTime + duration.days(1) + duration.weeks(5);
  const RATE      = new BigNumber(16000);
  const cap       = ether(12187,5);
  const goal      = ether(2437,5);  
  const coinCap   = ether(300000000);

  /*
  console.log([
    startTime,
    endTime,
    RATE.toNumber(),
    accounts[0],
    cap.toNumber(),
    goal.toNumber(),
    coinCap.toNumber()
  ]);
  */

  // uint256 _startTime, uint256 _endTime, uint256 _rate, address _wallet, uint256 _cap, uint256 _goal, uint256 _coinCap
  return deployer.deploy(BestMillionsCrowdsale, startTime, endTime, RATE, accounts[0], cap, goal, coinCap).then(async () => {

    const instance  = await BestMillionsCrowdsale.deployed();
    const token     = await instance.token.call();

    console.log('Crowdsale address', instance.address);
    console.log('Token address', token);

  });

}

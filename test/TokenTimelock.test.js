import { increaseTimeTo, duration } from '../node_modules/zeppelin-solidity/test/helpers/increaseTime';
import latestTime from '../node_modules/zeppelin-solidity/test/helpers/latestTime';
import ether from '../node_modules/zeppelin-solidity/test/helpers/ether';

const BigNumber = web3.BigNumber;

require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should();

var config = require('../icoConfig.json');

const BestMillionsCrowdsale = artifacts.require('BestMillionsCrowdsale');
const BestMillionsToken = artifacts.require('BestMillionsToken');
const TokenTimelock = artifacts.require('TokenTimelock');

contract('TokenTimelock', function (accounts) {

  let investor = accounts[2];

  const RATE = new BigNumber(config.baseRate);
  const GOAL = ether(config.crowdSaleGoal_ETH);  
  const CAP = ether(config.crowdSaleCap_ETH);
  const COIN_CAP = ether(config.tokenCap);

  const amount = new BigNumber(100);

  const percentages = [
    7.5,
    3.75,
    3.75,
    1
  ];

  const beneficiaries = [
      accounts[3],
      accounts[4],
      accounts[5],
      accounts[6]
  ];

  beforeEach(async function() {

    this.startTime  = latestTime() + duration.hours(1);
    this.endTime    = this.startTime + (config.icoEnd - config.icoStart);

    this.afterEndTime = this.endTime + duration.hours(1);

    this.crowdsale = await BestMillionsCrowdsale.new(
      this.startTime,
      this.endTime,
      RATE,
      accounts[0],
      CAP,
      GOAL,
      COIN_CAP
    );

    this.token = BestMillionsToken.at(await this.crowdsale.token());

    this.releaseTime = this.endTime + duration.years(1);

    await increaseTimeTo(this.startTime + duration.hours(1));

    const investmentAmount = ether(1000);
    await this.crowdsale.buyTokens(investor, { value: investmentAmount, from: investor });

    await increaseTimeTo(this.endTime + duration.hours(1));

    await this.crowdsale.finalize();

  });

  it('cannot be released before time limit', async function () {

    for ( var i = 0; i < beneficiaries.length; i++ ) {

        this.timelock = TokenTimelock.at(await this.crowdsale.timeLocks(i));
        await this.timelock.release({from: beneficiaries[i]}).should.be.rejected;

    }

  });

  it('cannot be released just before time limit', async function () {

    await increaseTimeTo(this.releaseTime - duration.seconds(3));

    for ( var i = 0; i < beneficiaries.length; i++ ) {

        this.timelock = TokenTimelock.at(await this.crowdsale.timeLocks(i));
        await this.timelock.release({from: beneficiaries[i]}).should.be.rejected;

    }

  });

  it('can be released just after limit', async function () {

    await increaseTimeTo(this.releaseTime + duration.seconds(1));
    
    for ( var i = 0; i < beneficiaries.length; i++ ) {

        this.timelock = TokenTimelock.at(await this.crowdsale.timeLocks(i));
        await this.timelock.release().should.be.fulfilled;

        const balance = await this.token.balanceOf(beneficiaries[i]);
        const totalSupply = await this.token.totalSupply();
        const expectedAmount = totalSupply.div(100).mul(percentages[i]).round();

        balance.should.be.bignumber.equals(expectedAmount);

    }

  });

  it('cannot be released twice', async function () {

    await increaseTimeTo(this.releaseTime + duration.hours(2));
    
    for ( var i = 0; i < beneficiaries.length; i++ ) {

        this.timelock = TokenTimelock.at(await this.crowdsale.timeLocks(i));
        await this.timelock.release().should.be.fulfilled;
        await this.timelock.release().should.be.rejected;

        const balance = await this.token.balanceOf(beneficiaries[i]);
        const totalSupply = await this.token.totalSupply();
        const expectedAmount = totalSupply.div(100).mul(percentages[i]).round();
        
        balance.should.be.bignumber.equals(expectedAmount);

    }
    
  });

});
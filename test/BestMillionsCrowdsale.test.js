import ether from '../node_modules/zeppelin-solidity/test/helpers/ether';
import { advanceBlock } from '../node_modules/zeppelin-solidity/test/helpers/advanceToBlock';
import { increaseTimeTo, duration } from '../node_modules/zeppelin-solidity/test/helpers/increaseTime';
import latestTime from '../node_modules/zeppelin-solidity/test/helpers/latestTime';
import EVMRevert from '../node_modules/zeppelin-solidity/test/helpers/EVMRevert';

const BigNumber = web3.BigNumber;

require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should();

var config = require('../icoConfig.json');

const BestMillionsCrowdsale = artifacts.require('BestMillionsCrowdsale');
const BestMillionsToken = artifacts.require('BestMillionsToken');

contract('BestMillionsCrowdsale', function ([owner, wallet, investor]) {
  
  const RATE = new BigNumber(config.baseRate);
  const GOAL = ether(config.crowdSaleGoal_ETH);  
  const CAP = ether(config.crowdSaleCap_ETH);
  const COIN_CAP = ether(config.tokenCap);

  before(async function () {
    // Advance to the next block to correctly read time in the solidity "now" function interpreted by testrpc
    await advanceBlock();
    
    this.getCurrentRate = function(time) {
  
      if ( time < duration.days(1) )
        return RATE.mul(130).div(100);
      else if ( time < duration.days(1) + duration.days(7) )
        return RATE.mul(120).div(100);
      else if ( time < duration.days(1) + duration.days(7) + duration.days(7) )
        return RATE.mul(115).div(100);
      else if ( time < duration.days(1) + duration.days(7) + duration.days(7) + duration.days(7) )
        return RATE.mul(110).div(100);
      else if ( time < duration.days(1) + duration.days(7) + duration.days(7) + duration.days(7) + duration.days(7) )
        return RATE.mul(105).div(100);
      else
        return RATE;

    }

  });

  beforeEach(async function () {

    this.startTime  = latestTime() + duration.days(1);
    this.endTime    = this.startTime + (config.icoEnd - config.icoStart);

    this.afterEndTime = this.endTime + duration.seconds(1);

    /*
      uint256 _startTime,
      uint256 _endTime,
      uint256 _rate,
      address _wallet,
      uint256 _cap,
      uint256 _goal,
      uint256 _coinCap
    */

    this.crowdsale = await BestMillionsCrowdsale.new(
      this.startTime,
      this.endTime,
      RATE,
      wallet,
      CAP,
      GOAL,
      COIN_CAP,
    );

    this.token = BestMillionsToken.at(await this.crowdsale.token());

  });
  
  it('should create crowdsale with correct parameters', async function () {

    this.crowdsale.should.exist;
    this.token.should.exist;

    const startTime = await this.crowdsale.startTime();
    const endTime = await this.crowdsale.endTime();
    const rate = await this.crowdsale.rate();
    const walletAddress = await this.crowdsale.wallet();
    const goal = await this.crowdsale.goal();
    const cap = await this.crowdsale.cap();
    const coin_cap = await this.token.cap();

    startTime.should.be.bignumber.equal(this.startTime);
    endTime.should.be.bignumber.equal(this.endTime);
    rate.should.be.bignumber.equal(RATE);
    walletAddress.should.be.equal(wallet);
    goal.should.be.bignumber.equal(GOAL);
    cap.should.be.bignumber.equal(CAP);
    coin_cap.should.be.bignumber.equal(COIN_CAP);

  });

  it('should not accept payments before start', async function () {
    await this.crowdsale.send(ether(1)).should.be.rejectedWith(EVMRevert);
    await this.crowdsale.buyTokens(investor, { from: investor, value: ether(1) }).should.be.rejectedWith(EVMRevert);
  });

  it('should accept payments during the sale', async function () {
    const investmentAmount = ether(1);
    const timeFromStart = duration.hours(3);

    const expectedTokenAmount = this.getCurrentRate(timeFromStart).mul(investmentAmount);

    await increaseTimeTo(this.startTime + timeFromStart);

    await this.crowdsale.buyTokens(investor, { value: investmentAmount, from: investor }).should.be.fulfilled;

    const balanceOf = await this.token.balanceOf(investor);
    const totalSupply = await this.token.totalSupply();

    balanceOf.should.be.bignumber.equal(expectedTokenAmount);
    totalSupply.should.be.bignumber.equal(expectedTokenAmount);
  });

  it('should reject payments after end', async function () {
    await increaseTimeTo(this.afterEnd);
    await this.crowdsale.send(ether(1)).should.be.rejectedWith(EVMRevert);
    await this.crowdsale.buyTokens(investor, { value: ether(1), from: investor }).should.be.rejectedWith(EVMRevert);
  });

  it('should reject payments over cap', async function () {
    await increaseTimeTo(this.startTime);
    await this.crowdsale.send(CAP);
    await this.crowdsale.send(1).should.be.rejectedWith(EVMRevert);
  });

  it('should allow finalization and transfer funds to wallet if the goal is reached', async function () {
    await increaseTimeTo(this.startTime);
    await this.crowdsale.send(GOAL);

    const beforeFinalization = web3.eth.getBalance(wallet);
    await increaseTimeTo(this.afterEndTime);
    await this.crowdsale.finalize({ from: owner });
    const afterFinalization = web3.eth.getBalance(wallet);

    afterFinalization.minus(beforeFinalization).should.be.bignumber.equal(GOAL);
  });

  it('should allow refunds if the goal is not reached', async function () {
    const balanceBeforeInvestment = web3.eth.getBalance(investor);

    await increaseTimeTo(this.startTime);
    await this.crowdsale.sendTransaction({ value: ether(1), from: investor, gasPrice: 0 });
    await increaseTimeTo(this.afterEndTime);

    await this.crowdsale.finalize({ from: owner });
    await this.crowdsale.claimRefund({ from: investor, gasPrice: 0 }).should.be.fulfilled;

    const balanceAfterRefund = web3.eth.getBalance(investor);
    balanceBeforeInvestment.should.be.bignumber.equal(balanceAfterRefund);
  });
  
});
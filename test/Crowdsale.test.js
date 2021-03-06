import ether from '../node_modules/zeppelin-solidity/test/helpers/ether';
import { advanceBlock } from '../node_modules/zeppelin-solidity/test/helpers/advanceToBlock';
import { increaseTimeTo, duration } from '../node_modules/zeppelin-solidity/test/helpers/increaseTime';
import latestTime from '../node_modules/zeppelin-solidity/test/helpers/latestTime';
import EVMRevert from '../node_modules/zeppelin-solidity/test/helpers/EVMRevert';

const BigNumber = web3.BigNumber;

const should = require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should();

var config = require('../icoConfig.json');

const BestMillionsCrowdsale = artifacts.require('BestMillionsCrowdsale');
const BestMillionsToken = artifacts.require('BestMillionsToken');
  
contract('Crowdsale', function ([_, investor, wallet, purchaser]) {

  const RATE = new BigNumber(config.baseRate);
  const GOAL = ether(config.crowdSaleGoal_ETH);  
  const CAP = ether(config.crowdSaleCap_ETH);
  const COIN_CAP = ether(config.tokenCap);

  const value = ether(42);

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

      this.expectedTokenAmount = this.getCurrentRate(0).mul(value);

  });

  it('should be token owner', async function () {
    const owner = await this.token.owner();
    owner.should.equal(this.crowdsale.address);
  });

  it('should be ended only after end', async function () {
    let ended = await this.crowdsale.hasEnded();
    ended.should.equal(false);
    await increaseTimeTo(this.afterEndTime);
    ended = await this.crowdsale.hasEnded();
    ended.should.equal(true);
  });

  describe('accepting payments', function () {
    it('should reject payments before start', async function () {
      await this.crowdsale.send(value).should.be.rejectedWith(EVMRevert);
      await this.crowdsale.buyTokens(investor, { from: purchaser, value: value }).should.be.rejectedWith(EVMRevert);
    });

    it('should accept payments after start', async function () {
      await increaseTimeTo(this.startTime);
      await this.crowdsale.send(value).should.be.fulfilled;
      await this.crowdsale.buyTokens(investor, { value: value, from: purchaser }).should.be.fulfilled;
    });

    it('should reject payments after end', async function () {
      await increaseTimeTo(this.afterEndTime);
      await this.crowdsale.send(value).should.be.rejectedWith(EVMRevert);
      await this.crowdsale.buyTokens(investor, { value: value, from: purchaser }).should.be.rejectedWith(EVMRevert);
    });
  });

  describe('high-level purchase', function () {
    beforeEach(async function () {
      await increaseTimeTo(this.startTime);
      this.expectedTokenAmount = this.getCurrentRate(0).mul(value);
    });

    it('should log purchase', async function () {
      const { logs } = await this.crowdsale.sendTransaction({ value: value, from: investor });

      const event = logs.find(e => e.event === 'TokenPurchase');

      should.exist(event);
      event.args.purchaser.should.equal(investor);
      event.args.beneficiary.should.equal(investor);
      event.args.value.should.be.bignumber.equal(value);
      event.args.amount.should.be.bignumber.equal(this.expectedTokenAmount);
    });

    it('should increase totalSupply', async function () {
      await this.crowdsale.send(value);
      const totalSupply = await this.token.totalSupply();
      totalSupply.should.be.bignumber.equal(this.expectedTokenAmount);
    });

    it('should assign tokens to sender', async function () {
      await this.crowdsale.sendTransaction({ value: value, from: investor });
      let balance = await this.token.balanceOf(investor);
      balance.should.be.bignumber.equal(this.expectedTokenAmount);
    });

    it('should forward funds to vault', async function () {
      const vault = await this.crowdsale.vault();
      const pre = web3.eth.getBalance(vault);
      await this.crowdsale.sendTransaction({ value, from: investor });
      const post = web3.eth.getBalance(vault);
      post.minus(pre).should.be.bignumber.equal(value);
    });
  });

  describe('low-level purchase', function () {
    beforeEach(async function () {
      await increaseTimeTo(this.startTime);
    });

    it('should log purchase', async function () {
      const { logs } = await this.crowdsale.buyTokens(investor, { value: value, from: purchaser });

      const event = logs.find(e => e.event === 'TokenPurchase');

      should.exist(event);
      event.args.purchaser.should.equal(purchaser);
      event.args.beneficiary.should.equal(investor);
      event.args.value.should.be.bignumber.equal(value);
      event.args.amount.should.be.bignumber.equal(this.expectedTokenAmount);
    });

    it('should increase totalSupply', async function () {
      await this.crowdsale.buyTokens(investor, { value, from: purchaser });
      const totalSupply = await this.token.totalSupply();
      totalSupply.should.be.bignumber.equal(this.expectedTokenAmount);
    });

    it('should assign tokens to beneficiary', async function () {
      await this.crowdsale.buyTokens(investor, { value, from: purchaser });
      const balance = await this.token.balanceOf(investor);
      balance.should.be.bignumber.equal(this.expectedTokenAmount);
    });

    it('should forward funds to vault', async function () {
      const vault = await this.crowdsale.vault();
      const pre = web3.eth.getBalance(vault);
      await this.crowdsale.buyTokens(investor, { value, from: purchaser });
      const post = web3.eth.getBalance(vault);
      post.minus(pre).should.be.bignumber.equal(value);
    });
  });
});
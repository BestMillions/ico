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

contract('BestMillionsCrowdsale', function ([_, wallet]) {

  const RATE = new BigNumber(config.baseRate);
  const GOAL = ether(config.crowdSaleGoal_ETH);  
  const CAP = ether(config.crowdSaleCap_ETH);
  const COIN_CAP = ether(config.tokenCap);

  const lessThanCap = ether(100);

  before(async function () {
    // Advance to the next block to correctly read time in the solidity "now" function interpreted by testrpc
    await advanceBlock();
  });

  beforeEach(async function () {

    this.startTime  = latestTime() + duration.days(1);
    this.endTime    = this.startTime + (config.icoEnd - config.icoStart);

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

  describe('creating a valid crowdsale', function () {
    it('should fail with zero cap', async function () {
      await BestMillionsCrowdsale.new(this.startTime, this.endTime, RATE, wallet, 0, GOAL, COIN_CAP).should.be.rejectedWith(EVMRevert);
    });
  });

  describe('accepting payments', function () {
    beforeEach(async function () {
      await increaseTimeTo(this.startTime);
    });

    it('should accept payments within cap', async function () {
      await this.crowdsale.send(CAP.minus(lessThanCap)).should.be.fulfilled;
      await this.crowdsale.send(lessThanCap).should.be.fulfilled;
    });

    it('should reject payments outside cap', async function () {
      await this.crowdsale.send(CAP);
      await this.crowdsale.send(1).should.be.rejectedWith(EVMRevert);
    });

    it('should reject payments that exceed cap', async function () {
      await this.crowdsale.send(CAP.plus(1)).should.be.rejectedWith(EVMRevert);
    });
  });

  describe('ending', function () {
    beforeEach(async function () {
      await increaseTimeTo(this.startTime);
    });

    it('should not be ended if under cap', async function () {
      let hasEnded = await this.crowdsale.hasEnded();
      hasEnded.should.equal(false);
      await this.crowdsale.send(lessThanCap);
      hasEnded = await this.crowdsale.hasEnded();
      hasEnded.should.equal(false);
    });

    it('should not be ended if just under cap', async function () {
      await this.crowdsale.send(CAP.minus(1));
      let hasEnded = await this.crowdsale.hasEnded();
      hasEnded.should.equal(false);
    });

    it('should be ended if cap reached', async function () {
      await this.crowdsale.send(CAP);
      let hasEnded = await this.crowdsale.hasEnded();
      hasEnded.should.equal(true);
    });
  });
});
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

const BestMillionsCrowdsale = artifacts.require('BestMillionsCrowdsale');

contract('RefundableCrowdsale', function ([_, owner, wallet, investor]) {

  const RATE = new BigNumber(16000);
  const GOAL = ether(2437,5);
  const CAP = ether(12187,5);
  const COIN_CAP = ether(300000000);

  const lessThanGoal = ether(2000);

  before(async function () {
    // Advance to the next block to correctly read time in the solidity "now" function interpreted by testrpc
    await advanceBlock();
  });

  beforeEach(async function () {
    this.startTime = latestTime() + duration.weeks(1);
    this.endTime = this.startTime + duration.weeks(1);
    this.afterEndTime = this.endTime + duration.seconds(1);

    this.crowdsale = await BestMillionsCrowdsale.new(
        this.startTime,
        this.endTime,
        RATE,
        wallet,
        CAP,
        GOAL,
        COIN_CAP,
        { from: owner }
      );
  });

  describe('creating a valid crowdsale', function () {
    it('should fail with zero goal', async function () {
        await BestMillionsCrowdsale.new(
            this.startTime,
            this.endTime,
            RATE,
            wallet,
            CAP,
            0,
            COIN_CAP,
            { from: owner }
        )
        .should.be.rejectedWith(EVMRevert);
    });
  });

  it('should deny refunds before end', async function () {
    await this.crowdsale.claimRefund({ from: investor }).should.be.rejectedWith(EVMRevert);
    await increaseTimeTo(this.startTime);
    await this.crowdsale.claimRefund({ from: investor }).should.be.rejectedWith(EVMRevert);
  });

  it('should deny refunds after end if goal was reached', async function () {
    await increaseTimeTo(this.startTime);
    await this.crowdsale.sendTransaction({ value: GOAL, from: investor });
    await increaseTimeTo(this.afterEndTime);
    await this.crowdsale.claimRefund({ from: investor }).should.be.rejectedWith(EVMRevert);
  });

  it('should allow refunds after end if goal was not reached', async function () {
    await increaseTimeTo(this.startTime);
    await this.crowdsale.sendTransaction({ value: lessThanGoal, from: investor });
    await increaseTimeTo(this.afterEndTime);

    await this.crowdsale.finalize({ from: owner });

    const pre = web3.eth.getBalance(investor);
    await this.crowdsale.claimRefund({ from: investor, gasPrice: 0 })
      .should.be.fulfilled;
    const post = web3.eth.getBalance(investor);

    post.minus(pre).should.be.bignumber.equal(lessThanGoal);
  });

  it('should forward funds to wallet after end if goal was reached', async function () {
    await increaseTimeTo(this.startTime);
    await this.crowdsale.sendTransaction({ value: GOAL, from: investor });
    await increaseTimeTo(this.afterEndTime);

    const pre = web3.eth.getBalance(wallet);
    await this.crowdsale.finalize({ from: owner });
    const post = web3.eth.getBalance(wallet);

    post.minus(pre).should.be.bignumber.equal(GOAL);
  });
});
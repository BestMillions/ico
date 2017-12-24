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

const BestMillionsCrowdsale = artifacts.require('BestMillionsCrowdsale');
const BestMillionsToken = artifacts.require('BestMillionsToken');

contract('FinalizableCrowdsale', function ([_, owner, wallet, thirdparty]) {

  const RATE = new BigNumber(16000);
  const GOAL = ether(2437,5);
  const CAP = ether(12187,5);
  const COIN_CAP = ether(300000000);

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
  
      this.token = BestMillionsToken.at(await this.crowdsale.token());

  });

  it('cannot be finalized before ending', async function () {
    await this.crowdsale.finalize({ from: owner }).should.be.rejectedWith(EVMRevert);
  });

  it('cannot be finalized by third party after ending', async function () {
    await increaseTimeTo(this.afterEndTime);
    await this.crowdsale.finalize({ from: thirdparty }).should.be.rejectedWith(EVMRevert);
  });

  it('can be finalized by owner after ending', async function () {
    await increaseTimeTo(this.afterEndTime);
    await this.crowdsale.finalize({ from: owner }).should.be.fulfilled;
  });

  it('cannot be finalized twice', async function () {
    await increaseTimeTo(this.afterEndTime);
    await this.crowdsale.finalize({ from: owner });
    await this.crowdsale.finalize({ from: owner }).should.be.rejectedWith(EVMRevert);
  });

  it('logs finalized', async function () {
    await increaseTimeTo(this.afterEndTime);
    const { logs } = await this.crowdsale.finalize({ from: owner });
    const event = logs.find(e => e.event === 'Finalized');
    should.exist(event);
  });
});
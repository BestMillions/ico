import assertRevert from '../node_modules/zeppelin-solidity/test/helpers/assertRevert';
import expectThrow from '../node_modules/zeppelin-solidity/test/helpers/expectThrow';
import ether from '../node_modules/zeppelin-solidity/test/helpers/ether';

var BestMillionsToken = artifacts.require('BestMillionsToken.sol');

const BigNumber = web3.BigNumber;

require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should();

var config = require('../icoConfig.json');

contract('BestMillionsToken', function (accounts) {

  const COIN_CAP = ether(config.tokenCap);

  let token;

  beforeEach(async function () {
    token = await BestMillionsToken.new(COIN_CAP);
  });

  /*
    Cap tests
  */
  it('should start with the correct cap', async function () {
    let _cap = await token.cap();

    assert(COIN_CAP.eq(_cap));
  });

  it('should mint when amount is less than cap', async function () {
    const result = await token.mint(accounts[0], 100);
    assert.equal(result.logs[0].event, 'Mint');
  });

  it('should fail to mint if the ammount exceeds the cap', async function () {
    await token.mint(accounts[0], COIN_CAP.sub(1));
    await expectThrow(token.mint(accounts[0], 100));
  });

  it('should fail to mint after cap is reached', async function () {
    await token.mint(accounts[0], COIN_CAP);
    await expectThrow(token.mint(accounts[0], 1));
  });

  /*
    Pause tests
  */
  it('should return paused false after construction', async function () {
    let paused = await token.paused();

    assert.equal(paused, false);
  });

  it('should return paused true after pause', async function () {
    await token.pause();
    let paused = await token.paused();

    assert.equal(paused, true);
  });

  it('should return paused false after pause and unpause', async function () {
    await token.pause();
    await token.unpause();
    let paused = await token.paused();

    assert.equal(paused, false);
  });

  it('should be able to transfer if transfers are unpaused', async function () {

    await token.mint(accounts[0], 100);

    await token.transfer(accounts[1], 100);
    let balance0 = await token.balanceOf(accounts[0]);
    assert.equal(balance0, 0);

    let balance1 = await token.balanceOf(accounts[1]);
    assert.equal(balance1, 100);
  });

  it('should be able to transfer after transfers are paused and unpaused', async function () {

    await token.mint(accounts[0], 100);

    await token.pause();
    await token.unpause();
    await token.transfer(accounts[1], 100);
    let balance0 = await token.balanceOf(accounts[0]);
    assert.equal(balance0, 0);

    let balance1 = await token.balanceOf(accounts[1]);
    assert.equal(balance1, 100);
  });

  it('should throw an error trying to transfer while transactions are paused', async function () {

    await token.mint(accounts[0], 100);

    await token.pause();
    try {
      await token.transfer(accounts[1], 100);
      assert.fail('should have thrown before');
    } catch (error) {
      assertRevert(error);
    }
  });

  it('should throw an error trying to transfer from another account while transactions are paused', async function () {

    await token.mint(accounts[0], 100);

    await token.pause();
    try {
      await token.transferFrom(accounts[0], accounts[1], 100);
      assert.fail('should have thrown before');
    } catch (error) {
      assertRevert(error);
    }
  });

  /*
    Mintable tests
  */
  it('should start with a totalSupply of 0', async function () {
    let totalSupply = await token.totalSupply();

    assert.equal(totalSupply, 0);
  });

  it('should return mintingFinished false after construction', async function () {
    let mintingFinished = await token.mintingFinished();

    assert.equal(mintingFinished, false);
  });

  it('should mint a given amount of tokens to a given address', async function () {
    const result = await token.mint(accounts[0], 100);
    assert.equal(result.logs[0].event, 'Mint');
    assert.equal(result.logs[0].args.to.valueOf(), accounts[0]);
    assert.equal(result.logs[0].args.amount.valueOf(), 100);
    assert.equal(result.logs[1].event, 'Transfer');
    assert.equal(result.logs[1].args.from.valueOf(), 0x0);

    let balance0 = await token.balanceOf(accounts[0]);
    assert(balance0, 100);

    let totalSupply = await token.totalSupply();
    assert(totalSupply, 100);
  });

  it('should fail to mint after call to finishMinting', async function () {
    await token.finishMinting();
    assert.equal(await token.mintingFinished(), true);
    await expectThrow(token.mint(accounts[0], 100));
  });

  /*
    Standard tests
  */
  it('should return the correct totalSupply after construction', async function () {
    
    await token.mint(accounts[0], 100);

    let totalSupply = await token.totalSupply();

    assert.equal(totalSupply, 100);
  });

  it('should return the correct allowance amount after approval', async function () {

    await token.mint(accounts[0], 100);

    await token.approve(accounts[1], 100);

    let allowance = await token.allowance(accounts[0], accounts[1]);
    assert.equal(allowance, 100);
  });

  it('should return correct balances after transfer', async function () {

    await token.mint(accounts[0], 100);

    await token.transfer(accounts[1], 100);

    let balance0 = await token.balanceOf(accounts[0]);
    assert.equal(balance0, 0);

    let balance1 = await token.balanceOf(accounts[1]);
    assert.equal(balance1, 100);
  });

  it('should throw an error when trying to transfer more than balance', async function () {

    await token.mint(accounts[0], 100);

    try {
      await token.transfer(accounts[1], 101);
      assert.fail('should have thrown before');
    } catch (error) {
      assertRevert(error);
    }
  });

  it('should return correct balances after transfering from another account', async function () {

    await token.mint(accounts[0], 100);

    await token.approve(accounts[1], 100);
    await token.transferFrom(accounts[0], accounts[2], 100, { from: accounts[1] });

    let balance0 = await token.balanceOf(accounts[0]);
    assert.equal(balance0, 0);

    let balance1 = await token.balanceOf(accounts[2]);
    assert.equal(balance1, 100);

    let balance2 = await token.balanceOf(accounts[1]);
    assert.equal(balance2, 0);
  });

  it('should throw an error when trying to transfer more than allowed', async function () {

    await token.mint(accounts[0], 100);

    await token.approve(accounts[1], 99);
    try {
      await token.transferFrom(accounts[0], accounts[2], 100, { from: accounts[1] });
      assert.fail('should have thrown before');
    } catch (error) {
      assertRevert(error);
    }
  });

  it('should throw an error when trying to transferFrom more than _from has', async function () {

    await token.mint(accounts[0], 100);

    let balance0 = await token.balanceOf(accounts[0]);
    await token.approve(accounts[1], 99);
    try {
      await token.transferFrom(accounts[0], accounts[2], balance0 + 1, { from: accounts[1] });
      assert.fail('should have thrown before');
    } catch (error) {
      assertRevert(error);
    }
  });

  describe('validating allowance updates to spender',  function () {

    let preApproved;

    it('should start with zero', async function () {

      await token.mint(accounts[0], 100);    
        
      preApproved = await token.allowance(accounts[0], accounts[1]);
      assert.equal(preApproved, 0);

    });

    it('should increase by 50 then decrease by 10', async function () {

      await token.increaseApproval(accounts[1], 50);
      let postIncrease = await token.allowance(accounts[0], accounts[1]);
      preApproved.plus(50).should.be.bignumber.equal(postIncrease);
      await token.decreaseApproval(accounts[1], 10);
      let postDecrease = await token.allowance(accounts[0], accounts[1]);
      postIncrease.minus(10).should.be.bignumber.equal(postDecrease);

    });
  });

  it('should increase by 50 then set to 0 when decreasing by more than 50', async function () {

    await token.mint(accounts[0], 100);

    await token.approve(accounts[1], 50);
    await token.decreaseApproval(accounts[1], 60);
    let postDecrease = await token.allowance(accounts[0], accounts[1]);

    assert.equal(postDecrease, 0);

});

  it('should throw an error when trying to transfer to 0x0', async function () {

    await token.mint(accounts[0], 100);

    try {
      await token.transfer(0x0, 100);
      assert.fail('should have thrown before');
    } catch (error) {
      assertRevert(error);
    }
  });

  it('should throw an error when trying to transferFrom to 0x0', async function () {

    await token.mint(accounts[0], 100);

    await token.approve(accounts[1], 100);
    
    try {
      await token.transferFrom(accounts[0], 0x0, 100, { from: accounts[1] });
      assert.fail('should have thrown before');
    } catch (error) {
      assertRevert(error);
    }
  });

  /*
    Basic tests
  */
  it('should return the correct totalSupply after construction', async function () {

    await token.mint(accounts[0], 100);    

    let totalSupply = await token.totalSupply();

    assert.equal(totalSupply, 100);

  });

  it('should return correct balances after transfer', async function () {
    
    await token.mint(accounts[0], 100);

    await token.transfer(accounts[1], 100);

    let firstAccountBalance = await token.balanceOf(accounts[0]);
    assert.equal(firstAccountBalance, 0);

    let secondAccountBalance = await token.balanceOf(accounts[1]);
    assert.equal(secondAccountBalance, 100);
  });

  it('should throw an error when trying to transfer more than balance', async function () {
    
    await token.mint(accounts[0], 100);
    
    try {
      await token.transfer(accounts[1], 101);
      assert.fail('should have thrown before');
    } catch (error) {
      assertRevert(error);
    }
  });

  it('should throw an error when trying to transfer to 0x0', async function () {
      
    await token.mint(accounts[0], 100);
    
    try {
      await token.transfer(0x0, 100);
      assert.fail('should have thrown before');
    } catch (error) {
      assertRevert(error);
    }
  });
});
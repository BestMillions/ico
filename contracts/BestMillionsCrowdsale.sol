pragma solidity ^0.4.18;


import '../node_modules/zeppelin-solidity/contracts/crowdsale/CappedCrowdsale.sol';
import '../node_modules/zeppelin-solidity/contracts/crowdsale/RefundableCrowdsale.sol';
import '../node_modules/zeppelin-solidity/contracts/token/TokenTimelock.sol';

import './BestMillionsToken.sol';

contract BestMillionsCrowdsale is CappedCrowdsale, RefundableCrowdsale {

    uint256 coinCap;

    TokenTimelock[4] public timeLocks;

    address[5] public addresses;

    function BestMillionsCrowdsale(
        uint256 _startTime,
        uint256 _endTime,
        uint256 _rate,
        address _wallet,
        uint256 _cap,
        uint256 _goal,
        uint256 _coinCap
    )
        public
        Crowdsale(_startTime, _endTime, _rate, _wallet)
        CappedCrowdsale(_cap)
        RefundableCrowdsale(_goal)
    {

        require(_goal <= cap);

        token = new BestMillionsToken(_coinCap);

        addresses[0] = 0xce42bdb34189a93c55de250e011c68faee374dd3;
        addresses[1] = 0x97a3fc5ee46852c1cf92a97b7bad42f2622267cc;
        addresses[2] = 0xb9dcbf8a52edc0c8dd9983fcc1d97b1f5d975ed7;
        addresses[3] = 0x26064a2e2b568d9a6d01b93d039d1da9cf2a58cd;
        addresses[4] = 0xe84da28128a48dd5585d1abb1ba67276fdd70776;

        uint64 releaseTime = uint64(_endTime + 1 years);

        timeLocks[0] = new TokenTimelock(token, addresses[0], releaseTime);
        timeLocks[1] = new TokenTimelock(token, addresses[1], releaseTime);
        timeLocks[2] = new TokenTimelock(token, addresses[2], releaseTime);
        timeLocks[3] = new TokenTimelock(token, addresses[3], releaseTime);

        PausableToken(token).pause();

    }

    function createTokenContract() internal returns (MintableToken) {
        /** 
            This returns an empty address because token needs arguments
        */
        return MintableToken(address(0));
    
    }
    
    function buyTokens(address beneficiary) public payable {
        require(beneficiary != address(0));
        require(validPurchase());

        uint256 weiAmount = msg.value;

        // calculate token amount to be created
        uint256 tokens = weiAmount.mul(calculateRate());

        // update state
        weiRaised = weiRaised.add(weiAmount);

        token.mint(beneficiary, tokens);
        TokenPurchase(msg.sender, beneficiary, weiAmount, tokens);

        forwardFunds();
    }

    function calculateRate() internal view returns (uint256) {
                
        if ( now <= startTime + 1 days )
            return rate.mul(130).div(100);
        else if ( now <= startTime + 1 days + 7 days )
            return rate.mul(120).div(100);
        else if ( now <= startTime + 1 days + 7 days + 7 days )
            return rate.mul(115).div(100);
        else if ( now <= startTime + 1 days + 7 days + 7 days + 7 days )
            return rate.mul(110).div(100);
        else if ( now <= startTime + 1 days + 7 days + 7 days + 7 days + 7 days )
            return rate.mul(105).div(100);
        else
            return rate;

    }

    function finalization() internal {

        mintResidualTokens();

        super.finalization();

        token.finishMinting();

        PausableToken(token).unpause();

        token.transferOwnership(addresses[3]);

    }

    function mintResidualTokens() internal {

        uint256 totalSupply = token.totalSupply();

        // Team member 1 gets 7.5% of total supply locked for 1 year
        token.mint(timeLocks[0], totalSupply.mul(75).div(740));
        
        // Team member 2 gets 3.75% of total supply locked for 1 year
        token.mint(timeLocks[1], totalSupply.mul(375).div(7400));

        // Team member 3 gets 3.75% of total supply locked for 1 year
        token.mint(timeLocks[2], totalSupply.mul(375).div(7400));

        // Tech team members get 2% of total supply locked for 1 year
        token.mint(timeLocks[3], totalSupply.mul(20).div(740));

        // 9% is transfered to a multisig wallet
        token.mint(addresses[4], totalSupply.mul(90).div(740));

    }

}
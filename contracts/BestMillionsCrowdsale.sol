pragma solidity ^0.4.18;


import '../node_modules/zeppelin-solidity/contracts/crowdsale/CappedCrowdsale.sol';
import '../node_modules/zeppelin-solidity/contracts/crowdsale/RefundableCrowdsale.sol';

import './BestMillionsToken.sol';

contract BestMillionsCrowdsale is CappedCrowdsale, RefundableCrowdsale {

    uint256 coinCap;

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

        PausableToken(token).unpause();

        super.finalization();

    }

}
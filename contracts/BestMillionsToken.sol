pragma solidity ^0.4.18;

import '../node_modules/zeppelin-solidity/contracts/token/CappedToken.sol';
import '../node_modules/zeppelin-solidity/contracts/token/PausableToken.sol';
import '../node_modules/zeppelin-solidity/contracts/token/BurnableToken.sol';


contract BestMillionsToken is CappedToken, PausableToken, BurnableToken {

    string public constant name = "Best Millions Token";
    string public constant symbol = "BMT";
    uint8 public constant decimals = 18;

    uint256 public rate;

    function BestMillionsToken(uint256 _cap)
        CappedToken(_cap)
        public
    {
        
    }

    function sellBack(uint256 _amount) public whenNotPaused {

        require(_amount > 0);
        require(_amount <= balances[msg.sender]);

        uint256 ethAmount = _amount.div(rate);

        require(ethAmount > 0);
        require(this.balance >= ethAmount);

        burn(_amount);

        msg.sender.transfer(ethAmount);

    }

    function depositFunds() public payable { }

    function withdrawFunds(uint256 _amount) onlyOwner public {

        require(_amount <= this.balance);

        msg.sender.transfer(_amount);

    }

    function setRate(uint256 _rate) onlyOwner public {

        rate = _rate;

    }

}
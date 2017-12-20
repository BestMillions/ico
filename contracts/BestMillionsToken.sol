pragma solidity ^0.4.18;

import '../node_modules/zeppelin-solidity/contracts/token/CappedToken.sol';
import '../node_modules/zeppelin-solidity/contracts/token/PausableToken.sol';

contract BestMillionsToken is CappedToken, PausableToken {

    string public constant name = "Best Millions Token";
    string public constant symbol = "BMT";
    uint8 public constant decimals = 18;

    function BestMillionsToken(uint256 _cap)
        CappedToken(_cap)
        public
    {

    }

}
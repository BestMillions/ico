const express = require('express')
const app = express()

app.get('/', function(req, res) {

    const Eth = require('ethjs');
    const eth = new Eth(new Eth.HttpProvider('http://localhost:8545'));

    const crowdsale_address = '0x69bd17ead2202072ae4a117b036305a94ccf2e06';
    const token_address = '0x7d8865ea29dc9a6d6dde453ace45f58779482331';

    const tokenABI = [
        {
            "constant": true,
            "inputs": [],
            "name": "totalSupply",
            "outputs": [
              {
                "name": "",
                "type": "uint256"
              }
            ],
            "payable": false,
            "stateMutability": "view",
            "type": "function"
        }
    ];

    const crowdsaleABI = [
        {
            "constant": true,
            "inputs": [],
            "name": "weiRaised",
            "outputs": [
              {
                "name": "",
                "type": "uint256"
              }
            ],
            "payable": false,
            "stateMutability": "view",
            "type": "function"
        }
    ];

    const token = eth.contract(tokenABI).at(token_address);
    const crowdsale = eth.contract(crowdsaleABI).at(crowdsale_address);

    Promise.all([
        crowdsale.weiRaised(),
        token.totalSupply(),
    ]).then((values) => {

        res.setHeader('Content-Type', 'application/json');

        res.send(JSON.stringify({
            eth_collected: Eth.fromWei(values[0]['0'], "ether"),
            bmt_minted: Eth.fromWei(values[1]['0'], "ether"),
        }));

    });

});

app.listen(3000, () => console.log('Example app listening on port 3000!'))
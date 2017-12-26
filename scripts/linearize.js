const SolidityParser = require("solidity-parser");
const c3 = require('c3')
const util = require('util');
const exec = util.promisify(require('child_process').exec);
const path = require('path');

var args = process.argv.slice(2);

if ( args.length != 1 ) {
    console.log('Not enough arguments');
    return;
}

async function flatten() {
    const { stdout, stderr } = await exec('../node_modules/.bin/truffle-flattener ' + args[0]);
    return stdout;
}

flatten().then(function(stdout) {

    var result = SolidityParser.parse(stdout);
    var body = result.body;

    var contractName = path.basename(args[0]);
    contractName = contractName.split('.')[0];
    
    var serializer = c3(contractName);
    
    body.forEach(item => {
    
        if ( item.type != 'ContractStatement' )
            return;
        
        var contractName = item.name;
    
        item.is.forEach(item => {
    
            if ( item.type != 'ModifierName' )
                return;
    
            serializer.add(contractName, item.name);
    
        });
        
    });

    console.log(serializer.run());

});

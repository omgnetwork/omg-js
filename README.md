## OMG.JS 
### JavaScript Library Implementation for Tesuji 

IMPORTANT: 
* This is a Pre-Alpha implementation of a JS library, things WILL break
* this was worked against the `elixir-omg` commit hash: dc4d176d3f5d27030e1e627bd5cc0a630690c178 

This is a library that allows a Client/Server JavaScript application to Interact with the Tesuji Plasma
So that you could:

1. Deposit
2. Transact
3. Exit

ETH From the Childchain server to the Rootchain

** Note: Currently supporting only one function which is Transaction Submission
*** This first implementation is for DevCon Demo

### Installation

Please make sure you have `Node` (v8.11.3) and also `npm` (v6.3.0) installed
0. Clone the repository
1. Install all the packages
```
npm install
```
2. Test to make sure everything is installed correctly, please run:

```
npm run test
```

### Getting Started
#### Initializing
Before running any functions, you must first initialize new Omg with a url to the child chain server

```
const Omg = new OMG(childChainPort)
```

#### SendTransaction

NOTE: This function currently takes in Private Key as raw hex `string`... the client/server is responsible for proper Key Management

```
Omg.sendTransaction(inputs, currency, outputs)
```

this function will:
1. Generate new Plasma transaction
2. Sign transaction with Private Key
3. RLP encode the signed transaction
4. Encode in Base 64
5. Submit directly to childchain server through json rpc

##### Params
1. `inputs`- `array` :  an array of two objects `[{blknum1, txindex1, oindex1},{blknum2, txindex2, oindex2}]` 
    - `blknum` - `integer` block number
    - `txindex` - `integer` block transaction index
    - `oindex` - `integer` output index
    
2. `currency`- `array` : an array of integer by default, ETH is `[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]`
3.  `outputs`- `array` : an array of two objects `[{newowner1, amount1},{newowner2, amount2}]`
    - `newowner`- `string`: hex address of newowner1 with 0x prefix
    - `amount` - `integer`: integer amount in that denoted currency

##### Returns
- `obj`: json rpc return message (success message contains `tx_index`, `tx_hash` and `blknum`)

#### getUtxo
```
Omg.getUtxo(address)
```
1. fetch utxo of an address from the watcher

#### depositEth
NOTE: This function requires a user to have a Geth node running with `fromAddr` account unlocked
```
Omg.depositEth(amount, fromAddr)
```

This function will:
1. deposit ETH `amount` from a specified `fromAddr`
2. returns a block hash

#### depositToken
coming soon TM

#### getDepositBlock
NOTE: use in conjunction with the `.depositEth` function, refer to node-deposit example
```
Omg.getDepositBlock(txHash)
```

This function will:
1. take in a transaction hash `txHash` of the deposit 
2. return the blocknumber that the deposit went through

#### exit
coming soon TM

### Implementation
You can find example applications inside `examples` folder
to use library in html, please use the file in the `dist` folder

#### Server side 
Library can be used as is (currently not an NPM package) in order to use it, inside the project root, run:
```
npm link
```
then inside your server app, simply require it and declare new instance
```
const OMG = require('omg-js/omg')
const Omg = new OMG(childChainPort)

Omg.sendTransaction(_inputs, _currency, _outputs, alicePriv)
```
#### Client side 
In order to use the JS library in browser, run (in project root)
```
npm run build
```
And then, inside Console (with the HTML files open) Run the following:
```
var omg = new Omg(childChainPort)
omg.sendTransaction(_inputs, _currency, _outputs, alicePriv)
```
## OMG.JS 
### Clientside Library Implementation for Tesuji 

IMPORTANT: This is a Pre-Alpha implementation of a Client JS library, things WILL break

This is a library that allows a NodeJS Application to Interact with the Tesuji Plasma
So that you could:

1. Deposit
2. Transact
3. Exit

ETH From the Childchain server to the Rootchain

** Note: Currently supporting only one function which is Transaction Submission
*** This first implementation is for DevCon Demo

### Installation

Please make sure you have `Node` (v8.11.3) and also `npm` (v6.3.0) installed
1. Install all the packages
```
npm install
```
2. Test to make sure everything is installed correctly, please run:

```
npm run test
```

### Gettin Started
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

#### getTransactionParam
coming soon

#### deposit
coming soon

#### exit
coming soon

### Implementation
You can find example applications inside `examples` folder
to use library in html, please use the file in the `dist` folder

#### submitTx.html
In order to run the HTML files with Dist scribts, run (in project root)
```
npm run build
```
And then, inside Console (with the HTML files open) Run the following:
```
var omg = new Omg(childChainPort)
omg.sendTransaction(_inputs, _currency, _outputs, alicePriv)
```
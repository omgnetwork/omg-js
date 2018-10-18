### Implementing Different Signing Methods

Ideally, a client library should support multiple signing methods. Currently, as a barebone basic demonstration `omg-js` supports transaction signing via raw privatekey and single UTXO as input through `sendSingleTransaction` function. Although, it works for demonstration purpose, a practical usage would require support from signing for users with multiple types of wallets

### Implementing your own sendTransaction function

processing transaction to the childchain consists of 4 major components:

1. create
2. sign
3. build 
4. submit 

Although the library provides an option for you to build your own method, all depending on your key management implementation. To create a sendTransaction function that utilizes a hardware wallet, ie. a hardware wallet like Trezor, only changes required is implementing your own `sign` function. The client library should be able to handle the rest for you.

```
//example of sending a transaction with Trezor

async sendTransactionWithTrezor(txBody, privateKey) {
  let unsignedTx = childChain.createTransaction(txBody)

  //custom function for signing with Trezor
  let signature = await signTransactionWithTrezor(unsignedTx, [privateKey])

  let signedTx = await childChain.buildSignedTransaction(unsignedTx, signature)
  let submission = await childChain.submitTransaction(signedTx)

}


```



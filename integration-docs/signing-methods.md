## Signing a transaction

The OMG Network childchain uses `eth_signTypedData` as described in [EIP-712](https://github.com/ethereum/EIPs/blob/master/EIPS/eip-712.md)

This means that a web3 provider (e.g. Metamask) can do the signing.

### Creating and signing with `eth_signTypedData`
The steps involved in creating and signing a transaction are as follows:
1. Create the transaction body by specifying inputs, outputs and optional metadata.
2. Convert the transaction body into `typedData`format.
3. Call `eth_signTypedData` to sign it. Note that you must `JSON.stringify()` the typed data.
4. Assemble the signatures and the transaction body into an RLP encoded format.
5. Submit the transaction to the child chain.

```
    // create the transaction body
    const txBody = transaction.createTransactionBody(fromAddress, fromUtxos, toAddress, toAmount, currency)

    // Get the transaction typed data
    const typedData = transaction.getTypedData(txBody)

    // Sign the typed data
    const signatures = await new Promise((resolve, reject) => {
      web3.currentProvider.sendAsync(
        {
          method: 'eth_signTypedData_v3',
          params: [signer, JSON.stringify(typedData)],
          from: signer
        },
        (err, result) => {
          if (err) {
            reject(err)
          } else if (result.error) {
            reject(result.error.message)
          } else {
            resolve(result.result)
          }
        }
      )
    })

    // Build the signed transaction
    const signedTx = childchain.buildSignedTransaction(typedData, signatures)

    // Submit transaction
    const tx = await childchain.submitTransaction(signedTx)
```

### Creating and signing without `eth_signTypedData`
If you want to manage your private keys yourself, you don't have to use `eth_signTypedData`. You must create a hash of the typed data and sign that using `ecsign`. There is a convience function provided to do this: `childchain.signTransaction(typedData, privateKeys)` . Or you can do it manually, similar to the above:

1. Create the transaction body by specifying inputs, outputs and optional metadata.
2. Convert the transaction body into `typedData`format.
3. Call `transaction.getToSignHash(typedData)` to get the hash to sign
4. Sign it using elliptic curve signing (e.g. `ecsign`)
5. Assemble the signatures and the transaction body into an RLP encoded format.
6. Submit the transaction to the child chain.

```
    // create the transaction body
    const txBody = transaction.createTransactionBody(fromAddress, fromUtxos, toAddress, toAmount, currency)

    // Get the transaction typed data
    const typedData = transaction.getTypedData(txBody)

    // Get the hash to sign
    const toSign = transaction.getToSignHash(typedData)

    // Sign the hashed data (once for each input spent)
    const privateKeys = [...the private keys of the spent inputs...]
    const signatures = privateKeys.map(key => ecsign(toSign, key))

    // Build the signed transaction
    const signedTx = childchain.buildSignedTransaction(typedData, signatures)

    // Submit transaction
    const tx = await childchain.submitTransaction(signedTx)
```



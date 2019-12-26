## Sending a transaction

The `omg-js` api provides a few different ways to send a transaction on the OMG Network. 

----------------- OLD API ---------------------

Create a transaction body
<!-- rename to childchain.createTransactionBodies -->
- `childchain.createTransaction` (uses the childchain endpoint to construct transaction bodies)
- `transaction.createTransactionBody` (uses local logic to construct a transaction body)
- manually define the transaction body yourself

### METHOD A
For full control of the transaction
1. create a transaction body using a method explained above
2. `transaction.getTypedData` (sanitizes transaction into the correct typedData format)
<!-- should be renamed and moved to transaction.signTypedData (3 and 4 can be combined) -->
3. `childchain.signTransaction` (locally signs typedData with passed private keys, useful for multiple different signatures. can also use metamask to sign: see signing-methods.md)
4. `childchain.buildSignedTransaction` (returns encoded and signed transaction ready to be submitted)
5. `childchain.submitTransaction` (submits to the childchain)

### METHOD B
Relying on the childchain completely to create and send the transaction
1. `childchain.createTransaction` (will construct a transaction body using the childchain)
<!-- 2 and 3 can be combined as they are mutually exclusive -->
2. `childchain.signTypedData` (locally will sign a transaction selected from `childchain.createTransaction`)
3. `childchain.submitTyped` (will submit the result of `childchain.signTypedData`)

<!-- We can remove this method to simplify the api, and force typing, signing, and building -->
### METHOD C
If you only need to define which UTXOs can be spent
1. `childchain.getUtxos` (first get all available UTXOs and then select what you want to spend)
2. `childchain.sendTransaction` (internally will create/getTyped/sign/buildSigned/submit from the utxos you pass it)

----------------- PROPOSED API ---------------------

The process of creating and submitting a transaction follows this transformative process:
1. define a transaction body:                                   definition -> transactionBody
2. convert that transaction body into typedData:                transactionBody -> typedData
3. sign and encode that typedData into a signed transaction:    typedData -> signed transaction
4. submit the transaction to the childchain:                    signed transaction -> receipt

### Defining a transaction body
3 ways to create a transaction body
- `childchain.createTransactionData` (uses the childchain endpoint to construct transaction bodies)
- `transaction.createTransactionBody` (uses local logic to construct a transaction body)
- manually define the transaction body yourself

### Creating typedData
2 ways to generate typedData
- `childchain.createTransactionData` (uses the childchain endpoint to create typedData)
- `transaction.getTypedData` (locally convert transactionBody into typedData)

### Signing typedData and creating a signed transaction
only 1 way to sign typedData and create a signed transaction
- `transaction.createSignedTransaction`

### Submitting signed transaction to the childchain
only 1 way to submit the signed transaction
- `childchain.submitSignedTransaction`

### Sign and submit typedData directly
An alternative method of signing and submitting typedData directly 
- `childchain.submitTyped`

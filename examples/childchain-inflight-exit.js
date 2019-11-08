const BigNumber = require('bignumber.js')
const Web3 = require('web3')

const RootChain = require('../packages/omg-js-rootchain/src/rootchain')
const ChildChain = require('../packages/omg-js-childchain/src/childchain')
const { transaction } = require('../packages/omg-js-util/src')

const config = require('./config.js')
const wait = require('./wait.js')

// setup for fast confirmations
const web3 = new Web3(new Web3.providers.HttpProvider(config.geth_url), null, { transactionConfirmationBlocks: 1 })

const rootChain = new RootChain(web3, config.rootchain_plasma_contract_address)
const rootChainPlasmaContractAddress = config.rootchain_plasma_contract_address

const childChain = new ChildChain(config.watcher_url)

const aliceAddress = config.alice_eth_address
const alicePrivateKey = config.alice_eth_address_private_key

const bobAddress = config.bob_eth_address
const bobPrivateKey = config.bob_eth_address_private_key

const transferAmount = BigNumber(web3.utils.toWei(config.alice_eth_transfer_amount, 'ether'))

async function inflightExitChildChain () {
  let aliceRootchainBalance = await web3.eth.getBalance(aliceAddress)
  let bobRootchainBalance = await web3.eth.getBalance(bobAddress)

  let aliceChildchainBalanceArray = await childChain.getBalance(aliceAddress)
  let bobChildchainBalanceArray = await childChain.getBalance(bobAddress)

  console.log(`Alice's rootchain balance: ${aliceRootchainBalance}`)
  console.log(`Bob's rootchain balance: ${bobRootchainBalance}`)

  console.log(`Alice's childchain balance: ${aliceChildchainBalanceArray.length === 0 ? 0 : aliceChildchainBalanceArray[0].amount}`)
  console.log(`Bob's childchain balance: ${bobChildchainBalanceArray.length === 0 ? 0 : bobChildchainBalanceArray[0].amount}`)

  const utxos = await childChain.getUtxos(aliceAddress)

  console.log(`Alice's UTXOS = ${JSON.stringify(utxos, undefined, 2)}`)

  const createdTxn = transaction.createTransactionBody(aliceAddress, utxos, bobAddress, transferAmount, transaction.ETH_CURRENCY)

  console.log(`Created a childchain transaction of ${web3.utils.fromWei(Number(transferAmount).toString(), 'ether')} ETH from Alice to Bob.`)
  // get the transaction data
  const typedData = transaction.getTypedData(createdTxn, rootChainPlasmaContractAddress)
  // sign the data
  const signatures = childChain.signTransaction(typedData, [alicePrivateKey])

  // build the signed transaction
  const signedTxn = childChain.buildSignedTransaction(typedData, signatures)

  // submit the signed transaction to the childchain
  const transactionReceipt = await childChain.submitTransaction(signedTxn)

  console.log(`Submitted transaction. Transaction receipt: ${JSON.stringify(transactionReceipt, undefined, 2)}`)

  // get deposit UTXO and exit data
  let aliceUtxos = await childChain.getUtxos(aliceAddress)
  let aliceUtxoToExit = aliceUtxos[0]

  let bobUtxos = await childChain.getUtxos(bobAddress)
  let bobUtxoToExit = bobUtxos[0]

  console.log(`Alice's UTXOS = ${JSON.stringify(aliceUtxoToExit, undefined, 2)}`)
  console.log(`Bob's UTXOs = ${JSON.stringify(bobUtxoToExit, undefined, 2)}`)

  // Bob hasn't seen the transaction get put into a block and he wants to exit now.
  
  console.log(`Alice's signed TX: ${signedTxn}`)

  // get the exit data
  const exitData = await childChain.inFlightExitGetData(signedTxn)

  console.log(`Bob's exit data = ${JSON.stringify(exitData, undefined, 2)}`)
//   {
//     "in_flight_tx": "0xf88e01c7863034062c5001f862ec01942b1e5288149f7b5f8a2653401a4584130ee3289694000000000000000000000000000000000000000064f40194e4c8c1f49fe031f879278853a01634004022f2eb9400000000000000000000000000000000000000008806f05b59d3b1f060a00000000000000000000000000000000000000000000000000000000000000000",
//     "in_flight_tx_sigs": [
//       "0xbeaa3f724f1e37841d888dd0128ad31c0578dc579f53814d5e49e07feed7a84952fc24df76b94b7569e3ae1890700eec8ad58fc1166f669cd3aa372414f2a3461c"
//     ],
//     "input_txs": [
//       "0xf88e01c7862f4b31874001f862ec01942b1e5288149f7b5f8a2653401a4584130ee3289694000000000000000000000000000000000000000064f40194e4c8c1f49fe031f879278853a01634004022f2eb9400000000000000000000000000000000000000008806f05b59d3b1f0c4a00000000000000000000000000000000000000000000000000000000000000000"
//     ],
//     "input_txs_inclusion_proofs": [
//       "0x290decd9548b62a8d60345a988386fc84ba6bc95484008f6362f93160ef3e563633dc4d7da7256660a892f8f1604a44b5432649cc8ec5cb3ced4c4e6ac94dd1d890740a8eb06ce9be422cb8da5cdafc2b58c0a5e24036c578de2a433c828ff7d3b8ec09e026fdc305365dfc94e189a81b38c7597b3d941c279f042e8206e0bd8ecd50eee38e386bd62be9bedb990706951b65fe053bd9d8a521af753d139e2dadefff6d330bb5403f63b14f33b578274160de3a50df4efecf0e0db73bcdd3da5617bdd11f7c0a11f49db22f629387a12da7596f9d1704d7465177c63d88ec7d7292c23a9aa1d8bea7e2435e555a4a60e379a5a35f3f452bae60121073fb6eeade1cea92ed99acdcb045a6726b2f87107e8a61620a232cf4d7d5b5766b3952e107ad66c0a68c72cb89e4fb4303841966e4062a76ab97451e3b9fb526a5ceb7f82e026cc5a4aed3c22a58cbd3d2ac754c9352c5436f638042dca99034e836365163d04cffd8b46a874edf5cfae63077de85f849a660426697b06a829c70dd1409cad676aa337a485e4728a0b240d92b3ef7b3c372d06d189322bfd5f61f1e7203ea2fca4a49658f9fab7aa63289c91b7c7b6c832a6d0e69334ff5b0a3483d09dab4ebfd9cd7bca2505f7bef59cc1c12ecc708fff26ae4af19abe852afe9e20c8622def10d13dd169f550f578bda343d9717a138562e0093b380a1120789d53cf10"
//     ],
//     "input_utxos_pos": [
//       53000000000001
//     ]
//   }
  // start an in-flight exit
  const outputGuardPreimagesForInputs = ["0x"];
  const inputSpendingConditionOptionalArgs = ["0x"];
  let startInflightExitReceipt = await rootChain.startInFlightExit(
    exitData.in_flight_tx,
    exitData.input_txs,
    exitData.input_txs_inclusion_proofs,
    exitData.in_flight_tx_sigs,
    exitData.input_utxos_pos,
    signatures,
    outputGuardPreimagesForInputs,
    inputSpendingConditionOptionalArgs,
    {
      privateKey: bobPrivateKey,
      from: bobAddress
    }
  );
  console.log("FFS?")
  // console.log(startInflightExitReceipt.events.UserRegisterEVENT)

    

  console.log(`Bob started inflight roothchain exit. Inflight exit receipt: ${JSON.stringify(startInflightExitReceipt, undefined, 2)}`)

  // decode the transaction to get the index of Bob's output
  const decodedTxn = transaction.decode(signedTxn)
  console.log(decodedTxn)
  // const outputIndex = decodedTxn.outputs.findIndex(e => e.owner.toLowerCase() === bobAddress.toLowerCase())
  // console.log(outputIndex)


  

  // Bob needs to piggyback his output on the in-flight exit
  const piggybackInFlightExitReceipt = await rootChain.piggybackInFlightExit(
    exitData.in_flight_tx,
    outputIndex,
    {
      privateKey: bobPrivateKey,
      from: bobAddress
    }
  )

  console.log(`Bob called piggybacked his output. piggybackInFlightExitReceipt = ` +
    `${JSON.stringify(piggybackInFlightExitReceipt)}`)

  // wait for challenge period to complete
  await wait.waitForChallengePeriodToEnd(rootChain, exitData)

  // call processExits() after challenge period is over
  const processExitsPostChallengeReceipt = await rootChain.processExit(
    0, transaction.ETH_CURRENCY,
    { privateKey: bobPrivateKey, from: bobAddress }
  )

  console.log(`Post-challenge process exits started. Process exits receipt: ${JSON.stringify(processExitsPostChallengeReceipt, undefined, 2)}`)

  await wait.waitForTransaction(
    web3, processExitsPostChallengeReceipt.transactionHash, config.millis_to_wait_for_next_block, config.blocks_to_wait_for_txn)

  // get final ETH balance
  aliceRootchainBalance = await web3.eth.getBalance(aliceAddress)
  bobRootchainBalance = await web3.eth.getBalance(bobAddress)

  aliceChildchainBalanceArray = await childChain.getBalance(aliceAddress)
  bobChildchainBalanceArray = await childChain.getBalance(bobAddress)

  console.log(`Final alice rootchain balance: ${aliceRootchainBalance}`)
  console.log(`Final bob rootchain balance: ${bobRootchainBalance}`)

  console.log(`Final alice childchain balance: ${aliceChildchainBalanceArray.length === 0 ? 0 : aliceChildchainBalanceArray[0].amount}`)
  console.log(`Final bob childchain balance: ${bobChildchainBalanceArray.length === 0 ? 0 : bobChildchainBalanceArray[0].amount}`)

  bobUtxos = await childChain.getUtxos(bobAddress)
  bobUtxoToExit = bobUtxos[0]

  aliceUtxos = await childChain.getUtxos(aliceAddress)
  aliceUtxoToExit = aliceUtxos[0]

  console.log('Alice still has a UTXO as she has not exited yet. But Bob has no remaining UTXOs as he already exited his UTXO.')

  console.log(`Alice's UTXOS = ${JSON.stringify(aliceUtxoToExit, undefined, 2)}`)
  console.log(`Bob's UTXOs = ${JSON.stringify(bobUtxoToExit, undefined, 2)}`)
}

(async () => {
  try {
    const result = await inflightExitChildChain()
    return Promise.resolve(result)
  } catch (error) {
    console.log(error)
    return Promise.reject(error)
  }
})()
const sampleTx = {
    amount1: 7,
    amount2: 3,
    blknum1: 66004001,
    blknum2: 0,
    cur12: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0],
    newowner1: [116, 90, 78, 212, 118, 51, 233, 165, 245, 155,
      19, 234, 50, 191, 20, 131, 178, 219, 41, 65],
    newowner2: [101, 166, 194, 146, 88, 167, 6, 177, 55, 187, 239, 105, 27, 233, 12, 165, 29, 47, 182, 80],
    oindex1: 0,
    oindex2: 0,
    txindex1: 0,
    txindex2: 0
}  

//IMPORTANT: assuming Oindex2, txIndex2, blknum2 is 0 for now

//constructor for transaction object
function Transaction(inputs, currency, outputs) {
    this.amount1 = outputs[0].amount1
    this.amount2 = outputs[1].amount2
    this.blknum1 = inputs[0].blknum1
    this.blknum2 = 0
    this.cur12 = currency
    this.newowner1 = outputs[0].newowner1
    this.newowner2 = outputs[1].newowner2
    this.oindex1 = inputs[0].oindex1
    this.oindex2 = 0
    this.txindex1 = inputs[0].txindex1
    this.txindex2 = 0
}

const newTx = (inputs, currency, outputs) => {
    let transaction = new Transaction(inputs, currency, outputs)
    return transaction
}



module.exports = newTx
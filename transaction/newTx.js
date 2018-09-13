
//constructor for transaction object
function Transaction(inputs, currency, outputs) {
  this.amount1 = outputs[0].amount1
  this.amount2 = outputs[1].amount2
  this.blknum1 = inputs[0].blknum1
  this.blknum2 = inputs[1].blknum2
  this.cur12 = currency
  this.newowner1 = outputs[0].newowner1
  this.newowner2 = outputs[1].newowner2
  this.oindex1 = inputs[0].oindex1
  this.oindex2 = inputs[1].oindex2
  this.txindex1 = inputs[0].txindex1
  this.txindex2 = inputs[1].txindex2
}

const newTransaction = (inputs, currency, outputs) => {
  let transaction = new Transaction(inputs, currency, outputs)
  return transaction
}



module.exports = newTransaction
const MochaParallel = require('mocha-parallel-tests').default
const MochaSync = require('mocha')

const runnerOptions = {
  enableTimeouts: false,
  slow: 0,
  useColors: true,
  fullStackTrace: true,
  reporter: 'list'
}
const mochaParallel = new MochaParallel(runnerOptions)
const mochaSync = new MochaSync(runnerOptions)

function addParallel (filename) {
  mochaParallel.addFile(`${__dirname}/test/${filename}.js`)
}
// addParallel('CORSHeaderTest')
// addParallel('metadataTest')
// addParallel('decodeTxBytesTest')
addParallel('addTokenTest')
addParallel('depositTest')
// addParallel('createTransactionTest')
// addParallel('transferTest')
// addParallel('createSubmitTypedTransactionTest')
// addParallel('getExitQueueTest')
// addParallel('standardExitTest')
// addParallel('challengeExitTest')
// addParallel('inFlightExitTest')
// addParallel('inFlightExitChallengeTest')
// addParallel('inFlightExitChallengeResponse')
// addParallel('challengeInFlightExitInputSpentTest')
// addParallel('challengeInFlightExitOutputSpentTest')
// mochaParallel.run()

mochaSync.addFile(`${__dirname}/test/setupTest.js`)
mochaSync.run(() => {
  console.log('setup complete. running parallel tests.')
  mochaParallel.run()
})

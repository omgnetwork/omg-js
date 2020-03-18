// add new test files to the list below
// mocha will run these in order

require('./test/CORSHeaderTest')
require('./test/metadataTest')
require('./test/amountTypes')
require('./test/decodeTxBytesTest')
require('./test/addTokenTest')
require('./test/depositTest')
require('./test/createTransactionTest')
require('./test/transferTest')
require('./test/createSubmitTypedTransactionTest')
require('./test/getExitQueueTest')
require('./test/standardExitTest')
require('./test/exitWithoutWatcherTest')
require('./test/challengeExitTest')
require('./test/inFlightExitTest')
require('./test/deleteNonPiggybackedInFlightExitTest')
require('./test/inFlightExitChallengeTest')
require('./test/inFlightExitChallengeResponseTest')
require('./test/challengeInFlightExitInputSpentTest')
require('./test/challengeInFlightExitOutputSpentTest')
require('./test/mergeUtxoTest')

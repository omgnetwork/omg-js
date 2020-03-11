// define the tests that should be run in the ci environment
// these are run in sequence

require('./test/CORSHeaderTest')
require('./test/metadataTest')
require('./test/amountTypes')
require('./test/decodeTxBytesTest')
require('./test/addTokenTest')
require('./test/depositTest')
require('./test/createTransactionTest')
require('./test/transferTest')
require('./test/createSubmitTypedTransactionTest')
require('./test/exitWithoutWatcherTest')

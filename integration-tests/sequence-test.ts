// mocha will run these in order

import './test/CORSHeaderTest';
import './test/metadataTest';
import './test/amountTypes';
import './test/decodeTxBytesTest';
import './test/addTokenTest';
import './test/depositTest';
import './test/createTransactionTest';
import './test/transferTest';
import './test/createSubmitTypedTransactionTest';
import './test/getExitQueueTest';
import './test/standardExitTest';
import './test/exitWithoutWatcherTest';
import './test/challengeExitTest';
import './test/inFlightExitTest';
import './test/deleteNonPiggybackedInFlightExitTest';
import './test/inFlightExitChallengeTest';
import './test/inFlightExitChallengeResponseTest';
import './test/challengeInFlightExitInputSpentTest';
import './test/challengeInFlightExitOutputSpentTest';
import './test/mergeUtxoTest';

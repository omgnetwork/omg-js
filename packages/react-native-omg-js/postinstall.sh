#!/bin/sh

BASE_PATH=../../@omisego
JOI_PATH=node_modules/@hapi/joi/dist

if [ ! -d "$BASE_PATH" ]; then
  exit 0
fi

# Polyfill TextEncoder from joi
# Backup original content
cat $BASE_PATH/omg-js-rootchain/node_modules/$JOI_PATH/joi-browser.min.js >$BASE_PATH/omg-js-rootchain/node_modules/$JOI_PATH/tmp.js
cat $BASE_PATH/omg-js-childchain/node_modules/$JOI_PATH/joi-browser.min.js >$BASE_PATH/omg-js-childchain/node_modules/$JOI_PATH/tmp.js
cat $BASE_PATH/omg-js-util/node_modules/$JOI_PATH/joi-browser.min.js >$BASE_PATH/omg-js-util/node_modules/$JOI_PATH/tmp.js

# Replace joi-browser.min.js content
echo "require('fast-text-encoding');" >$BASE_PATH/omg-js-rootchain/node_modules/$JOI_PATH/joi-browser.min.js
echo "require('fast-text-encoding');" >$BASE_PATH/omg-js-childchain/node_modules/$JOI_PATH/joi-browser.min.js
echo "require('fast-text-encoding');" >$BASE_PATH/omg-js-util/node_modules/$JOI_PATH/joi-browser.min.js

# Append original content
cat $BASE_PATH/omg-js-rootchain/node_modules/$JOI_PATH/tmp.js >>$BASE_PATH/omg-js-rootchain/node_modules/$JOI_PATH/joi-browser.min.js
cat $BASE_PATH/omg-js-childchain/node_modules/$JOI_PATH/tmp.js >>$BASE_PATH/omg-js-childchain/node_modules/$JOI_PATH/joi-browser.min.js
cat $BASE_PATH/omg-js-util/node_modules/$JOI_PATH/tmp.js >>$BASE_PATH/omg-js-util/node_modules/$JOI_PATH/joi-browser.min.js

# Remove tmp file
rm $BASE_PATH/omg-js-rootchain/node_modules/$JOI_PATH/tmp.js
rm $BASE_PATH/omg-js-childchain/node_modules/$JOI_PATH/tmp.js
rm $BASE_PATH/omg-js-util/node_modules/$JOI_PATH/tmp.js

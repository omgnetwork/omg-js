#!/bin/sh
if [ "$CI" = true ]; then
  exit 0
fi

# Polyfill TextEncoder from joi
# Backup original content
cat ../../@omisego/omg-js-rootchain/node_modules/@hapi/joi/dist/joi-browser.min.js >../../@omisego/omg-js-rootchain/node_modules/@hapi/joi/dist/tmp.js
cat ../../@omisego/omg-js-childchain/node_modules/@hapi/joi/dist/joi-browser.min.js >../../@omisego/omg-js-childchain/node_modules/@hapi/joi/dist/tmp.js
cat ../../@omisego/omg-js-util/node_modules/@hapi/joi/dist/joi-browser.min.js >../../@omisego/omg-js-util/node_modules/@hapi/joi/dist/tmp.js

# Replace joi-browser.min.js content
echo "require('fast-text-encoding');" >../../@omisego/omg-js-rootchain/node_modules/@hapi/joi/dist/joi-browser.min.js
echo "require('fast-text-encoding');" >../../@omisego/omg-js-childchain/node_modules/@hapi/joi/dist/joi-browser.min.js
echo "require('fast-text-encoding');" >../../@omisego/omg-js-util/node_modules/@hapi/joi/dist/joi-browser.min.js

# Append original content
cat ../../@omisego/omg-js-rootchain/node_modules/@hapi/joi/dist/tmp.js >>../../@omisego/omg-js-rootchain/node_modules/@hapi/joi/dist/joi-browser.min.js
cat ../../@omisego/omg-js-childchain/node_modules/@hapi/joi/dist/tmp.js >>../../@omisego/omg-js-childchain/node_modules/@hapi/joi/dist/joi-browser.min.js
cat ../../@omisego/omg-js-util/node_modules/@hapi/joi/dist/tmp.js >>../../@omisego/omg-js-util/node_modules/@hapi/joi/dist/joi-browser.min.js

# Remove tmp file
rm ../../@omisego/omg-js-rootchain/node_modules/@hapi/joi/dist/tmp.js
rm ../../@omisego/omg-js-childchain/node_modules/@hapi/joi/dist/tmp.js
rm ../../@omisego/omg-js-util/node_modules/@hapi/joi/dist/tmp.js

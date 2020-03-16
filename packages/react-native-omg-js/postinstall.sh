#!/bin/sh

# Polyfill node apis introduce by web3
rn-nodeify --install assert,stream,events,crypto,url,http,https,vm,os,fs,path,process,net,zlib,_stream_transform,tls --hack

# Polyfill TextEncoder from joi
# Backup original content
cat node_modules/@omisego/omg-js-rootchain/node_modules/@hapi/joi/dist/joi-browser.min.js > node_modules/@omisego/omg-js-rootchain/node_modules/@hapi/joi/dist/tmp.js
cat node_modules/@omisego/omg-js-childchain/node_modules/@hapi/joi/dist/joi-browser.min.js > node_modules/@omisego/omg-js-childchain/node_modules/@hapi/joi/dist/tmp.js
cat node_modules/@omisego/omg-js-util/node_modules/@hapi/joi/dist/joi-browser.min.js > node_modules/@omisego/omg-js-util/node_modules/@hapi/joi/dist/tmp.js

# Replace joi-browser.min.js content
echo "require('fast-text-encoding');" > node_modules/@omisego/omg-js-rootchain/node_modules/@hapi/joi/dist/joi-browser.min.js 
echo "require('fast-text-encoding');" > node_modules/@omisego/omg-js-childchain/node_modules/@hapi/joi/dist/joi-browser.min.js 
echo "require('fast-text-encoding');" > node_modules/@omisego/omg-js-util/node_modules/@hapi/joi/dist/joi-browser.min.js 

# Append original content
cat node_modules/@omisego/omg-js-rootchain/node_modules/@hapi/joi/dist/tmp.js >> node_modules/@omisego/omg-js-rootchain/node_modules/@hapi/joi/dist/joi-browser.min.js
cat node_modules/@omisego/omg-js-childchain/node_modules/@hapi/joi/dist/tmp.js >> node_modules/@omisego/omg-js-childchain/node_modules/@hapi/joi/dist/joi-browser.min.js
cat node_modules/@omisego/omg-js-util/node_modules/@hapi/joi/dist/tmp.js >> node_modules/@omisego/omg-js-util/node_modules/@hapi/joi/dist/joi-browser.min.js

# Remove tmp file
rm node_modules/@omisego/omg-js-rootchain/node_modules/@hapi/joi/dist/tmp.js
rm node_modules/@omisego/omg-js-childchain/node_modules/@hapi/joi/dist/tmp.js
rm node_modules/@omisego/omg-js-util/node_modules/@hapi/joi/dist/tmp.js

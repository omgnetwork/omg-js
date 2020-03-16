#!/bin/sh

# Polyfill node apis introduce by web3
rn-nodeify --install assert,stream,events,crypto,url,http,https,vm,os,fs,path,process,net,zlib,_stream_transform,tls --hack

# Polyfill TextEncoder from joi
cat node_modules/@omisego/omg-js-rootchain/node_modules/@hapi/joi/dist/joi-browser.min.js | pbcopy && echo "require('fast-text-encoding');" > node_modules/@omisego/omg-js-rootchain/node_modules/@hapi/joi/dist/joi-browser.min.js && pbpaste >> node_modules/@omisego/omg-js-rootchain/node_modules/@hapi/joi/dist/joi-browser.min.js
cat node_modules/@omisego/omg-js-childchain/node_modules/@hapi/joi/dist/joi-browser.min.js | pbcopy && echo "require('fast-text-encoding');" > node_modules/@omisego/omg-js-childchain/node_modules/@hapi/joi/dist/joi-browser.min.js && pbpaste >> node_modules/@omisego/omg-js-childchain/node_modules/@hapi/joi/dist/joi-browser.min.js
cat node_modules/@omisego/omg-js-util/node_modules/@hapi/joi/dist/joi-browser.min.js | pbcopy && echo "require('fast-text-encoding');" > node_modules/@omisego/omg-js-util/node_modules/@hapi/joi/dist/joi-browser.min.js && pbpaste >> node_modules/@omisego/omg-js-util/node_modules/@hapi/joi/dist/joi-browser.min.js

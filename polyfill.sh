#!/bin/sh

# Polyfill node apis introduced by web3
rn-nodeify --install assert,stream,events,crypto,url,http,https,vm,os,path,process,net,zlib,_stream_transform,tls --hack

BASE_PATH=../@omisego/node_modules/@hapi/joi/dist

if [ ! -d "$BASE_PATH" ]; then
  exit 0
fi

# Polyfill TextEncoder from joi
# Backup original content
cat $BASE_PATH/joi-browser.min.js >$BASE_PATH/tmp.js

# Replace joi-browser.min.js content
echo "require('fast-text-encoding');" >$BASE_PATH/joi-browser.min.js

# Append original content
cat $BASE_PATH/tmp.js >>$BASE_PATH/joi-browser.min.js

# Remove tmp file
rm $BASE_PATH/tmp.js

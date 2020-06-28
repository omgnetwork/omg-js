#!/bin/sh

# Polyfill node apis introduce by web3
rn-nodeify --install assert,stream,events,crypto,url,http,https,vm,os,path,process,net,zlib,_stream_transform,tls --hack

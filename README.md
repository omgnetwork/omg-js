## OMG.JS 
### Clientside Library Implementation for Tesuji 

IMPORTANT: This is a Pre-Alpha implementation of a Client JS library, things may break

This is a library that allows a NodeJS Application to Interact with the Tesuji Plasma
So that you could:

1. Deposit
2. Transact
3. Exit

ETH From the Childchain server to the Rootchain

** Note: Currently supporting only one function which is Transaction Submission
*** This first implementation is for DevCon Demo

### Installation

Please make sure you have `Node` (v8.11.3) and also `npm` (v6.3.0) installed
1. Install all the packages
```
npm install
```
2. Test to make sure everything is installed correctly, please run:

```
npm run test
```

### Implementation

You can find example applications inside `examples` folder
to use library in html, please use the file in the `dist` folder

In order to run the HTML files with Dist scribts, run (in project root)
```
browserify omg.js --standalon Omg > bundle.js
```
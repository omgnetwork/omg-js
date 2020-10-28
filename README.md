## OMG-JS 

[![TypeScript](https://img.shields.io/badge/%3C%2F%3E-TypeScript-%230074c1.svg)](http://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

[![CircleCI](https://circleci.com/gh/omgnetwork/omg-js/tree/master.svg?style=svg)](https://circleci.com/gh/omgnetwork/omg-js/tree/master)

This is a Javascript/Typescript library that allows you to interact with OMG Network's MoreVP implementation of Plasma. It provides functions to:

1. Deposit (Eth/ERC20) from the Rootchain into the Childchain.
2. Transact on the Childchain.
3. Exit from the Childchain back to the Rootchain.
4. Challenge invalid exits.

## Compatibility

`omg-js` follows a modified semver with the first part referring to its own library versioning and the second part referring to its compatible `elixir-omg` version.

```
ie. v1.0.3-2.0.1

1.0.3 -> omg-js version
2.0.1 -> compatible elixir-omg version
```

## Installation

#### Node
Requires Node >= 8.11.3 < 13.0.0
```
npm install @omisego/omg-js
```

#### Browser
You can add `omg-js` to a website quickly. Just add this script tag.
```
<script src="https://unpkg.com/@omisego/browser-omg-js"></script>
```

#### React Native
`omg-js` can easily be integrated with React Native projects. Only some Node specific modules will need to be pollyfilled using the process below.

First install `rn-nodeify` to your project
```
npm install rn-nodeify
```

Then, add this postinstall script to your project's `package.json`
```
"scripts": {
    "postinstall": "omgjs-polyfill"
}
```

Then install the omg-js library
```
npm install @omisego/omg-js
```

## API Documentation

[Documentation for omg-js ](https://docs.omg.network/omg-js/)

## Examples

You can find examples and instructions on how to run them in the `/examples` folder.

## Integration Tests

You can find instructions on running the integrations tests in the `/integration-tests` folder.

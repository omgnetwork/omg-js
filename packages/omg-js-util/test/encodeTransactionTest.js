/*
Copyright 2018 OmiseGO Pte Ltd

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

     http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License. */

// TODO: UPDATE WITH NEW TRANSACTION ENCODE FOR ALD!!!

// testing ETH function
// const chai = require('chai')
// const assert = chai.assert
// const transaction = require('../src/transaction')

// describe('Transaction tests', () => {
//   it('should return an encoded transaction from 1 input and 1 output', async () => {
//     const txBody = {
//       inputs: [
//         {
//           txindex: 0,
//           oindex: 0,
//           currency: '0000000000000000000000000000000000000000',
//           blknum: 19774001,
//           amount: 1000000000000000000
//         }
//       ],
//       outputs: [
//         {
//           owner: '0xf4ebbe787311bb955bb353b7a4d8b97af8ed1c9b',
//           currency: '0x0000000000000000000000000000000000000000',
//           amount: 500000000000000123
//         }
//       ]
//     }

//     const unsignedTx = transaction.encode(txBody)
//     const expectedTx = '0xF8CFD4C784012DBA318080C3808080C3808080C3808080F8B8F394F4EBBE787311BB955BB353B7A4D8B97AF8ED1C9B9400000000000000000000000000000000000000008806F05B59D3B20064EB94000000000000000000000000000000000000000094000000000000000000000000000000000000000080EB94000000000000000000000000000000000000000094000000000000000000000000000000000000000080EB94000000000000000000000000000000000000000094000000000000000000000000000000000000000080'
//     assert.equal(unsignedTx, expectedTx)
//   })

//   it('should create a hex-encoded unsigned transaction with 4 inputs and 4 outputs', () => {
//     const txBody = {
//       inputs: [
//         {
//           txindex: 0,
//           oindex: 0,
//           currency: '0000000000000000000000000000000000000000',
//           blknum: 19774001
//         },
//         {
//           txindex: 0,
//           oindex: 0,
//           currency: '0000000000000000000000000000000000000000',
//           blknum: 19774002
//         },
//         {
//           txindex: 0,
//           oindex: 1,
//           currency: '0000000000000000000000000000000000000000',
//           blknum: 19774002
//         },
//         {
//           txindex: 10,
//           oindex: 0,
//           currency: '0000000000000000000000000000000000000000',
//           blknum: 19774002
//         }
//       ],
//       outputs: [
//         {
//           owner: '0xf4ebbe787311bb955bb353b7a4d8b97af8ed1c9b',
//           currency: '0x0000000000000000000000000000000000000000',
//           amount: 1000000000000000000
//         },
//         {
//           owner: '0x3272ee86d8192f59261960c9ae186063c8c9041f',
//           currency: '0x0000000000000000000000000000000000000000',
//           amount: 1000000000000000000
//         },
//         {
//           owner: '0x99d7b5c57c16acb24a327a37356a804a2f75dade',
//           currency: '0x0000000000000000000000000000000000000000',
//           amount: 100000000
//         },
//         {
//           owner: '0xbfdf85743ef16cfb1f8d4dd1dfc74c51dc496434',
//           currency: '0x0000000000000000000000000000000000000000',
//           amount: 100
//         }
//       ]
//     }

//     const unsignedTx = transaction.encode(txBody)
//     const expectedTx = '0xF8E7E0C784012DBA318080C784012DBA328080C784012DBA328001C784012DBA320A80F8C4F394F4EBBE787311BB955BB353B7A4D8B97AF8ED1C9B940000000000000000000000000000000000000000880DE0B6B3A7640000F3943272EE86D8192F59261960C9AE186063C8C9041F940000000000000000000000000000000000000000880DE0B6B3A7640000EF9499D7B5C57C16ACB24A327A37356A804A2F75DADE9400000000000000000000000000000000000000008405F5E100EB94BFDF85743EF16CFB1F8D4DD1DFC74C51DC49643494000000000000000000000000000000000000000064'
//     assert.equal(unsignedTx, expectedTx)
//   })

//   it('should encode a transaction with no outputs', () => {
//     const txBody = {
//       inputs: [
//         {
//           txindex: 0,
//           oindex: 0,
//           currency: '0000000000000000000000000000000000000000',
//           blknum: 19774001,
//           amount: 1000000000000000000
//         }
//       ],
//       outputs: []
//     }

//     const unsignedTx = transaction.encode(txBody)
//     const expectedTx = '0xF8C7D4C784012DBA318080C3808080C3808080C3808080F8B0EB94000000000000000000000000000000000000000094000000000000000000000000000000000000000080EB94000000000000000000000000000000000000000094000000000000000000000000000000000000000080EB94000000000000000000000000000000000000000094000000000000000000000000000000000000000080EB94000000000000000000000000000000000000000094000000000000000000000000000000000000000080'
//     assert.equal(unsignedTx, expectedTx)
//   })

//   describe('encodeDeposit', () => {
//     it('should return an encoded deposit transaction', async () => {
//       const address = '0x854951e37c68a99a52d9e3ae15e0cb62184a613e'
//       const amount = 333
//       const ENCODED = '0xF8C5D0C3808080C3808080C3808080C3808080F8B2ED94854951E37C68A99A52D9E3AE15E0CB62184A613E94000000000000000000000000000000000000000082014DEB94000000000000000000000000000000000000000094000000000000000000000000000000000000000080EB94000000000000000000000000000000000000000094000000000000000000000000000000000000000080EB94000000000000000000000000000000000000000094000000000000000000000000000000000000000080'

//       const encoded = transaction.encodeDeposit(address, amount, transaction.ETH_CURRENCY)
//       assert.equal(encoded, ENCODED)
//     })

//     it('should return an encoded deposit transaction when address does not start with 0x', async () => {
//       const address = '854951e37c68a99a52d9e3ae15e0cb62184a613e'
//       const amount = 333
//       const ENCODED = '0xF8C5D0C3808080C3808080C3808080C3808080F8B2ED94854951E37C68A99A52D9E3AE15E0CB62184A613E94000000000000000000000000000000000000000082014DEB94000000000000000000000000000000000000000094000000000000000000000000000000000000000080EB94000000000000000000000000000000000000000094000000000000000000000000000000000000000080EB94000000000000000000000000000000000000000094000000000000000000000000000000000000000080'

//       const encoded = transaction.encodeDeposit(address, amount, transaction.ETH_CURRENCY)
//       assert.equal(encoded, ENCODED)
//     })

//     it('should return an encoded deposit transaction when amount as a string', async () => {
//       const address = '0x60c5bc2de80acda5016c1e81f61620adbc730dd2'
//       const amount = '1000000000000000000'
//       const ENCODED = '0xF8CBD0C3808080C3808080C3808080C3808080F8B8F39460C5BC2DE80ACDA5016C1E81F61620ADBC730DD2940000000000000000000000000000000000000000880DE0B6B3A7640000EB94000000000000000000000000000000000000000094000000000000000000000000000000000000000080EB94000000000000000000000000000000000000000094000000000000000000000000000000000000000080EB94000000000000000000000000000000000000000094000000000000000000000000000000000000000080'

//       const encoded = transaction.encodeDeposit(address, amount, transaction.ETH_CURRENCY)
//       assert.equal(encoded, ENCODED)
//     })

//     it('should return an encoded deposit transaction when currency does not start with 0x', async () => {
//       const address = '0x60c5bc2de80acda5016c1e81f61620adbc730dd2'
//       const amount = '3000000000000000000000'
//       const ENCODED = '0xF8CCD0C3808080C3808080C3808080C3808080F8B9F49460C5BC2DE80ACDA5016C1E81F61620ADBC730DD294000000000000000000000000000000000000000089A2A15D09519BE00000EB94000000000000000000000000000000000000000094000000000000000000000000000000000000000080EB94000000000000000000000000000000000000000094000000000000000000000000000000000000000080EB94000000000000000000000000000000000000000094000000000000000000000000000000000000000080'

//       const encoded = transaction.encodeDeposit(address, amount, '0000000000000000000000000000000000000000')
//       assert.equal(encoded, ENCODED)
//     })
//   })
// })

/*
Copyright 2019 OmiseGO Pte Ltd

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

     http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License. */

const mocha = require('mocha')
const describe = mocha.describe
const it = mocha.it
const chai = require('chai')
const chaiAsPromised = require('chai-as-promised')

const ArgTypes = require('../src/argTypes')

chai.use(chaiAsPromised)
const assert = chai.assert

describe('argumentValidation', () => {
  describe('unnamed generic arguments', () => {
    it('unnamed arguments should skip non required validators on null', () => {
      function myFunction (amount, address) {
        ArgTypes.validate(myFunction, [
          ArgTypes.isNumber,
          ArgTypes.isNumber.isRequired
        ])
        return true
      }
      assert.doesNotThrow(() => myFunction(null, 100))
    })

    it('unnamed arguments should skip non required validators on undefined', () => {
      function myFunction (amount, address) {
        ArgTypes.validate(myFunction, [
          ArgTypes.isNumber,
          ArgTypes.isNumber.isRequired
        ])
        return true
      }
      assert.doesNotThrow(() => myFunction(undefined, 100))
    })

    it('unnamed arguments should throw on invalid validation with descriptive message', () => {
      function myFunction (amount, address) {
        ArgTypes.validate(myFunction, [
          ArgTypes.isNumber,
          ArgTypes.isNumber.isRequired
        ])
        return true
      }
      assert.throws(
        () => myFunction(null, 'myString'),
        'myFunction requires myString to be of type number.'
      )
    })

    it('unnamed arguments should throw on invalid validation with mixed types', () => {
      function myFunction (amount, address) {
        ArgTypes.validate(myFunction, [
          ArgTypes.isString.isRequired,
          ArgTypes.isNumber.isRequired
        ])
        return true
      }
      assert.throws(
        () => myFunction('myString', '123'),
        'myFunction requires 123 to be of type number.'
      )
    })
  })

  describe('named generic arguments', () => {
    it('named arguments should skip non required validators on null', () => {
      function myFunction ({ amount, address }) {
        ArgTypes.validate(myFunction, {
          amount: ArgTypes.isNumber,
          address: ArgTypes.isString.isRequired
        })
        return true
      }
      assert.doesNotThrow(() => myFunction({ amount: null, address: 'myString' }))
    })

    it('named arguments should skip non required validators on undefined', () => {
      function myFunction ({ amount, address }) {
        ArgTypes.validate(myFunction, {
          amount: ArgTypes.isNumber,
          address: ArgTypes.isString.isRequired
        })
        return true
      }
      assert.doesNotThrow(() => myFunction({ address: 'myString' }))
    })

    it('named arguments should throw on required validators', () => {
      function myFunction ({ amount, address }) {
        ArgTypes.validate(myFunction, {
          amount: ArgTypes.isNumber.isRequired,
          address: ArgTypes.isString.isRequired
        })
        return true
      }
      assert.throws(
        () => myFunction({ address: 'myString ' }),
        'myFunction is missing a required argument with type number.'
      )
    })

    it('named arguments should throw on invalid validation with descriptive message', () => {
      function myFunction ({ amount, address }) {
        ArgTypes.validate(myFunction, {
          amount: ArgTypes.isNumber,
          address: ArgTypes.isString.isRequired
        })
        return true
      }
      assert.throws(
        () => myFunction({ amount: '123', address: 'myString ' }),
        'myFunction requires 123 to be of type number.'
      )
    })
  })

  describe('other arguments', () => {
    it('any type validation should pass through anything', () => {
      function myFunction (arg) {
        ArgTypes.validate(myFunction, [
          ArgTypes.isAny.isRequired
        ])
        return true
      }
      assert.doesNotThrow(() => myFunction(3))
      assert.throws(
        myFunction,
        'myFunction is missing a required argument.'
      )
    })

    it('func type validation should work', () => {
      function myFunction (callback) {
        ArgTypes.validate(myFunction, [
          ArgTypes.isFunc
        ])
        return true
      }
      assert.doesNotThrow(() => myFunction(() => null))
      assert.throws(
        () => myFunction(123),
        'myFunction requires 123 to be of type function.'
      )
    })

    it('bool type validation should work', () => {
      function myFunction (callback) {
        ArgTypes.validate(myFunction, [
          ArgTypes.isBool
        ])
        return true
      }
      assert.doesNotThrow(() => myFunction(false))
      assert.throws(
        () => myFunction(123),
        'myFunction requires 123 to be of type boolean.'
      )
    })
  })
  describe.only('more specific validation', () => {
    it.only('validation should work on class methods', () => {
      class SampleRootChain {
        sampleDeposit (amount) {
          ArgTypes.validate(this.sampleDeposit, [
            ArgTypes.isNumber.isRequired
          ])
          return true
        }
      }

      const chain = new SampleRootChain()
      assert.doesNotThrow(() => chain.sampleDeposit(50))
      assert.throws(() => chain.sampleDeposit(), 'sampleDeposit is missing a required argument with type number.')
      assert.throws(() => chain.sampleDeposit('123'), 'sampleDeposit requires 123 to be of type number.')
    })

    it('metadata type should work', () => {
      function myFunction (metadata) {
        ArgTypes.validate(myFunction, [
          ArgTypes.isMetadata
        ])
        return true
      }
      assert.doesNotThrow(() => myFunction('0xb8aa30d8f1d398883f0eeb5079777c42b8aa30d8f1d398883f0eeb5079777c42'))
      assert.throws(
        () => myFunction('123'),
        'myFunction requires metadata to be a 32-byte hex string.'
      )

      function myNamedFunction ({ metadata }) {
        ArgTypes.validate(myNamedFunction, {
          metadata: ArgTypes.isMetadata
        })
        return true
      }
      assert.doesNotThrow(() => {
        myNamedFunction({
          metadata: 'b8aa30d8f1d398883f0eeb5079777c42b8aa30d8f1d398883f0eeb5079777c42'
        })
      })
      assert.throws(
        () => myNamedFunction({ metadata: '123' }),
        'myNamedFunction requires metadata to be a 32-byte hex string.'
      )
    })

    it('txOptions type should validate passed object correctly', () => {
      function myFunction (txOptions) {
        ArgTypes.validate(myFunction, [
          ArgTypes.isTxOptions.isRequired
        ])
        return true
      }
      assert.doesNotThrow(() => {
        myFunction({
          from: '0xd1d13d34FB9317F9BeB7a2B80D3a26C81EF60030',
          gasPrice: 100000
        })
      })
      assert.throws(
        () => myFunction({
          from: '0xd1d13d34FB9317F9BeB7a2B80D3a26C81EF60030',
          gas: '123123',
          gasPrice: 100000,
          privateKey: '5b5cd305315016813087g5a6cf7f4a694f1c4157725f3e90525672231b22b5c6'
        }),
        'myFunction requires 123123 to be of type number.'
      )
    })
  })
})

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

const ArgTypes = require('../src/ArgTypes')

chai.use(chaiAsPromised)
const assert = chai.assert

describe.only('argumentValidation', () => {
  describe('unnamed arguments', () => {
    it('unnamed arguments should skip non required validators on null', () => {
      function myFunction (amount, address) {
        ArgTypes.validate(myFunction, [
          ArgTypes.number,
          ArgTypes.number.isRequired
        ])
        return true
      }
      assert.doesNotThrow(() => myFunction(null, 100))
    })

    it('unnamed arguments should skip non required validators on undefined', () => {
      function myFunction (amount, address) {
        ArgTypes.validate(myFunction, [
          ArgTypes.number,
          ArgTypes.number.isRequired
        ])
        return true
      }
      assert.doesNotThrow(() => myFunction(undefined, 100))
    })

    it('unnamed arguments should throw on invalid validation with descriptive message', () => {
      function myFunction (amount, address) {
        ArgTypes.validate(myFunction, [
          ArgTypes.number,
          ArgTypes.number.isRequired
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
          ArgTypes.string.isRequired,
          ArgTypes.number.isRequired
        ])
        return true
      }
      assert.throws(
        () => myFunction('myString', '123'),
        'myFunction requires 123 to be of type number.'
      )
    })
  })

  describe('named arguments', () => {
    it('named arguments should skip non required validators on null', () => {
      function myFunction ({ amount, address }) {
        ArgTypes.validate(myFunction, {
          amount: ArgTypes.number,
          address: ArgTypes.string.isRequired
        })
        return true
      }
      assert.doesNotThrow(() => myFunction({ amount: null, address: 'myString' }))
    })

    it('named arguments should skip non required validators on undefined', () => {
      function myFunction ({ amount, address }) {
        ArgTypes.validate(myFunction, {
          amount: ArgTypes.number,
          address: ArgTypes.string.isRequired
        })
        return true
      }
      assert.doesNotThrow(() => myFunction({ address: 'myString' }))
    })

    it('named arguments should throw on required validators', () => {
      function myFunction ({ amount, address }) {
        ArgTypes.validate(myFunction, {
          amount: ArgTypes.number.isRequired,
          address: ArgTypes.string.isRequired
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
          amount: ArgTypes.number,
          address: ArgTypes.string.isRequired
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
    it('func type should work', () => {
      function myFunction (callback) {
        ArgTypes.validate(myFunction, [ ArgTypes.func ])
        return true
      }
      assert.doesNotThrow(() => myFunction(() => null))
      assert.throws(
        () => myFunction(123),
        'myFunction requires 123 to be of type function.'
      )
    })

    it('bool type should work', () => {
      function myFunction (callback) {
        ArgTypes.validate(myFunction, [ ArgTypes.bool ])
        return true
      }
      assert.doesNotThrow(() => myFunction(false))
      assert.throws(
        () => myFunction(123),
        'myFunction requires 123 to be of type boolean.'
      )
    })

    it('metadata type should work', () => {
      function myFunction (metadata) {
        ArgTypes.validate(myFunction, [ ArgTypes.metadata ])
        return true
      }
      assert.doesNotThrow(() => myFunction('0xb8aa30d8f1d398883f0eeb5079777c42b8aa30d8f1d398883f0eeb5079777c42'))
      assert.throws(
        () => myFunction('123'),
        'myFunction requires metadata to be a 32-byte hex string.'
      )

      function myNamedFunction ({ metadata }) {
        ArgTypes.validate(myNamedFunction, {
          metadata: ArgTypes.metadata
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
  })
})

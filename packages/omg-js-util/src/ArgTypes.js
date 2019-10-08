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

/**
* Validates function arguments
* @param {string} name the calling function's name for the error message
* @param {array} passedArgs the calling functions arguments array
* @param {object} validator either a list or object of validator methods
* @throws {TypeError} if invalid input, will throw a TypeError
* @returns {null} returns null if there is no input validation error
*/
function validate (name, passedArgs, validator) {
  const unnamedArgs = Array.isArray(validator)

  const executeValidator = (key, value) => {
    validator[key].name === 'isRequired'
      ? validator[key](name, value)
      : validator[key].test(name, value)
  }

  // if function receives unnamed inputs
  if (unnamedArgs) {
    for (let i = 0; i < validator.length; i++) {
      executeValidator(i, passedArgs[i])
    }
    return
  }

  // if function receives named inputs
  const keys = Object.keys(validator)
  const args = passedArgs[0]
  for (let i = 0; i < keys.length; i++) {
    executeValidator(keys[i], args[keys[i]])
  }
}

const isNumber = {
  isRequired: (fnName, arg) => {
    if (!arg || arg === null) {
      throw TypeError(`${fnName} is missing a required argument with type number.`)
    }
    isNumber.test(fnName, arg)
  },
  test: (fnName, arg) => {
    if (!arg || arg === null) return
    if (typeof arg !== 'number') {
      throw TypeError(`${fnName} requires ${arg} to be of type number.`)
    }
  }
}

const isAny = {
  isRequired: (fnName, arg) => {
    if (!arg || arg === null) {
      throw TypeError(`${fnName} is missing a required argument.`)
    }
    isAny.test(fnName, arg)
  },
  test: (fnName, arg) => null
}

const isString = {
  isRequired: (fnName, arg) => {
    if (!arg || arg === null) {
      throw TypeError(`${fnName} is missing a required argument with type string.`)
    }
    isString.test(fnName, arg)
  },
  test: (fnName, arg) => {
    if (!arg || arg === null) return
    if (typeof arg !== 'string') {
      throw TypeError(`${fnName} requires ${arg} to be of type string.`)
    }
  }
}

const isFunc = {
  isRequired: (fnName, arg) => {
    if (!arg || arg === null) {
      throw TypeError(`${fnName} is missing a required argument with type func.`)
    }
    isFunc.test(fnName, arg)
  },
  test: (fnName, arg) => {
    if (!arg || arg === null) return
    if (typeof arg !== 'function') {
      throw TypeError(`${fnName} requires ${arg} to be of type function.`)
    }
  }
}

const isBool = {
  isRequired: (fnName, arg) => {
    if (!arg || arg === null) {
      throw TypeError(`${fnName} is missing a required argument with type boolean.`)
    }
    isBool.test(fnName, arg)
  },
  test: (fnName, arg) => {
    if (!arg || arg === null) return
    if (typeof arg !== 'boolean') {
      throw TypeError(`${fnName} requires ${arg} to be of type boolean.`)
    }
  }
}

const isMetadata = {
  isRequired: (fnName, arg) => {
    if (!arg || arg === null) {
      throw TypeError(`${fnName} is missing a required argument with type metadata.`)
    }
    isMetadata.test(fnName, arg)
  },
  test: (fnName, arg) => {
    if (!arg || arg === null) return
    let invalid = false
    try {
      const hex = Buffer.from(arg.replace('0x', ''), 'hex')
      invalid = hex.length !== 32
    } catch (err) {
      invalid = true
    }
    if (invalid) {
      throw TypeError(`${fnName} requires metadata to be a 32-byte hex string.`)
    }
  }
}

const isTxOptions = {
  isRequired: (fnName, arg) => {
    if (!arg || arg === null) {
      throw TypeError(`${fnName} is missing a required argument with type txOptions.`)
    }
    isTxOptions.test(fnName, arg)
  },
  test: (fnName, arg) => {
    if (!arg || arg === null) return
    const validation = {
      from: isString.isRequired,
      gas: isNumber.test,
      gasPrice: isAny.test,
      privateKey: isString.test
    }
    Object.keys(validation).forEach(key => {
      const validator = validation[key]
      validator(fnName, arg[key])
    })
  }
}

module.exports = {
  validate,
  // generic types
  isAny,
  isNumber,
  isString,
  isFunc,
  isBool,
  // specific types
  isMetadata,
  isTxOptions
}

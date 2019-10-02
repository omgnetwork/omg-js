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

function validate (fn, validator) {
  const passedArgs = fn.arguments
  const unnamedArgs = Array.isArray(validator)

  const executeValidator = (key, value) => {
    validator[key].name === 'isRequired'
      ? validator[key](fn.name, value)
      : validator[key].test(fn.name, value)
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

const number = {
  isRequired: (fnName, arg) => {
    if (!arg || arg === null) {
      throw TypeError(`${fnName} is missing a required argument with type number.`)
    }
    number.test(fnName, arg)
  },
  test: (fnName, arg) => {
    if (!arg || arg === null) return
    if (typeof arg !== 'number') {
      throw TypeError(`${fnName} requires ${arg} to be of type number.`)
    }
  }
}

const string = {
  isRequired: (fnName, arg) => {
    if (!arg || arg === null) {
      throw TypeError(`${fnName} is missing a required argument with type string.`)
    }
    string.test(fnName, arg)
  },
  test: (fnName, arg) => {
    if (!arg || arg === null) return
    if (typeof arg !== 'string') {
      throw TypeError(`${fnName} requires ${arg} to be of type string.`)
    }
  }
}

const func = {
  isRequired: (fnName, arg) => {
    if (!arg || arg === null) {
      throw TypeError(`${fnName} is missing a required argument with type func.`)
    }
    func.test(fnName, arg)
  },
  test: (fnName, arg) => {
    if (!arg || arg === null) return
    if (typeof arg !== 'function') {
      throw TypeError(`${fnName} requires ${arg} to be of type function.`)
    }
  }
}

const bool = {
  isRequired: (fnName, arg) => {
    if (!arg || arg === null) {
      throw TypeError(`${fnName} is missing a required argument with type boolean.`)
    }
    bool.test(fnName, arg)
  },
  test: (fnName, arg) => {
    if (!arg || arg === null) return
    if (typeof arg !== 'boolean') {
      throw TypeError(`${fnName} requires ${arg} to be of type boolean.`)
    }
  }
}

const metadata = {
  isRequired: (fnName, arg) => {
    if (!arg || arg === null) {
      throw TypeError(`${fnName} is missing a required argument with type metadata.`)
    }
    metadata.test(fnName, arg)
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

module.exports = {
  validate,
  number,
  string,
  func,
  bool,
  metadata
}

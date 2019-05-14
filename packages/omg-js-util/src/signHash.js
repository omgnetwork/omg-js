
const ethUtil = require('ethereumjs-util')
const abi = require('ethereumjs-abi')

// Recursively finds all the dependencies of a type
function dependencies (types, primaryType, found = []) {
  if (found.includes(primaryType)) {
    return found
  }
  if (types[primaryType] === undefined) {
    return found
  }
  found.push(primaryType)
  for (let field of types[primaryType]) {
    for (let dep of dependencies(types, field.type, found)) {
      if (!found.includes(dep)) {
        found.push(dep)
      }
    }
  }
  return found
}

function encodeType (types, primaryType) {
  // Get dependencies primary first, then alphabetical
  let deps = dependencies(types, primaryType)
  deps = deps.filter(t => t !== primaryType)
  deps = [primaryType].concat(deps.sort())

  // Format as a string with fields
  let result = ''
  for (let type of deps) {
    result += `${type}(${types[type].map(({ name, type }) => `${type} ${name}`).join(',')})`
  }
  return result
}

function typeHash (types, primaryType) {
  return ethUtil.keccak256(encodeType(types, primaryType))
}

function encodeData (types, primaryType, data) {
  let encTypes = []
  let encValues = []

  // Add typehash
  encTypes.push('bytes32')
  encValues.push(typeHash(types, primaryType))

  // Add field contents
  for (let field of types[primaryType]) {
    let value = data[field.name]
    if (field.type === 'string' || field.type === 'bytes') {
      encTypes.push('bytes32')
      value = ethUtil.keccak256(value)
      encValues.push(value)
    } else if (types[field.type] !== undefined) {
      encTypes.push('bytes32')
      value = ethUtil.keccak256(encodeData(types, field.type, value))
      encValues.push(value)
    } else if (field.type.lastIndexOf(']') === field.type.length - 1) {
      throw new Error('Arrays currently unimplemented in encodeData')
    } else {
      encTypes.push(field.type)
      encValues.push(value)
    }
  }

  return abi.rawEncode(encTypes, encValues)
}

function structHash (types, primaryType, data) {
  return ethUtil.keccak256(encodeData(types, primaryType, data))
}

// We're always going to use the same domain separator, so we can cache
// the domain hash to avoid hashing it every time.
let domainHash

function getToSignHash (typedData) {
  if (!domainHash) {
    domainHash = structHash(typedData.types, 'EIP712Domain', typedData.domain)
  }
  return ethUtil.keccak256(
    Buffer.concat([
      Buffer.from('1901', 'hex'),
      domainHash,
      structHash(typedData.types, typedData.primaryType, typedData.message)
    ])
  )
}

module.exports = getToSignHash

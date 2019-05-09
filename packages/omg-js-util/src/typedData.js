
const NULL_ADDRESS = '0x0000000000000000000000000000000000000000'
const NULL_INPUT = { blknum: 0, txindex: 0, oindex: 0 }
const NULL_OUTPUT = { owner: NULL_ADDRESS, token: NULL_ADDRESS, amount: 0 }
const NULL_METADATA = '0x0000000000000000000000000000000000000000000000000000000000000000'

const domainSpec = [
  { name: 'name', type: 'string' },
  { name: 'version', type: 'string' },
  { name: 'chainId', type: 'uint256' },
  { name: 'verifyingContract', type: 'address' },
  { name: 'salt', type: 'bytes32' }
]

const txSpec = [
  { name: 'input0', type: 'Input' },
  { name: 'input1', type: 'Input' },
  { name: 'input2', type: 'Input' },
  { name: 'input3', type: 'Input' },
  { name: 'output0', type: 'Output' },
  { name: 'output1', type: 'Output' },
  { name: 'output2', type: 'Output' },
  { name: 'output3', type: 'Output' },
  { name: 'metadata', type: 'bytes32' }
]

const inputSpec = [
  { name: 'blknum', type: 'uint256' },
  { name: 'txindex', type: 'uint256' },
  { name: 'oindex', type: 'uint256' }
]

const outputSpec = [
  { name: 'owner', type: 'address' },
  { name: 'token', type: 'address' },
  { name: 'amount', type: 'uint256' }
]

const domainData = {
  name: 'OMG Network',
  version: '1',
  chainId: 1,
  verifyingContract: '0x44de0ec539b8c4a4b530c78620fe8320167f2f74',
  salt: '0xfad5c7f626d80f9256ef01929f3beb96e058b8b4b0e3fe52d84f054c0e2a7a83'
}

const typedData = {
  types: {
    EIP712Domain: domainSpec,
    Transaction: txSpec,
    Input: inputSpec,
    Output: outputSpec
  },
  domain: domainData,
  primaryType: 'Transaction'
}

function getTypedData (tx) {
  domainData.chainId = 4 // TODO chainId will be removed, for now it's hardcoded to 4

  // Sanitise inputs
  const inputs = tx.inputs.map(i => ({
    blknum: i.blknum,
    txindex: i.txindex,
    oindex: i.oindex
  }))

  // Sanitise Outputs
  // NB Outputs use 'token' instead of 'currency', may be changed in the future
  const outputs = tx.outputs.map(o => ({
    owner: o.owner,
    token: o.currency,
    amount: o.amount.toString()
    // amount: Number(o.amount.toString())
  }))

  typedData.message = {
    input0: inputs.length > 0 ? inputs[0] : NULL_INPUT,
    input1: inputs.length > 1 ? inputs[1] : NULL_INPUT,
    input2: inputs.length > 2 ? inputs[2] : NULL_INPUT,
    input3: inputs.length > 3 ? inputs[3] : NULL_INPUT,
    output0: outputs.length > 0 ? outputs[0] : NULL_OUTPUT,
    output1: outputs.length > 1 ? outputs[1] : NULL_OUTPUT,
    output2: outputs.length > 2 ? outputs[2] : NULL_OUTPUT,
    output3: outputs.length > 3 ? outputs[3] : NULL_OUTPUT,
    metadata: tx.metadata || NULL_METADATA
  }

  return JSON.stringify(typedData)
}

module.exports = {
  getTypedData,
  signHash
}

/// ///////////////////////////////
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

function signHash (typedData) {
  return ethUtil.keccak256(
    Buffer.concat([
      Buffer.from('1901', 'hex'),
      structHash(typedData.types, 'EIP712Domain', typedData.domain),
      structHash(typedData.types, typedData.primaryType, typedData.message)
    ])
  )
}

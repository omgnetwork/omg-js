import { Buffer } from 'buffer';
import { keccak256 } from 'ethereumjs-util';
import { rawEncode } from 'ethereumjs-abi';

import * as TypedDataModule from '@lib/transaction/typedData';

/** @internal */
function dependencies (
  types: TypedDataModule.ITypedDataTypes,
  primaryType: string,
  found = []
): Array<any> {
  if (found.includes(primaryType)) {
    return found
  }
  if (types[primaryType] === undefined) {
    return found
  }
  found.push(primaryType)
  for (const field of types[primaryType]) {
    for (const dep of dependencies(types, field.type, found)) {
      if (!found.includes(dep)) {
        found.push(dep)
      }
    }
  }
  return found
}

/** @internal */
function encodeType (
  types: TypedDataModule.ITypedDataTypes,
  primaryType: string
): string {
  // Get dependencies primary first, then alphabetical
  let deps = dependencies(types, primaryType)
  deps = deps.filter(t => t !== primaryType)
  deps = [primaryType].concat(deps.sort())

  // Format as a string with fields
  let result = ''
  for (const type of deps) {
    result += `${type}(${types[type].map(({ name, type }) => `${type} ${name}`).join(',')})`
  }
  return result
}

/** @internal */
function typeHash (
  types: TypedDataModule.ITypedDataTypes,
  primaryType: string
): Buffer {
  return keccak256(Buffer.from(encodeType(types, primaryType)));
}

/** @internal */
function encodeData (
  types: TypedDataModule.ITypedDataTypes,
  primaryType: string,
  data: TypedDataModule.ITypedDataDomainData | TypedDataModule.ITypedDataMessage
): Buffer {
  const encTypes = []
  const encValues = []

  // Add typehash
  encTypes.push('bytes32')
  encValues.push(typeHash(types, primaryType))

  // Add field contents
  for (const field of types[primaryType]) {
    let value = data[field.name]
    if (field.type === 'string' || field.type === 'bytes') {
      encTypes.push('bytes32')
      value = keccak256(Buffer.from(value))
      encValues.push(value)
    } else if (types[field.type] !== undefined) {
      encTypes.push('bytes32')
      value = keccak256(encodeData(types, field.type, value))
      encValues.push(value)
    } else if (field.type.lastIndexOf(']') === field.type.length - 1) {
      throw new Error('Arrays currently unimplemented in encodeData')
    } else {
      encTypes.push(field.type)
      encValues.push(value)
    }
  }

  return rawEncode(encTypes, encValues)
}

/** @internal */
function structHash (
  types: TypedDataModule.ITypedDataTypes,
  primaryType: string,
  data: TypedDataModule.ITypedDataDomainData | TypedDataModule.ITypedDataMessage) {
  return keccak256(encodeData(types, primaryType, data));
}

/** @internal */
export function hashTypedData (
  typedData: TypedDataModule.ITypedData
): Buffer {
  return keccak256(
    Buffer.concat([
      Buffer.from('1901', 'hex'),
      structHash(typedData.types, 'EIP712Domain', typedData.domain),
      structHash(typedData.types, typedData.primaryType, typedData.message)
    ])
  );
}
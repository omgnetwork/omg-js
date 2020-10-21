/*
Copyright 2020 OmiseGO Pte Ltd

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

     http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License. */

import { Buffer } from 'buffer';
import { keccak256 } from 'ethereumjs-util';
import { rawEncode } from 'ethereumjs-abi';

import * as Interfaces from '@lib/interfaces';

/** @internal */
function dependencies (
  types: Interfaces.ITypedDataTypes,
  primaryType: string,
  found = []
): Array<string> {
  if (found.includes(primaryType)) {
    return found;
  }
  if (types[primaryType] === undefined) {
    return found;
  }
  found.push(primaryType);
  for (const field of types[primaryType]) {
    for (const dep of dependencies(types, field.type, found)) {
      if (!found.includes(dep)) {
        found.push(dep);
      }
    }
  }
  return found;
}

/** @internal */
function encodeType (
  types: Interfaces.ITypedDataTypes,
  primaryType: string
): string {
  // Get dependencies primary first, then alphabetical
  let deps = dependencies(types, primaryType);
  deps = deps.filter(t => t !== primaryType);
  deps = [primaryType].concat(deps.sort());

  // Format as a string with fields
  let result = '';
  for (const type of deps) {
    result += `${type}(${types[type].map(({ name, type }) => `${type} ${name}`).join(',')})`;
  }
  return result;
}

/** @internal */
function typeHash (
  types: Interfaces.ITypedDataTypes,
  primaryType: string
): Buffer {
  return keccak256(Buffer.from(encodeType(types, primaryType)));
}

/** @internal */
function encodeData (
  types: Interfaces.ITypedDataTypes,
  primaryType: string,
  data: Interfaces.ITypedDataDomainData | Interfaces.ITypedDataMessage
): Buffer {
  const encTypes: Array<string> = [];
  const encValues: Array<Buffer | string> = [];

  // Add typehash
  encTypes.push('bytes32');
  encValues.push(typeHash(types, primaryType));

  // Add field contents
  for (const field of types[primaryType]) {
    let value = data[field.name];
    if (field.type === 'string' || field.type === 'bytes') {
      encTypes.push('bytes32');
      value = keccak256(Buffer.from(value));
      encValues.push(value);
    } else if (types[field.type] !== undefined) {
      encTypes.push('bytes32');
      value = keccak256(encodeData(types, field.type, value));
      encValues.push(value);
    } else if (field.type.lastIndexOf(']') === field.type.length - 1) {
      throw new Error('Arrays currently unimplemented in encodeData');
    } else {
      encTypes.push(field.type);
      encValues.push(value);
    }
  }
  return rawEncode(encTypes, encValues);
}

/** @internal */
function structHash (
  types: Interfaces.ITypedDataTypes,
  primaryType: string,
  data: Interfaces.ITypedDataDomainData | Interfaces.ITypedDataMessage
): Buffer {
  return keccak256(encodeData(types, primaryType, data));
}

/** @internal */
export function hashTypedData (
  typedData: Interfaces.ITypedData
): Buffer {
  return keccak256(
    Buffer.concat([
      Buffer.from('1901', 'hex'),
      structHash(typedData.types, 'EIP712Domain', typedData.domain),
      structHash(typedData.types, typedData.primaryType, typedData.message)
    ])
  );
}

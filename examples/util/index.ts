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

export function wait (ms: number): Promise<void> {
  console.log(`Waiting for ${ms * 0.00001667} min...`);
  return new Promise((resolve, _reject) => setTimeout(resolve, ms));
}

export function getFlags (...keys): any {
  const argMap = {}
  for (const position in process.argv) {
    const arg = process.argv[position]
    for (const key of keys) {
      if (arg.includes(key)) {
        const value = arg.split(`--${key}=`)[1]
        argMap[key] = value

        if (key === 'owner' && value !== 'alice' && value !== 'bob') {
          throw Error('Please specify --owner as either alice or bob')
        }
        if (key === 'from' && value !== 'alice' && value !== 'bob') {
          throw Error('Please specify --from as either alice or bob')
        }
        if (key === 'to' && value !== 'alice' && value !== 'bob') {
          throw Error('Please specify --to as either alice or bob')
        }

        break
      }
    }
  }

  const missingArgs = []
  for (const key of keys) {
    if (!argMap[key]) {
      missingArgs.push(`Missing --${key} flag.`)
    }
  }
  if (missingArgs.length) {
    throw Error(JSON.stringify(missingArgs, null, 2))
  }

  return argMap
}
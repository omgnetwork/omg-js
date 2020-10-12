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

import promiseRetry from 'promise-retry';

export function wait (ms: number): Promise<void> {
  console.log(`Waiting for ${ms * 0.00001667} min...`);
  return new Promise((resolve, _reject) => setTimeout(resolve, ms));
}

export async function waitForChallengePeriodToEnd (rootChain) {
  const minExitPeriod =
    (await rootChain.plasmaContract.methods.minExitPeriod().call()) * 1000
  const waitMs = Number(minExitPeriod) * 2

  await wait(waitMs)
  console.log('Challenge period finished')
}

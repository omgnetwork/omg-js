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

import MochaParallel from 'mocha-parallel-tests';
import fs from 'fs';
import os from 'os';

import faucet from './helpers/faucet';

const mochaParallel = new MochaParallel({
  slow: 0,
  fullStackTrace: true,
  reporter: 'list'
});

const allFiles = fs.readdirSync(`${__dirname}/test/`);
// tests that dont work well in parallel environment
const skippedTests = [
  'getExitQueueTest.ts'
];
const files = allFiles.filter(i => !skippedTests.includes(i));

for (const test of files) {
  mochaParallel.addFile(`${__dirname}/test/${test}`);
}

async function setup (): Promise<void> {
  const start = new Date();
  for (const faucetName of files) {
    await faucet.init({ faucetName });
    console.log(`💰 Test faucet funded for ${faucetName}`);
    console.log('\n');
  }
  const end = new Date();
  console.log(`⏳ Total funding time: ${(Number(end) - Number(start)) / 60000} min`);
}

async function runner (): Promise<void> {
  await setup();

  const cores = os.cpus().length;
  console.log(`🚀 Running ${files.length} test files in parallel`);
  console.log(`💻 ${cores} CPI cores available, will run ${cores} tests at a time`);
  mochaParallel.run(fails => {
    if (fails > 0) {
      throw Error(`${fails} failures in test run`);
    }
  });
}

runner();

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

import * as Transporter from '@lib/transport';

export interface IFeeInfo {
  amount: number;
  currency: string;
  pegged_amount: number;
  pegged_currency: string;
  pegged_subunit_to_unit: number;
  subunit_to_unit: number;
  updated_at: string;
}

/** @internal */
export async function getFees (): Promise<Array<IFeeInfo>> {
  return Transporter.post({
    url: `${this.watcherUrl}/fees.all`,
    body: {},
    proxyUrl: this.watcherProxyUrl
  });
}

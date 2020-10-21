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
import * as Interfaces from '@lib/interfaces';

/** @internal */
export async function getStatus (): Promise<Interfaces.IStatus> {
  return Transporter.post({
    url: `${this.watcherUrl}/status.get`,
    body: {},
    proxyUrl: this.watcherProxyUrl
  });
}

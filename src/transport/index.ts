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

import debug from 'debug';
import JSONBigNumber from 'omg-json-bigint';
import axios, { AxiosRequestConfig, AxiosResponse, AxiosTransformer } from 'axios';
import { HttpsProxyAgent } from 'https-proxy-agent';

import * as Errors from '@lib/errors';
import * as Interfaces from '@lib/interfaces';

debug('omg.childchain.rpc');

/** @internal */
export async function get ({
  url,
  proxyUrl
// eslint-disable-next-line @typescript-eslint/no-explicit-any
}: Interfaces.IRequestOptions): Promise<any> {
  try {
    const options: AxiosRequestConfig = {
      method: 'GET',
      url,
      transformResponse: getTransformResponse(),
      httpsAgent: getHttpsProxyAgent(proxyUrl)
    };
    const res: AxiosResponse = await axios.request(options);
    return parseResponse(res);
  } catch (err) {
    throw new Error(err);
  }
}

/** @internal */
export async function post ({
  url,
  body,
  proxyUrl
// eslint-disable-next-line @typescript-eslint/no-explicit-any
}: Interfaces.IRequestOptions): Promise<any> {
  body.jsonrpc = body.jsonrpc || '2.0';
  body.id = body.id || 0;
  try {
    const options: AxiosRequestConfig = {
      method: 'POST',
      url,
      headers: { 'Content-Type': 'application/json' },
      data: JSONBigNumber.stringify(body),
      transformResponse: getTransformResponse(),
      httpsAgent: getHttpsProxyAgent(proxyUrl)
    };
    const res: AxiosResponse = await axios.request(options);
    return parseResponse(res);
  } catch (err) {
    throw new Error(err);
  }
}

// override default behavior of axios, so it doesn't use native JSON.parse
/** @internal */
function getTransformResponse (): Array<AxiosTransformer> {
  return [(data) => data];
}

/** @internal */
function getHttpsProxyAgent (proxyUrl: string): HttpsProxyAgent {
  return proxyUrl
    ? new HttpsProxyAgent({ host: proxyUrl, rejectUnauthorized: false })
    : undefined;
}

/** @internal */
async function parseResponse (res: AxiosResponse): Promise<unknown> {
  let data;
  try {
    // Need to use a JSON parser capable of handling uint256
    data = JSONBigNumber.parse(res.data);
  } catch (err) {
    throw new Error(`Unable to parse response from server: ${err}`);
  }
  debug(`rpc response is ${JSON.stringify(data)}`);
  if (data.success) {
    return data.data;
  }
  throw new Errors.RpcError(data.data);
}

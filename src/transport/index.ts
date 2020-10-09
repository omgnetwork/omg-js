import debug from 'debug';
import JSONBigNumber from 'omg-json-bigint';
import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import { HttpsProxyAgent } from 'https-proxy-agent';

import * as Errors from '@lib/errors';

debug('omg.childchain.rpc');

export interface IRequestBody {
  id?: string | number;
  jsonrpc?: string;
  [key: string]: any;
}

export interface IRequestOptions {
  url: string;
  body?: IRequestBody;
  proxyUrl?: string;
}

/** @internal */
export async function get ({
  url,
  proxyUrl
}: IRequestOptions): Promise<any> {
  try {
    const options: AxiosRequestConfig = {
      method: 'GET',
      url,
      transformResponse: getTransformResponse(),
      httpsAgent: getHttpsProxyAgent(proxyUrl)
    }
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
}: IRequestOptions): Promise<any> {
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
function getTransformResponse (): Array<any> {
  return [(data) => data];
}

/** @internal */
function getHttpsProxyAgent (proxyUrl: string): HttpsProxyAgent {
  return proxyUrl
    ? new HttpsProxyAgent({ host: proxyUrl, rejectUnauthorized: false })
    : undefined;
}

/** @internal */
async function parseResponse (res: AxiosResponse): Promise<any> {
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

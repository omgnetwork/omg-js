import debug from 'debug';
import JSONBigNumber from 'omg-json-bigint';
import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import { HttpsProxyAgent } from 'https-proxy-agent';

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

class RpcError extends Error {
  public code;
  constructor ({ code, description, messages }) {
    super(description || code + (messages ? `, ${messages.code}` : ''))
    this.code = code
  }
}

// override default behavior of axios, so it doesn't use native JSON.parse
function getTransformResponse (): Array<any> {
  return [(data) => data];
}

function getHttpsProxyAgent (proxyUrl: string): HttpsProxyAgent {
  return proxyUrl
    ? new HttpsProxyAgent({ host: proxyUrl, rejectUnauthorized: false })
    : undefined;
}

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
  throw new RpcError(data.data);
}

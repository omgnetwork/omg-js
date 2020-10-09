
interface IOmgJSError {
  origin: string;
  message: string;
}

export class OmgJSError extends Error {
  public readonly origin: string;

  public constructor({
    origin,
    message,
  }: IOmgJSError) {
    super(message);
    this.origin = origin;
  }
}

export class RpcError extends Error {
  public code;
  constructor ({ code, description, messages }) {
    super(description || code + (messages ? `, ${messages.code}` : ''))
    this.code = code
  }
}

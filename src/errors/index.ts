type IPath = 'WATCHER' | 'ROOTCHAIN';

interface IOmgJSError {
  origin: string;
  message: string;
  path: IPath;
}

export class OmgJSError extends Error {
  public readonly origin: string;
  public readonly path: IPath;

  public constructor({
    origin,
    message,
    path
  }: IOmgJSError) {
    super(message);
    this.origin = origin;
    this.path = path;
  }
}

export class RpcError extends Error {
  public code;
  constructor ({ code, description, messages }) {
    super(description || code + (messages ? `, ${messages.code}` : ''))
    this.code = code
  }
}

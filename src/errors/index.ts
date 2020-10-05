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

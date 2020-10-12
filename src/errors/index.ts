export class RpcError extends Error {
  public code;
  constructor ({ code, description, messages }) {
    super(description || code + (messages ? `, ${messages.code}` : ''))
    this.code = code
  }
}

export interface IError {
  name?: string;
  method: string;
  message: string;
  stack: any;
}

export class ValidationError extends Error {
  public name: string = 'ValidationError';
  public method: string;
  public message: string;
  public stack: any;

  public constructor (args: IError) {
    super(args.message);
    this.name = args.name;
    this.method = args.method;
    this.message = args.message;
    this.stack = args.stack;
  }
}

export class OmgJSError extends Error {
  public name: string = 'OmgJSError';
  public method: string;
  public message: string;
  public stack: any;

  public constructor (args: IError) {
    super(args.message);
    this.name = args.name;
    this.method = args.method;
    this.message = args.message;
    this.stack = args.stack;
  }
}

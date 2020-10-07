export interface IGetInflightExitId {
  txBytes: string;
};

export async function getInFlightExitId ({
  txBytes
}: IGetInflightExitId): Promise<string> {
  const { contract } = await this.getPaymentExitGame();
  return contract.methods.getInFlightExitId(txBytes).call();
};

export interface IGetInflightExitData {
  exitIds: Array<string>
};

// NMTODO: define this interface
export interface IInflightExitData {};

export async function getInFlightExitData ({
  exitIds
}: IGetInflightExitData): Promise<IInflightExitData> {
  const { contract } = await this.getPaymentExitGame();
  return contract.methods.inFlightExits(exitIds).call();
};

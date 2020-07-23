import { ethers } from 'ethers';
import { retryOperation } from '../utils/promise-utils';

export class RetryProvider extends ethers.providers.JsonRpcProvider {
  public perform(method: string, params: any): Promise<any> {
    const timeouts = [5_000, 10_000];
    const operation = () => super.perform(method, params);

    return retryOperation(2, operation, { timeouts, delay: 50 });
  }
}

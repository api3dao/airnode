import flatMap from 'lodash/flatMap';
import * as logger from '../../logger';
import * as wallet from '../wallet';
import { ApiCall, ClientRequest, LogsData, RequestErrorCode, RequestStatus } from '../../../types';

export function verifyDesignatedWallet(apiCalls: ClientRequest<ApiCall>[]): LogsData<ClientRequest<ApiCall>[]> {
  const xpub = wallet.getExtendedPublicKey();

  const logsWithVerifiedApiCalls: LogsData<ClientRequest<ApiCall>>[] = apiCalls.map((apiCall) => {
    if (apiCall.status !== RequestStatus.Pending) {
      const log = logger.pend(
        'DEBUG',
        `Designated wallet verification skipped for Request:${apiCall.id} as it has status code:${apiCall.status}`
      );
      return [[log], apiCall];
    }

    // We can't validate the wallet if there is no requester index. There should always be one
    // at this point but just in case there isn't.
    if (!apiCall.requesterIndex) {
      const log = logger.pend(
        'ERROR',
        `Ignoring Request:${apiCall.id} as no requester index could be found for designated wallet verification`
      );
      const updatedApiCall = {
        ...apiCall,
        status: RequestStatus.Ignored,
        errorCode: RequestErrorCode.TemplateNotFound,
      };
      return [[log], updatedApiCall];
    }

    const expectedDesignatedWallet = wallet.deriveWalletAddressFromIndex(xpub, apiCall.requesterIndex!);
    if (apiCall.designatedWallet !== expectedDesignatedWallet) {
      const log = logger.pend(
        'ERROR',
        `Invalid designated wallet:${apiCall.designatedWallet} for Request:${apiCall.id}. Expected:${expectedDesignatedWallet}`
      );
      const updatedApiCall = {
        ...apiCall,
        status: RequestStatus.Ignored,
        errorCode: RequestErrorCode.InvalidDesignatedWallet,
      };
      return [[log], updatedApiCall];
    }

    const log = logger.pend('DEBUG', `Request ID:${apiCall.id} is linked to a valid designated wallet`);
    return [[log], apiCall];
  });

  const logs = flatMap(logsWithVerifiedApiCalls, (a) => a[0]);
  const verifiedApiCalls = flatMap(logsWithVerifiedApiCalls, (a) => a[1]);
  return [logs, verifiedApiCalls];
}

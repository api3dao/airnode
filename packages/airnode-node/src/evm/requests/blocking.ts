import { GroupedRequests, LogsData } from '../../types';

export const blockRequests = (requests: GroupedRequests): LogsData<GroupedRequests> => {
  return [[], requests];
};

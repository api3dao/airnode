import { GoogleAuth } from 'google-auth-library';
import { GcpCloudProvider } from '../../config';
import { WorkerParameters, WorkerResponse } from '../../types';

export async function spawn(params: WorkerParameters): Promise<WorkerResponse> {
  const auth = new GoogleAuth();

  const resolvedName = `airnode-${params.deploymentId}-run`;
  const cloudProvider = params.cloudProvider as GcpCloudProvider;
  const url = `https://${cloudProvider.region}-${cloudProvider.projectId}.cloudfunctions.net/${resolvedName}`;

  const axiosClient = await auth.getIdTokenClient(url);

  const response = await axiosClient.request<WorkerResponse>({
    url,
    method: 'POST',
    data: params.payload,
  });

  return response.data;
}

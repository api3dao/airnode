# Docker instructions

1. Build the Docker image (you can skip this step and fetch the pre-built image)
```sh
mv Dockerfile Dockerfile-deployer && \
  mv Dockerfile-client Dockerfile && \
  docker build . -t api3/airnode-client:pre-alpha && \
  mv Dockerfile Dockerfile-client && \
  mv Dockerfile-deployer Dockerfile
```

2. Ensure that your `.env` file looks like [`.env.example`](https://github.com/api3dao/airnode/blob/pre-alpha/packages/node/__dev__/.env.example) and is the current working directory.
Also, **do not** use quotations around your mnemonic or other variables.

3. Also ensure that [`config.json`](https://github.com/api3dao/airnode/blob/pre-alpha/packages/node/__dev__/config.json.example) is also in the current working directory.
Note that `nodeSettings.cloudProvider` should be `local`.

4. The following command runs an airnode client that is invoked every minute

*If you are using Windows, use CMD (and not PowerShell), replace `\` with `^` and `$(pwd)` with `%cd%`.*

```sh
docker run -it --rm \
    -v $(pwd):/airnode/out \
    --restart unless-stopped
    api3/airnode-client:pre-alpha
```

5. The docker image comes with a [healthcheck status](https://docs.docker.com/engine/reference/builder/#healthcheck) that can be used to monitor the health of the `airnode-client`. If the container becomes unhealthy due to any reason, you should view the logs(in case of any errors) and then restart the container. (Note: healthy status of the container does not indicate that there is no error while running the `airnode-client`, it just ensures that the `airnode-client` is being executed every minute and not halting. It is advisable to view the logs to check the actual status).

6. If you want the `airnode-client` to auto-restart incase of unhealthy status then you can run the following [image](https://github.com/willfarrell/docker-autoheal) that checks for unhealthy containers and restarts them.

```
docker run -d \
    --name autoheal \
    --restart=always \
    -e AUTOHEAL_CONTAINER_LABEL=all \
    -v /var/run/docker.sock:/var/run/docker.sock \
    willfarrell/autoheal
```

# Logs

To view the logs you can use the following command 

```
docker inspect --format "{{json .State.Health }}" <containter_name> | jq
```

Expected Output

```
{
  "Status": "healthy",
  "FailingStreak": 0,
  "Log": [
    {
      "Start": "2021-03-19T02:40:22.1717628Z",
      "End": "2021-03-19T02:40:50.9162687Z",
      "ExitCode": 0,
      "Output": "yarn run v1.22.5\n$ (cd packages/node && yarn run dev:invoke)\n$ (cd __dev__ && ts-node invoke.ts)\n[2021-03-19 02:40:50.214] INFO Coordinator starting...                                                           Coordinator-ID:a82f50c2736cf3db\n[2021-03-19 02:40:50.788] INFO Fetching current block and provider admin details...                              Coordinator-ID:a82f50c2736cf3db, Provider:evm-local, Chain:EVM, Chain-ID:31337\n[2021-03-19 02:40:50.788] INFO Current block:14                                                                  Coordinator-ID:a82f50c2736cf3db, Provider:evm-local, Chain:EVM, Chain-ID:31337\n[2021-03-19 02:40:50.788] INFO Admin address:0x2886De6bbd66DB353C5Ce2e91359e7C39C962fd7                          Coordinator-ID:a82f50c2736cf3db, Provider:evm-local, Chain:EVM, Chain-ID:31337\n[2021-03-19 02:40:50.788] INFO Provider extended public key:xpub661MyMwAqRbcGeCE1g3KTUVGZsFDE3jMNinRPGCQGQsAp1nwinB9Pi16ihKPJw7qtaaTFuBHbRPeSc6w3AcMjxiHkAPfyp1hqQRbthv4Ryx  Coordinator-ID:a82f50c2736cf3db, Provider:evm-local, Chain:EVM, Chain-ID:31337\n[2021-03-19 02:40:50.816] INFO Pending requests: 0 API call(s), 0 withdrawal(s)                                  Coordinator-ID:a82f50c2736cf3db, Provider:evm-local, Chain:EVM, Chain-ID:31337\n[2021-03-19 02:40:50.830] INFO Initialized EVM provider:evm-local                                                Coordinator-ID:a82f50c2736cf3db\n[2021-03-19 02:40:50.830] INFO Forking to initialize providers complete                                          Coordinator-ID:a82f50c2736cf3db\n[2021-03-19 02:40:50.831] INFO No actionable requests detected. Returning...                                     Coordinator-ID:a82f50c2736cf3db\nDone in 28.21s.\n"
    },
  ]
}
```
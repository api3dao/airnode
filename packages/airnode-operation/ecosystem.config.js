module.exports = {
  apps: [
    {
      name: 'web-api',
      script: 'ts-node src/server.ts',
      env: {
        NODE_ENV: 'development',
      },
      env_production: {
        NODE_ENV: 'production',
      },

      // Logs
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      error_file: 'logs/web-api.log',
      out_file: 'logs/web-api.log',
      merge_logs: true,

      // Watching
      watch: ['src'],
      watch_delay: 500,
      ignore_watch: ['node_modules'],
    },
    {
      name: 'ethereum-node',
      script: 'hardhat node',
      env: {
        NODE_ENV: 'development',
      },
      env_production: {
        NODE_ENV: 'production',
      },

      // Logs
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      error_file: 'logs/ethereum-node.log',
      out_file: 'logs/ethereum-node.log',
      merge_logs: true,
    },
  ],
};

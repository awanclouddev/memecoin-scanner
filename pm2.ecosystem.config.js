module.exports = {
  apps: [
    {
      name: 'memecoin-web',
      script: 'npm',
      args: 'run start',
      env: {
        NODE_ENV: 'production'
      }
    },
    {
      name: 'memecoin-daemon',
      script: 'npm',
      args: 'run start-daemon',
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
};

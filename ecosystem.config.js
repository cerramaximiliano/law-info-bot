// ecosystem.config.js
module.exports = {
  apps: [
    {
      name: "lawbot-main",
      script: "index.js",
      instances: 1,
      max_memory_restart: "500M",
      exec_mode: "fork",
      exp_backoff_restart_delay: 1000,
      max_restarts: 5,
      restart_delay: 4000,
      watch: false,
      autorestart: true,
      // Evitar que PM2 intente reiniciar constantemente si hay fallos
      max_restart_retries: 5,
      ignore_watch: [
        "node_modules",
        "src/logs",
        ".env",
        ".env.production",
        ".env.development",
        ".git",
      ], // Excluye la carpeta de logs y node_modules
      env: {
        PORT: 8080,
        NODE_ENV: "production",
      },
    },
  ],
};

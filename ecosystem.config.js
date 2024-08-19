// ecosystem.config.js
module.exports = {
    apps: [
      {
        name: "lawbot-main",
        script: "app.js",
        watch: false,
        ignore_watch: ["node_modules", "server/logs", ".env", ".env.production", ".env.development", ".git"], // Excluye la carpeta de logs y node_modules
        env: {
          PORT: 8080,
          NODE_ENV: "production"
        },
      }
    ]
  };
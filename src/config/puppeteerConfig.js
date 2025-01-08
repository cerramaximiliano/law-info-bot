const defaultPuppeteerConfig = {
  headless: 'new',  // Usar el nuevo modo headless
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
    '--no-first-run',
    '--no-zygote',
    '--single-process',
    '--disable-extensions',
    '--ignore-certificate-errors',
    '--enable-features=NetworkService',
    '--window-size=1280,800'
  ],
  defaultViewport: {
    width: 1280,
    height: 800
  },
  timeout: 120000,  // 2 minutos de timeout
  ignoreHTTPSErrors: true,
  pipe: true,       // Usar pipe en lugar de WebSocket
};

module.exports = defaultPuppeteerConfig;

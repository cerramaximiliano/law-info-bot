const puppeteer = require("puppeteer");
const genericPool = require("generic-pool");
const defaultPuppeteerConfig = require("../config/puppeteerConfig");
const { logWithDetails } = require("../config/logger");

const logError = (context, error) => {
  logWithDetails.error(`${context}:`, {
    message: error.message,
    stack: error.stack,
    name: error.name,
    details: error.toString(),
    errorObject: JSON.stringify(error, Object.getOwnPropertyNames(error))
  });
};

const factory = {
  create: async () => {
    try {
      logWithDetails.info('Iniciando creación de navegador...');
      
      const browser = await puppeteer.launch(defaultPuppeteerConfig);
      
      // Verificar que el navegador está funcionando
      const pages = await browser.pages();
      logWithDetails.info(`Navegador creado exitosamente con ${pages.length} páginas`);

      // Agregar un manejador de desconexión
      browser.on('disconnected', () => {
        logWithDetails.warn('Navegador desconectado');
      });
      
      return browser;
    } catch (error) {
      logError('Error crítico al crear navegador', error);
      throw error;
    }
  },
  destroy: async (browser) => {
    try {
      if (!browser) {
        logWithDetails.warn('Intento de destruir un navegador nulo');
        return;
      }
      
      if (browser.isConnected()) {
        const pages = await browser.pages();
        await Promise.all(pages.map(page => page.close()));
        await browser.close();
        logWithDetails.info('Navegador destruido exitosamente');
      } else {
        logWithDetails.warn('Navegador ya estaba desconectado');
      }
    } catch (error) {
      logError('Error al destruir navegador', error);
    }
  },
  validate: async (browser) => {
    try {
      return browser && browser.isConnected();
    } catch (error) {
      logError('Error validando navegador', error);
      return false;
    }
  }
};

const browserPool = genericPool.createPool(factory, {
  max: 2,
  min: 1,
  testOnBorrow: true,
  acquireTimeoutMillis: 120000,
  idleTimeoutMillis: 60000,
  evictionRunIntervalMillis: 5000,
  autostart: false, // Cambiar a false para control manual
  validator: factory.validate
});

// Mejorar los event listeners
browserPool.on('factoryCreateError', (error) => {
  logError('Error en factory create', error);
});

browserPool.on('factoryDestroyError', (error) => {
  logError('Error en factory destroy', error);
});

let poolInitialized = false;
let initializationPromise = null;

// Función para inicializar el pool
const initPool = async () => {
  if (poolInitialized) {
    return;
  }

  if (initializationPromise) {
    return initializationPromise;
  }

  initializationPromise = (async () => {
    try {
      logWithDetails.info('Iniciando inicialización del pool...');
      
      const browser = await factory.create();
      
      if (!browser || !browser.isConnected()) {
        throw new Error('No se pudo crear el navegador inicial');
      }

      poolInitialized = true;
      logWithDetails.info('Pool inicializado correctamente');
      
      await factory.destroy(browser);
    } catch (error) {
      logError('Error en inicialización del pool', error);
      poolInitialized = false;
      throw error;
    } finally {
      initializationPromise = null;
    }
  })();

  return initializationPromise;
};

module.exports = {
  browserPool,
  initPool,
  isInitialized: () => poolInitialized,
  waitForInitialization: async () => {
    if (poolInitialized) return true;
    if (initializationPromise) {
      await initializationPromise;
      return true;
    }
    await initPool();
    return true;
  }
};
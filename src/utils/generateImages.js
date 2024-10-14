const puppeteer = require("puppeteer");
const path = require("path");
const fs = require("fs");
const { logger } = require("../config/logger");

let browser;
async function generateScreenshot(html) {
  try {
    browser = await puppeteer.launch({
      headless: false,
      args: [
        "--no-sandbox",
        "--start-maximized",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--no-first-run",
        "--no-zygote",
        "--single-process",
        "--disable-gpu",
      ],
    });

    const page = await browser.newPage();
    // Obtén el tamaño de la pantalla y establece el viewport al tamaño de la pantalla
    const dimensions = await page.evaluate(() => {
      return {
        width: window.screen.width,
        height: window.screen.height,
      };
    });

    await page.setViewport(dimensions);
    await page.setContent(html);

    const element = await page.$(".container");

    // Generar timestamp con fecha y hora
    const timestamp = new Date().toISOString().replace(/:/g, "-");

    const screenshotDir = path.join(__dirname, "..", "files"); // ".." para salir de "utils" y entrar a "files" dentro de "src"
    const screenshotPath = path.join(screenshotDir, `container-screenshot-${timestamp}.png`);
  
    // Verifica si la carpeta 'src/files' existe, y si no, la crea
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }

    // Captura solo el contenido del nodo "container"
    await element.screenshot({
      path: screenshotPath,
    });
  } catch (err) {
    logger.error(`Error en la generación del post: ${err}`);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

module.exports = { generateScreenshot };

const puppeteer = require("puppeteer");

async function generateScreenshot(html) {
  const browser = await puppeteer.launch({
    headless: false,
    args: ["--start-maximized"],
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


  const element = await page.$('.container');

  // Captura solo el contenido del nodo "container"
  await element.screenshot({ path: 'container-screenshot.png' });
  

  //await browser.close();
}

module.exports = { generateScreenshot };

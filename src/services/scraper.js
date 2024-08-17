const puppeteer = require('puppeteer');
const News = require('../models/news');
const { saveNewNews } = require('../controllers/notiicasControllers');

const scrapeNoticias =  async () => {

  const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    // Navega a la página objetivo
    await page.goto('https://www.diariojudicial.com/', { waitUntil: 'networkidle2' });

    // Extrae los elementos con texto y href que contienen "news"
    const elements = await page.evaluate(() => {
        const links = [];
        // Selecciona todos los elementos con un atributo href
        document.querySelectorAll('a[href]').forEach(anchor => {
            const textContent = anchor.textContent.trim(); // Extrae el texto
            const href = anchor.href; // Extrae el href

            // Verifica si el href contiene la palabra "news"
            if (href.includes("news") && textContent) {
                links.push({ text: textContent, href: href });
            }
        });

        // Agrupa los enlaces por href
        const groupedLinks = links.reduce((acc, current) => {
            const existing = acc.find(item => item.href === current.href);
            if (existing) {
                // Actualiza title (el más corto) y text (el más largo)
                const newTitle = current.text.length < existing.title.length ? current.text : existing.title;
                const newText = current.text.length > existing.text.length ? current.text : existing.text;

                // Asegura que title y text sean diferentes
                if (newTitle !== newText) {
                    existing.title = newTitle;
                    existing.text = newText;
                }
            } else {
                // Extrae el número del href utilizando una expresión regular
                const numberMatch = current.href.match(/news-(\d+)-/);
                const number = numberMatch ? numberMatch[1] : null;

                // Añade nuevo elemento al grupo con el número extraído
                acc.push({ 
                    href: current.href, 
                    title: current.text, 
                    text: current.text,
                    id: Number(number), // Agrega el número extraído
                    siteId: "diariojudicial"
                });
            }
            return acc;
        }, []);

        // Filtra los enlaces donde title y text son iguales
        const filteredLinks = groupedLinks.filter(item => item.title !== item.text);

        return filteredLinks;
    });

    // Muestra los elementos agrupados en la consola
    console.log(elements);

    const savedNews = await saveNewNews(elements, 'diariojudicial');

    // Cierra el navegador
    await browser.close();

    return savedNews
};



module.exports = scrapeNoticias;
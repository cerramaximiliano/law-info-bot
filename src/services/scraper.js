const axios = require('axios');
const cheerio = require('cheerio');
const Noticia = require('../models/noticia');

const scrapeNoticias = async () => {
  try {
    const { data } = await axios.get('https://www.diariojudicial.com/');
    const $ = cheerio.load(data);

    const noticias = [];

    $('.class-to-identify-news').each((i, elem) => {
      const titulo = $(elem).find('.class-for-title').text();
      const resumen = $(elem).find('.class-for-summary').text();
      const enlace = $(elem).find('a').attr('href');
      const fecha = new Date(); // Ajustar según cómo se muestra la fecha en la página

      noticias.push({ titulo, resumen, enlace, fecha });
    });

    for (const noticia of noticias) {
      const exists = await Noticia.findOne({ enlace: noticia.enlace });
      if (!exists) {
        const nuevaNoticia = new Noticia(noticia);
        await nuevaNoticia.save();
        console.log(`Noticia guardada: ${noticia.titulo}`);
      }
    }
  } catch (error) {
    console.error('Error scraping noticias:', error);
  }
};

module.exports = scrapeNoticias;
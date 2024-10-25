const cheerio = require("cheerio");

  

function extractArticles(html) {
    const $ = cheerio.load(html);
    const articles = [];
  
    $('body *').each((i, elem) => {
      const text = $(elem).text().trim();
      if (text.startsWith('ARTÍCULO')) {
        articles.push(text);
      }
    });
  
    return articles;
  }

module.exports = { extractArticles };

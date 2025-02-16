const axios = require("axios");
const cheerio = require("cheerio");
const { logWithDetails } = require("../config/logger");



async function fetchWebContentComercio(url) {
    try {
        const response = await axios.get(url, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
            },
            timeout: 10000
        });

        const $ = cheerio.load(response.data);

        // Términos que indican que es una página de empleados de comercio
        const requiredContextTerms = [
            'empleados de comercio',
            'faecys',
            'escala salarial comercio',
            'paritarias comercio'
        ];

        // Patrones para identificar código y contenido no deseado
        const unwantedPatterns = [
            /if\s*\(/,
            /function/,
            /</,
            />/,
            /\{/,
            /\}/,
            /window\./,
            /\$\(/,
            /javascript/i,
            /const /,
            /let /,
            /var /
        ];

        // Función para verificar si el texto contiene código
        const containsCode = (text) => {
            return unwantedPatterns.some(pattern => pattern.test(text));
        };

        // Función para verificar si la página es relevante
        const isRelevantPage = (text) => {
            const lowercaseText = text.toLowerCase();
            return requiredContextTerms.some(term =>
                lowercaseText.includes(term.toLowerCase())
            );
        };

        // Verificar si la página es relevante
        const pageContent = $('body').text();
        if (!isRelevantPage(pageContent)) {
            return null;
        }

        // Categorías con sus patrones y validaciones
        const categories = [
            {
                name: 'Maestranza',
                pattern: /maestranza.*?(?:categoría|cat\.?)\s*[ABC]/i
            },
            {
                name: 'Administrativos',
                pattern: /administrativos.*?(?:categoría|cat\.?)\s*[ABCDEF]/i
            },
            {
                name: 'Cajeros',
                pattern: /cajeros.*?(?:categoría|cat\.?)\s*[ABC]/i
            },
            {
                name: 'Auxiliares Generales',
                pattern: /auxiliares generales.*?(?:categoría|cat\.?)\s*[ABC]/i
            },
            {
                name: 'Auxiliares Especializados',
                pattern: /auxiliares especializados.*?(?:categoría|cat\.?)\s*[AB]/i
            },
            {
                name: 'Vendedores',
                pattern: /vendedores.*?(?:categoría|cat\.?)\s*[ABCD]/i
            }
        ];

        // Patrón para valores monetarios
        const monetaryPattern = /\$?\s*\d{3}(?:[.,]\d{3})*(?:[.,]\d{2})?/;

        // Función para validar una sección
        const isValidSection = (text) => {
            if (containsCode(text)) return false;

            // Debe contener al menos una categoría con su patrón correspondiente
            const hasCategory = categories.some(cat => cat.pattern.test(text));

            // Debe contener valores monetarios
            const hasMonetary = monetaryPattern.test(text);

            return hasCategory && hasMonetary;
        };

        // Extraer secciones relevantes
        const relevantSections = [];
        $('p, div, table, tr, section').each((_, element) => {
            const $element = $(element);

            // Ignorar elementos ocultos o de navegación
            if ($element.closest('nav, header, footer, script, style').length) {
                return;
            }

            const text = $element.text().trim();
            if (text && isValidSection(text)) {
                // Limpiar el texto
                const cleanedText = text
                    .replace(/\s+/g, ' ')
                    .replace(/\n+/g, '\n')
                    .trim();

                relevantSections.push(cleanedText);
            }
        });

        // Si no hay secciones relevantes, retornar null
        if (relevantSections.length === 0) {
            return null;
        }

        // Unir secciones y eliminar duplicados
        const uniqueSections = [...new Set(relevantSections)];
        return uniqueSections.join('\n---\n');

    } catch (error) {
        logWithDetails.error(`Error al obtener contenido de ${url}:`, error.message);
        return null;
    }
}


async function fetchWebContentConstruccion(url) {
    try {
        const response = await axios.get(url, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
            },
            timeout: 10000
        });

        const $ = cheerio.load(response.data);

        // Términos que indican que es una página de UOCRA
        const requiredContextTerms = [
            'uocra',
            'construcción',
            'escala salarial',
            'nuevas escalas',
            'paritarias construcción'
        ];

        // Patrones para identificar código y contenido no deseado
        const unwantedPatterns = [
            /if\s*\(/,
            /function/,
            /</,
            />/,
            /\{/,
            /\}/,
            /window\./,
            /\$\(/,
            /javascript/i,
            /const /,
            /let /,
            /var /
        ];

        // Función para verificar si el texto contiene código
        const containsCode = (text) => {
            return unwantedPatterns.some(pattern => pattern.test(text));
        };

        // Función para verificar si la página es relevante
        const isRelevantPage = (text) => {
            const lowercaseText = text.toLowerCase();
            return requiredContextTerms.some(term =>
                lowercaseText.includes(term.toLowerCase())
            );
        };

        // Verificar si la página es relevante
        const pageContent = $('body').text();
        if (!isRelevantPage(pageContent)) {
            return null;
        }

        // Categorías con sus patrones y validaciones
        const categories = [
            {
                name: 'Oficial especializado',
                pattern: /oficial(?:\s+)?especializado.*?(?:zona|categoría)\s*[ABCD]/i
            },
            {
                name: 'Oficial',
                pattern: /oficial(?!\s+especializado).*?(?:zona|categoría)\s*[ABCD]/i
            },
            {
                name: 'Medio oficial',
                pattern: /medio\s+oficial.*?(?:zona|categoría)\s*[ABCD]/i
            },
            {
                name: 'Ayudante',
                pattern: /ayudante.*?(?:zona|categoría)\s*[ABCD]/i
            },
            {
                name: 'Sereno',
                pattern: /sereno.*?(?:zona|categoría)\s*[ABCD]/i
            }
        ];

        // Patrones de zonas
        const zonaPatterns = [
            /zona\s*a/i,
            /zona\s*b/i,
            /zona\s*c(?!\s+austral)/i,
            /zona\s*c\s+austral/i
        ];

        // Patrón para valores monetarios (adaptado para valores más grandes)
        const monetaryPattern = /\$?\s*\d{3}(?:[.,]\d{3})*(?:[.,]\d{2})?/;

        // Función para validar una sección
        const isValidSection = (text) => {
            if (containsCode(text)) return false;

            // Debe contener al menos una categoría con su patrón correspondiente
            const hasCategory = categories.some(cat => cat.pattern.test(text));

            // Debe contener al menos una referencia a zona
            const hasZona = zonaPatterns.some(pattern => pattern.test(text));

            // Debe contener valores monetarios
            const hasMonetary = monetaryPattern.test(text);

            return hasCategory && hasZona && hasMonetary;
        };

        // Extraer secciones relevantes
        const relevantSections = [];
        $('p, div, table, tr, section').each((_, element) => {
            const $element = $(element);

            // Ignorar elementos ocultos o de navegación
            if ($element.closest('nav, header, footer, script, style').length) {
                return;
            }

            // Si es una tabla, procesar toda la tabla como una unidad
            if (element.tagName === 'table') {
                const tableText = [];
                $element.find('tr').each((_, row) => {
                    const rowText = $(row).text().trim();
                    if (rowText) {
                        tableText.push(rowText);
                    }
                });
                const fullTableText = tableText.join(' ');
                if (isValidSection(fullTableText)) {
                    relevantSections.push(fullTableText);
                }
                return;
            }

            const text = $element.text().trim();
            if (text && isValidSection(text)) {
                // Limpiar el texto
                const cleanedText = text
                    .replace(/\s+/g, ' ')
                    .replace(/\n+/g, '\n')
                    .trim();

                relevantSections.push(cleanedText);
            }
        });

        // Si no hay secciones relevantes, retornar null
        if (relevantSections.length === 0) {
            return null;
        }

        // Unir secciones y eliminar duplicados
        const uniqueSections = [...new Set(relevantSections)];
        return uniqueSections.join('\n---\n');

    } catch (error) {
        console.error(`Error al obtener contenido de ${url}:`, error.message);
        return null;
    }
}

async function fetchWebContentGastronomia(url) {
    try {
        const response = await axios.get(url, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
            },
            timeout: 10000
        });

        const $ = cheerio.load(response.data);

        // Términos que indican que es una página de gastronomía y hotelería
        const requiredContextTerms = [
            'uthgra',
            'fehgra',
            'gastronomicos',
            'hoteleros',
            'escala salarial',
            '389/04'
        ];

        // Términos que indican que el contenido NO es relevante
        const excludedTerms = [
            'suterh',
            'encargados de edificios'
        ];

        // Función para verificar si el texto contiene términos excluidos
        const containsExcludedTerms = (text) => {
            const lowercaseText = text.toLowerCase();
            return excludedTerms.some(term => 
                lowercaseText.includes(term.toLowerCase())
            );
        };

        // Función para verificar si la página es relevante
        const isRelevantPage = (text) => {
            const lowercaseText = text.toLowerCase();
            return requiredContextTerms.some(term =>
                lowercaseText.includes(term.toLowerCase())
            ) && !containsExcludedTerms(text);
        };

        // Verificar si la página es relevante
        const pageContent = $('body').text();
        if (!isRelevantPage(pageContent)) {
            return null;
        }

        // Función mejorada para extraer tablas
        const extractTableContent = ($table) => {
            let tableContent = [];
            
            // Extraer encabezados
            const headers = $table.find('th').map((_, th) => $(th).text().trim()).get();
            if (headers.length > 0) {
                tableContent.push(headers.join(' | '));
            }
            
            // Extraer filas
            $table.find('tr').each((_, row) => {
                const $row = $(row);
                // Solo procesar filas que tengan celdas td (no encabezados)
                if ($row.find('td').length > 0) {
                    const rowData = $row.find('td').map((_, cell) => {
                        // Obtener todo el texto, incluyendo elementos anidados
                        return $(cell).text().trim();
                    }).get();
                    
                    if (rowData.some(cell => cell.length > 0)) {
                        tableContent.push(rowData.join(' | '));
                    }
                }
            });

            return tableContent.join('\n');
        };

        // Función para validar si una tabla contiene datos salariales
        const isValidSalaryTable = (tableText) => {
            const lowercaseText = tableText.toLowerCase();
            
            // Patrones para identificar tablas salariales
            const salaryPatterns = [
                /\$\s*\d{3,}/,              // Valores monetarios
                /catego[rí]a/i,             // Categorías
                /sueldo|salario|básico/i,   // Términos salariales
                /nivel|escala/i             // Términos de escala
            ];

            return salaryPatterns.some(pattern => pattern.test(tableText)) &&
                   !containsExcludedTerms(tableText);
        };

        // Extraer contenido relevante
        const relevantContent = [];

        // Buscar tablas específicamente
        $('table, .table, [class*="tabla"], [class*="scale"], [class*="salary"]').each((_, element) => {
            const $element = $(element);
            
            // Ignorar tablas en elementos de navegación
            if ($element.closest('nav, header, footer, script, style').length) {
                return;
            }

            const tableContent = extractTableContent($element);
            if (tableContent && isValidSalaryTable(tableContent)) {
                relevantContent.push(tableContent);
            }
        });

        // Buscar también en divs que puedan contener tablas o información estructurada
        $('div[class*="content"], div[class*="main"], article, section').each((_, element) => {
            const $element = $(element);
            
            // Buscar tablas dentro del div
            $element.find('table').each((_, table) => {
                const tableContent = extractTableContent($(table));
                if (tableContent && isValidSalaryTable(tableContent)) {
                    relevantContent.push(tableContent);
                }
            });

            // Buscar también contenido estructurado que no esté en tablas
            const structuredContent = $element.children().map((_, child) => {
                const text = $(child).text().trim();
                return text.includes('$') ? text : null;
            }).get().filter(Boolean);

            if (structuredContent.length > 0) {
                const content = structuredContent.join('\n');
                if (isValidSalaryTable(content)) {
                    relevantContent.push(content);
                }
            }
        });

        if (relevantContent.length === 0) {
            return null;
        }

        // Limpiar y unir el contenido
        const cleanedContent = relevantContent
            .map(content => content.replace(/\s+/g, ' ').trim())
            .filter(Boolean)
            .filter((content, index, self) => self.indexOf(content) === index) // Eliminar duplicados
            .join('\n---\n');

        return cleanedContent;

    } catch (error) {
        console.error(`Error al obtener contenido de ${url}:`, error.message);
        return null;
    }
}

async function searchWebData(query, limit = 10, type) {

    try {
        // Verificar que tenemos la API key
        if (!process.env.SERP_API_KEY) {
            throw new Error('SERP_API_KEY no está configurada en las variables de entorno');
        }

        // Realizar búsqueda en Google
        const searchResponse = await axios.get('https://serpapi.com/search', {
            params: {
                engine: "google",
                api_key: process.env.SERP_API_KEY,
                q: query,
                num: limit,
            }
        });

        if (!searchResponse.data.organic_results) {

            throw new Error('No se encontraron resultados de búsqueda');
        }

        const searchResults = searchResponse.data.organic_results
            .slice(0, limit + 1)
            .map(r => r.link);

        logWithDetails.info(`Obteniendo resultados de búsqueda web: ${JSON.stringify(searchResults)}`)
        // Extraer contenido de cada URL
        const results = await Promise.all(
            searchResults.map(async (url) => {
                let content;
                if (type === "comercio") {
                    content = await fetchWebContentComercio(url);

                } else if (type === "construccion") {
                    content = await fetchWebContentConstruccion(url);
                } else if (type === "hoteleria") {
                    content = await fetchWebContentGastronomia(url);
                }

                return {
                    url,
                    content: content || null
                };
            })
        );

        // Filtrar resultados nulos y retornar
        return results.filter(result => result.content);

    } catch (error) {
        throw new Error(`Error al buscar datos web: ${error.message}`);
    }
}

module.exports = { searchWebData }
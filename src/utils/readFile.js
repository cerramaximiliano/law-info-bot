const fs = require("fs");
const path = require("path");
const pdf = require("pdf-parse");

const extractData = async (filePath) => {
  try {
    // Asegúrate de obtener la ruta absoluta del archivo
    const absoluteFilePath = path.resolve(filePath);

    // Lee el archivo PDF
    const dataBuffer = fs.readFileSync(absoluteFilePath);
    const pdfData = await pdf(dataBuffer);
    console.log(pdfData)
    return pdfData.text
  } catch (error) {
    console.error("Error al procesar el archivo:", error);
  }
};

function iterateTextByLine(text) {
    const lines = text.split("\n");
    const regex = /\d{1,3}(\.(\d{3}))*(,\d+)?/g;
    let numbers = [];
    let previousLine = "";
    let twoLinesAgo = "";
    let currentFecha = "";

    const months = {
        ENERO: 0, FEBRERO: 1, MARZO: 2, ABRIL: 3, MAYO: 4, JUNIO: 5, JULIO: 6,
        AGOSTO: 7, SEPTIEMBRE: 8, OCTUBRE: 9, NOVIEMBRE: 10, DICIEMBRE: 11
    };

    lines.forEach((line, index) => {
        let foundDate = false;

        // Variante 1: Fecha en una sola línea o en formato "2º DE AGOSTO DE 2023" o "A PARTIR DEL 2º DE AGOSTO DE 2023"
        const fullDateMatch = line.match(/(?:A PARTIR DE[L]?\s+)?(\d{1,2})[°º]?\s+DE\s+(ENERO|FEBRERO|MARZO|ABRIL|MAYO|JUNIO|JULIO|AGOSTO|SEPTIEMBRE|OCTUBRE|NOVIEMBRE|DICIEMBRE)\s+DE\s+(\d{4})/i);
        if (fullDateMatch) {
            const day = fullDateMatch[1];
            const month = fullDateMatch[2];
            const year = fullDateMatch[3];
            currentFecha = new Date(year, months[month.toUpperCase()], day).toISOString();
            foundDate = true;
        }

        // Variante 2: Fecha distribuida en dos líneas
        if (!foundDate) {
            const monthYearMatch = line.match(/DE\s+(ENERO|FEBRERO|MARZO|ABRIL|MAYO|JUNIO|JULIO|AGOSTO|SEPTIEMBRE|OCTUBRE|NOVIEMBRE|DICIEMBRE)\s+DE\s+(\d{4})/i);
            const dayMatchSingle = previousLine.match(/(?:A PARTIR DE[L]?\s+)?(\d{1,2})[°º]?/);

            if (monthYearMatch && dayMatchSingle) {
                const day = dayMatchSingle[1];
                const month = monthYearMatch[1];
                const year = monthYearMatch[2];
                currentFecha = new Date(year, months[month.toUpperCase()], day).toISOString();
                foundDate = true;
            }
        }

        // Variante 3: Fecha distribuida en tres líneas
        if (!foundDate) {
            const yearMatch = line.match(/^\d{4}$/);
            const monthMatch = previousLine.match(/(ENERO|FEBRERO|MARZO|ABRIL|MAYO|JUNIO|JULIO|AGOSTO|SEPTIEMBRE|OCTUBRE|NOVIEMBRE|DICIEMBRE)/i);
            const dayMatch = twoLinesAgo.match(/(?:A PARTIR DE[L]?\s+)?(\d{1,2})[°º]?/);

            if (yearMatch && monthMatch && dayMatch) {
                const day = dayMatch[1];
                const month = monthMatch[1];
                const year = yearMatch[0];
                currentFecha = new Date(year, months[month.toUpperCase()], day).toISOString();
            }
        }

        let modifiedLine = line.replace(regex, (match) => {
            let value = parseFloat(match.replace(/\.(?=\d{3})/g, "").replace(",", "."));

            if (previousLine.includes("Hora: $") || line.includes("Hora: $")) {
                numbers.push({ hora: value, fecha: currentFecha });
            } else if (previousLine.includes("Mensual: $") || line.includes("Mensual: $")) {
                numbers.push({ mensual: value, fecha: currentFecha });
            }

            return value;
        });

        twoLinesAgo = previousLine;
        previousLine = line;
        console.log(`Línea ${index + 1}: ${modifiedLine}`);
    });

    console.log(numbers);
}


module.exports = { extractData, iterateTextByLine };

const fs = require("fs");
const path = require("path");
const pdf = require("pdf-parse");
const { logWithDetails } = require("../config/logger");

const extractData = async (filePath) => {
  try {
    // Asegúrate de obtener la ruta absoluta del archivo
    const absoluteFilePath = path.resolve(filePath);

    // Lee el archivo PDF
    const dataBuffer = fs.readFileSync(absoluteFilePath);
    const pdfData = await pdf(dataBuffer);
    //console.log(pdfData)
    return pdfData.text;
  } catch (error) {
    console.error("Error al procesar el archivo:", error);
  }
};

function iterateTextByLine(text) {
  const lines = text.split("\n").filter((line) => line.trim() !== "");
  const regex = /\d{1,3}([.,]\d{3})*(,\d+)?/g;
  let numbers = [];
  let previousLine = "";
  let twoLinesAgo = "";
  let currentFecha = "";
  let currentCaracter = "";
  let categoryMatches = [];
  let accumulatedText = "";
  let retiroAccumulatedText = "";

  const months = {
    ENERO: 0,
    FEBRERO: 1,
    MARZO: 2,
    ABRIL: 3,
    MAYO: 4,
    JUNIO: 5,
    JULIO: 6,
    AGOSTO: 7,
    SEPTIEMBRE: 8,
    OCTUBRE: 9,
    NOVIEMBRE: 10,
    DICIEMBRE: 11,
  };

  const categories = [
    "SUPERVISOR/A",
    "PERSONAL PARA TAREAS ESPECÍFICAS",
    "CASEROS",
    "ASISTENCIA Y CUIDADO DE PERSONAS",
    "PERSONAL PARA TAREAS GENERALES",
  ];

  lines.forEach((line, index) => {
    let foundDate = false;
    let processed = false; // Flag to prevent double processing
    accumulatedText += line.trim() + " ";
    retiroAccumulatedText += line.trim() + " ";

    // Buscar categorías y almacenar coincidencias
    categories.forEach((category) => {
      const categoryMatch = accumulatedText.match(
        new RegExp(category + "[:s]*", "i")
      );
      if (categoryMatch) {
        categoryMatches.push(category);
        accumulatedText = ""; // Reiniciar el acumulador después de encontrar la categoría
      }
    });

    // Buscar y mostrar PERSONAL CON RETIRO y PERSONAL SIN RETIRO, incluso si están en diferentes líneas
    const retiroMatch = retiroAccumulatedText.match(
      /PERSONAL\s+CON\s+RETIRO|PERSONAL\s+SIN\s+RETIRO/i
    );
    if (retiroMatch) {
      currentCaracter = retiroMatch[0];
      retiroAccumulatedText = ""; // Reiniciar el acumulador después de encontrar el texto
    }

    // Variante 1: Fecha en una sola línea o en formato "2º DE AGOSTO DE 2023" o "A PARTIR DEL 2º DE AGOSTO DE 2023"
    const fullDateMatch = line.match(
      /(?:A PARTIR DE[L]?\s+)?(\d{1,2})[°º]?\s+DE\s+(ENERO|FEBRERO|MARZO|ABRIL|MAYO|JUNIO|JULIO|AGOSTO|SEPTIEMBRE|OCTUBRE|NOVIEMBRE|DICIEMBRE)\s+DE\s+(\d{4})/i
    );
    if (fullDateMatch) {
      const day = fullDateMatch[1];
      const month = fullDateMatch[2];
      const year = fullDateMatch[3];
      currentFecha = new Date(
        year,
        months[month.toUpperCase()],
        day
      ).toISOString();
      foundDate = true;
    }

    // Variante 2: Fecha distribuida en dos líneas
    if (!foundDate) {
      const monthYearMatch = line.match(
        /DE\s+(ENERO|FEBRERO|MARZO|ABRIL|MAYO|JUNIO|JULIO|AGOSTO|SEPTIEMBRE|OCTUBRE|NOVIEMBRE|DICIEMBRE)\s+DE\s+(\d{4})/i
      );
      const dayMatchSingle = previousLine.match(
        /(?:A PARTIR DE[L]?\s+)?(\d{1,2})[°º]?/
      );

      if (monthYearMatch && dayMatchSingle) {
        const day = dayMatchSingle[1];
        const month = monthYearMatch[1];
        const year = monthYearMatch[2];
        currentFecha = new Date(
          year,
          months[month.toUpperCase()],
          day
        ).toISOString();
        foundDate = true;
      }
    }

    // Variante 3: Fecha distribuida en tres líneas
    if (!foundDate) {
      const yearMatch = line.match(/^\d{4}$/);
      const monthMatch = previousLine.match(
        /(ENERO|FEBRERO|MARZO|ABRIL|MAYO|JUNIO|JULIO|AGOSTO|SEPTIEMBRE|OCTUBRE|NOVIEMBRE|DICIEMBRE)/i
      );
      const dayMatch = twoLinesAgo.match(
        /(?:A PARTIR DE[L]?\s+)?(\d{1,2})[°º]?/
      );

      if (yearMatch && monthMatch && dayMatch) {
        const day = dayMatch[1];
        const month = monthMatch[1];
        const year = yearMatch[0];
        currentFecha = new Date(
          year,
          months[month.toUpperCase()],
          day
        ).toISOString();
      }
    }

    // Nueva variante: Hora y Mensual en la misma línea o en líneas separadas
    if (/Hora[:\s]*\$?/i.test(line) && /Mensual[:\s]*\$?/i.test(line)) {
      const horaMatch = line.match(/Hora[:\s]*\$?\s*(\d+(?:[.,]\d+)*)/i);
      const mensualMatch = line.match(/Mensual[:\s]*\$?\s*(\d+(?:[.,]\d+)*)/i);
      if (horaMatch && mensualMatch) {
        const horaValue = parseFloat(
          horaMatch[1].replace(/\./g, "").replace(",", ".")
        );
        const mensualValue = parseFloat(
          mensualMatch[1].replace(/\./g, "").replace(",", ".")
        );
        numbers.push({
          caracter: currentCaracter,
          tipo: "hora",
          valor: horaValue,
          fecha: currentFecha,
        });
        numbers.push({
          caracter: currentCaracter,
          tipo: "mensual",
          valor: mensualValue,
          fecha: currentFecha,
        });
        processed = true;
      }
    } else if (/Hora[:\s]*\$?/i.test(line)) {
      const horaMatch = line.match(/Hora[:\s]*\$?\s*(\d+(?:[.,]\d+)*)/i);
      if (horaMatch) {
        const horaValue = parseFloat(
          horaMatch[1].replace(/\./g, "").replace(",", ".")
        );
        numbers.push({
          caracter: currentCaracter,
          tipo: "hora",
          valor: horaValue,
          fecha: currentFecha,
        });
        processed = true;
      }
    } else if (/Mensual[:\s]*\$?/i.test(line)) {
      const mensualMatch = line.match(/Mensual[:\s]*\$?\s*(\d+(?:[.,]\d+)*)/i);
      if (mensualMatch) {
        const mensualValue = parseFloat(
          mensualMatch[1].replace(/\./g, "").replace(",", ".")
        );
        numbers.push({
          caracter: currentCaracter,
          tipo: "mensual",
          valor: mensualValue,
          fecha: currentFecha,
        });
        processed = true;
      }
    }

    if (!processed) {
      let modifiedLine = line.replace(regex, (match) => {
        let value = parseFloat(
          match.replace(/\.(?=\d{3})/g, "").replace(",", ".")
        );

        if (
          previousLine.match(/Hora[:\s]*\$?/i) ||
          line.match(/Hora[:\s]*\$?/i)
        ) {
          numbers.push({
            caracter: currentCaracter,
            tipo: "hora",
            valor: value,
            fecha: currentFecha,
          });
        } else if (
          previousLine.match(/Mensual[:\s]*\$?/i) ||
          line.match(/Mensual[:\s]*\$?/i)
        ) {
          numbers.push({
            caracter: currentCaracter,
            tipo: "mensual",
            valor: value,
            fecha: currentFecha,
          });
        }

        return value;
      });
      console.log(`Línea ${index + 1}: ${modifiedLine}`);
    }

    twoLinesAgo = previousLine;
    previousLine = line;
  });

  console.log(numbers);
  // Agrupar números por pares según caracter y tipo
  let groupedNumbers = [];
  for (let i = 0; i < numbers.length - 1; i++) {
    const current = numbers[i];
    const next = numbers[i + 1];

    if (current.caracter === next.caracter && current.tipo !== next.tipo) {
      if (current.tipo === "mensual" && next.tipo === "hora") {
        groupedNumbers.push({
          caracter: current.caracter,
          valorHora: next.valor,
          valorMensual: current.valor,
          fecha: current.fecha,
        });
      } else if (current.tipo === "hora" && next.tipo === "mensual") {
        groupedNumbers.push({
          caracter: current.caracter,
          valorMensual: next.valor,
          valorHora: current.valor,
          fecha: current.fecha,
        });
      }
      i++; // Saltar el siguiente elemento ya que fue agrupado
    }
  }

  // Asignar categorías a los elementos de groupedNumbers
  let categoryIndex = 0;
  let applyOnce = false;
  groupedNumbers.forEach((group, index) => {
    if (categoryIndex < categoryMatches.length) {
      group.categoria = categoryMatches[categoryIndex];
      if (categoryMatches[categoryIndex] === "CASEROS") {
        categoryIndex++;
      } else {
        if (applyOnce) {
          categoryIndex++;
          applyOnce = false;
        } else {
          applyOnce = true;
        }
      }
    }
  });

  console.log(categoryMatches);

  // Evaluar si se cubrieron todas las propiedades
  if (categoryIndex === categoryMatches.length && groupedNumbers.length > 0) {
    logWithDetails.info(
      "Éxito: Todas las categorías fueron asignadas correctamente."
    );
    return groupedNumbers;
  } else {
    logWithDetails.error(
      "Error: No todas las categorías fueron asignadas correctamente."
    );
    throw new Error(
      "Error: No todas las categorías fueron asignadas correctamente."
    );
  }
}

module.exports = { extractData, iterateTextByLine };

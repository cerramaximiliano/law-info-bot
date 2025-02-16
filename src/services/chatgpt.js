// Importar las dependencias
const { Configuration, OpenAI } = require("openai");
const { logWithDetails } = require("../config/logger");
const { loadFile } = require("../utils/manageFiles");

// Configurar el cliente de OpenAI
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // This is the default and can be omitted
});

const askQuestion = async (question, systemMessage) => {

  const chatCompletion = await client.chat.completions.create({
    messages: [
      {
        role: "system",
        content: systemMessage,
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: question,
          },
        ],
      },
    ],
    model: "gpt-4o",
  });
  return chatCompletion;
};
;

const askQuestionWithFile = async (question, filePath) => {
  // Leer el contenido del archivo
  const fileContent = loadFile(filePath);
  if (!fileContent) {
    throw new Error("No se pudo cargar el archivo");
  }

  // Combinar el contenido del archivo con la pregunta
  const prompt = `${fileContent}\n\nPregunta: ${question}`;

  // Realizar la solicitud a OpenAI
  const chatCompletion = await client.chat.completions.create({
    messages: [{ role: "user", content: prompt }],
    model: "gpt-3.5-turbo",
  });
  return chatCompletion;
};

module.exports = { askQuestion, askQuestionWithFile };

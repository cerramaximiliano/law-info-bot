const cron = require("node-cron");
const { REGION_HOURS } = require("../config/cronConfig");
const { logWithDetails } = require("../config/logger");

const cronRegex =
    /^(\*|([0-9]|[1-5][0-9])) (\*|([0-9]|1[0-9]|2[0-3])) (\*|([1-9]|[12][0-9]|3[01])) (\*|([1-9]|1[0-2])) (\*|([0-6]))$/;


// Función genérica para ejecutar una tarea
async function executeEfemerideTask(key, descripcion) {
    try {
        const checkToken = await checkTokenExpiration(accessToken);

        if (checkToken.daysUntilExpiration === 0) {
            logWithDetails.log(`Token expirado. No se ejecuta la tarea para: ${key}`);
            return;
        }

        const year = moment().year();
        const folderPath = [`posts/efemerides/${year}/${key}`];
        const results = await getLinksFromFolders(folderPath);
        const link = results.resources[0]?.url;

        if (link) {
            logWithDetails.info(`Ejecutando efeméride para ${key}: ${link}`);
            const result = await uploadMedia(link, descripcion);
            logWithDetails.info(`Tarea completada para ${key}:`, result);
        } else {
            logWithDetails.info(`No se encontró link para ${key}`);
        }
    } catch (error) {
        logWithDetails.error(`Error en la tarea para ${key}: ${error}`);
    }
}

// Registrar los cron jobs dinámicamente
function registerEfemerides(cronSchedules) {
    cronSchedules.forEach(({ cronHours, key, descripcion }) => {
        if (cronHours && cronRegex.test(cronHours)) {
            cron.schedule(
                cronHours,
                async () => {
                    logWithDetails.info(`Iniciando tarea programada para: ${key}`);
                    await executeEfemerideTask(key, descripcion);
                },
                {
                    REGION_HOURS,
                }
            );
        }
    });

    logWithDetails.info(`${cronSchedules.length} efemérides programadas.`);
}

module.exports = { cronRegex, executeEfemerideTask, registerEfemerides };
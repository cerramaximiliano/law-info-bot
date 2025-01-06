const {logWithDetails} = require("../config/logger");
const Tracking = require("../models/tracking");

const saveOrUpdateTrackingData = async (
  trackingCode,
  userId,
  notificationId,
  tableData,
  screenshotPath
) => {
  try {
    // Busca un registro existente basado en el trackingCode
    const tracking = await Tracking.findOne({ trackingCode, userId });

    if (tracking) {
      logWithDetails.info(`Actualizando el tracking para el código: ${trackingCode}`);

      // Agregar nuevos movimientos que no estén ya en la base de datos
      tableData.forEach((movement) => {
        const exists = tracking.movements.some(
          (m) =>
            m.date.getTime() === new Date(movement.fecha).getTime() &&
            m.planta === movement.planta &&
            m.historia === movement.historia &&
            m.estado === movement.estado
        );

        if (!exists) {
          tracking.movements.push({
            date: new Date(movement.fecha),
            planta: movement.planta,
            historia: movement.historia,
            estado: movement.estado || "",
          });
        }
      });

      // Actualizar la fecha de la última actualización y agregar la captura de pantalla
      tracking.lastUpdated = Date.now();
      if (screenshotPath) {
        tracking.screenshots.push({
          path: screenshotPath,
          capturedAt: Date.now(),
        });
      }

      await tracking.save();
      logWithDetails.info("Datos de tracking actualizados correctamente.");
    } else {
      logWithDetails.info(`Creando un nuevo tracking para el código: ${trackingCode}`);

      // Crear un nuevo registro de tracking si no existe
      await Tracking.create({
        userId,
        notificationId,
        trackingCode,
        movements: tableData.map((movement) => ({
          date: new Date(movement.fecha),
          planta: movement.planta,
          historia: movement.historia,
          estado: movement.estado || "",
        })),
        lastUpdated: Date.now(),
        screenshots: screenshotPath
          ? [{ path: screenshotPath, capturedAt: Date.now() }]
          : [],
      });

      logWithDetails.info("Nuevo tracking creado correctamente.");
    }
  } catch (error) {
    logWithDetails.error("Error al guardar o actualizar los datos de tracking:", error);
  }
};

module.exports = { saveOrUpdateTrackingData };

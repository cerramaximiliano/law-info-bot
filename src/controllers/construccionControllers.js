const LaboralConstruccion = require("../models/laboral_empleadosConstruccion")

const saveConstruccion = async (datos) => {
    try {
        // Validar que existan datos
        if (!datos) {
            throw new Error('No se proporcionaron datos para guardar');
        }

        const actualizacion = datos;

        try {
            // Crear nueva instancia
            const nuevaActualizacion = new LaboralConstruccion(actualizacion);
            // Guardar
            const resultado = await nuevaActualizacion.save();
            return {
                exito: true,
                mensaje: 'Actualización salarial guardada correctamente',
                datos: resultado
            };
        } catch (error) {
            // Si ya existe, actualizar
            if (error.code === 11000) {
                const actualizacionExistente = await LaboralConstruccion.findOneAndUpdate(
                    { fecha: new Date(actualizacion.fecha) },
                    actualizacion,
                    {
                        new: true,
                        runValidators: true
                    }
                );

                if (actualizacionExistente) {
                    return {
                        exito: true,
                        mensaje: 'Actualización salarial modificada correctamente',
                        datos: actualizacionExistente
                    };
                }
            }
            throw error;
        }
    } catch (error) {
        console.error('Error:', error);
        return {
            exito: false,
            mensaje: 'Error al procesar la actualización salarial',
            error: error.message
        };
    }
};


const findByDateConstruccion = async (date) => {
    try {
        // Validar que la fecha esté proporcionada y en formato correcto
        if (!date) {
            throw new Error('Debe proporcionar una fecha para la búsqueda');
        }

        // Asegurarse de que la fecha sea un objeto Date, si es una cadena la convertimos
        if (isNaN(date)) {
            throw new Error('La fecha proporcionada no es válida');
        }

        const startOfDay = date.clone().utc().startOf('day').toDate();
        const endOfDay = date.clone().utc().endOf('day').toDate();

        // Realizar la búsqueda de registros dentro del rango del día en UTC
        const actualizaciones = await LaboralConstruccion.find({
            fecha: {
                $gte: startOfDay,
                $lte: endOfDay,
            },
        });

        // Si no se encuentran resultados
        if (actualizaciones.length === 0) {
            return {
                exito: false,
                mensaje: 'No se encontraron actualizaciones salariales para la fecha proporcionada',
            };
        }

        return {
            exito: true,
            mensaje: 'Actualizaciones salariales encontradas',
            datos: actualizaciones,
        };

    } catch (error) {
        return {
            exito: false,
            mensaje: 'Error al buscar las actualizaciones salariales',
            error: error.message,
        };
    }
};



module.exports = {
    saveConstruccion,
    findByDateConstruccion,
};
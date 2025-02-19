const LaboralComercio = require("../models/laboral_empleadosComercio")

const saveComercio = async (datos) => {
    try {
        // Validar que existan datos
        if (!datos) {
            throw new Error('No se proporcionaron datos para guardar');
        }

        const actualizacion = datos;

        try {
            // Crear nueva instancia
            const nuevaActualizacion = new LaboralComercio(actualizacion);
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
                const actualizacionExistente = await LaboralComercio.findOneAndUpdate(
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


const findByDateComercio = async (date, type = "day") => {
    try {
        // Validar que la fecha esté proporcionada y en formato correcto
        if (!date) {
            throw new Error('Debe proporcionar una fecha para la búsqueda');
        }

        // Asegurarse de que la fecha sea un objeto Date, si es una cadena la convertimos
        if (isNaN(date)) {
            throw new Error('La fecha proporcionada no es válida');
        }

        const startOfDay = date.clone().utc().startOf(type).toDate();
        const endOfDay = date.clone().utc().endOf(type).toDate();

        // Realizar la búsqueda de registros dentro del rango del día en UTC
        const actualizaciones = await LaboralComercio.find({
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

const updateComercioById = async (id, updateData) => {
    try {
        // Validar que el ID esté proporcionado
        if (!id) {
            throw new Error('Debe proporcionar un ID para la actualización');
        }

        // Validar que haya datos para actualizar
        if (!updateData || Object.keys(updateData).length === 0) {
            throw new Error('Debe proporcionar datos para actualizar');
        }

        // Buscar y actualizar el documento
        const actualizacion = await LaboralComercio.findByIdAndUpdate(
            id,
            updateData,
            {
                new: true,        // Retorna el documento actualizado
                runValidators: true  // Ejecuta los validadores del esquema
            }
        );

        // Si no se encuentra el documento
        if (!actualizacion) {
            return {
                exito: false,
                mensaje: 'No se encontró el documento con el ID proporcionado',
            };
        }

        return {
            exito: true,
            mensaje: 'Documento actualizado exitosamente',
            datos: actualizacion,
        };

    } catch (error) {
        // Manejo específico para errores de casteo de ID
        if (error.name === 'CastError') {
            return {
                exito: false,
                mensaje: 'ID inválido',
                error: 'El formato del ID proporcionado no es válido'
            };
        }

        // Manejo específico para errores de validación
        if (error.name === 'ValidationError') {
            return {
                exito: false,
                mensaje: 'Error de validación',
                error: Object.values(error.errors).map(err => err.message)
            };
        }

        // Manejo general de errores
        return {
            exito: false,
            mensaje: 'Error al actualizar el documento',
            error: error.message,
        };
    }
};

module.exports = {
    saveComercio,
    findByDateComercio,
    updateComercioById
};
const moment = require('moment');

const processSalaryData = (respuestaAPI, fecha) => {
    try {
        // Validar que se proporcione una fecha
        if (!fecha) {
            return {
                exito: false,
                error: 'Debe proporcionar una fecha para la consulta',
                actualizaciones_salariales: []
            };
        }

        // Normalizar la fecha proporcionada al inicio del mes
        const fechaConsulta = moment(fecha).startOf('month').format('YYYY-MM-DD');

        // Limpiar el texto si es string y tiene delimitadores markdown
        const textoLimpio = typeof respuestaAPI === 'string' ?
            respuestaAPI
                .replace(/```json\n/g, '')
                .replace(/```\n?/g, '')
                .trim() :
            respuestaAPI;

        // Parsear el JSON si es necesario
        const datos = typeof textoLimpio === 'string' ?
            JSON.parse(textoLimpio) : textoLimpio;

        // Validar la estructura básica
        if (!datos.actualizaciones_salariales || !Array.isArray(datos.actualizaciones_salariales)) {
            throw new Error('Estructura JSON inválida');
        }

        // Filtrar actualizaciones por la fecha proporcionada
        const actualizacionesFiltradas = datos.actualizaciones_salariales.filter(actualizacion => 
            moment(actualizacion.fecha).startOf('month').format('YYYY-MM-DD') === fechaConsulta
        );

        // Verificar si hay actualizaciones para la fecha solicitada
        if (actualizacionesFiltradas.length === 0) {
            return {
                exito: false,
                error: `No hay actualizaciones disponibles para la fecha ${fechaConsulta}`,
                actualizaciones_salariales: []
            };
        }

        // Mantener la estructura original solo con las actualizaciones de la fecha solicitada
        const resultado = {
            actualizaciones_salariales: actualizacionesFiltradas.map(actualizacion => ({
                fecha: moment(actualizacion.fecha).startOf('month').format('YYYY-MM-DD'),
                acuerdo: actualizacion.acuerdo,
                resumen: actualizacion.resumen,
                detalles: actualizacion.detalles.map(categoria => ({
                    categoría: categoria.categoría,
                    subcategorías: categoria.subcategorías.map(sub => ({
                        nivel: sub.nivel,
                        importe: sub.importe
                    }))
                })),
                fuente: actualizacion.fuente
            }))
        };

        // Agregar funciones helper sin modificar la estructura original
        const helpers = {
            obtenerCategorias: () =>
                resultado.actualizaciones_salariales[0].detalles.map(d => d.categoría),

            obtenerSubcategorias: (categoria) => {
                const cat = resultado.actualizaciones_salariales[0].detalles
                    .find(d => d.categoría === categoria);
                return cat ? cat.subcategorías : [];
            },

            obtenerImportesFormateados: (categoria) => {
                const cat = resultado.actualizaciones_salariales[0].detalles
                    .find(d => d.categoría === categoria);
                return cat ? cat.subcategorías.map(sub => ({
                    ...sub,
                    importeFormateado: new Intl.NumberFormat('es-AR', {
                        style: 'currency',
                        currency: 'ARS'
                    }).format(sub.importe)
                })) : [];
            },

            obtenerRango: (categoria) => {
                const subcategorias = helpers.obtenerSubcategorias(categoria);
                if (!subcategorias || subcategorias.length === 0) return null;

                const importes = subcategorias.map(sub => sub.importe);
                return {
                    minimo: Math.min(...importes),
                    maximo: Math.max(...importes),
                    minimoFormateado: new Intl.NumberFormat('es-AR', {
                        style: 'currency',
                        currency: 'ARS'
                    }).format(Math.min(...importes)),
                    maximoFormateado: new Intl.NumberFormat('es-AR', {
                        style: 'currency',
                        currency: 'ARS'
                    }).format(Math.max(...importes))
                };
            },

            obtenerResumen: () => ({
                fecha: resultado.actualizaciones_salariales[0].fecha,
                acuerdo: resultado.actualizaciones_salariales[0].acuerdo,
                cantidadCategorias: resultado.actualizaciones_salariales[0].detalles.length,
                fuenteDatos: resultado.actualizaciones_salariales[0].fuente
            })
        };

        return {
            exito: true,
            ...resultado,  // Mantiene la estructura original
            helpers       // Agrega las funciones helper sin modificar la estructura original
        };

    } catch (error) {
        return {
            exito: false,
            error: `Error al procesar datos: ${error.message}`,
            actualizaciones_salariales: []
        };
    }
};

function compareObjects(arrayOfObjects) {
    // Si solo hay un objeto, retornarlo directamente
    if (arrayOfObjects.length === 1) {
        return arrayOfObjects[0];
    }

    // Función para comparar dos objetos
    function compareTwo(obj1, obj2) {
        let higherValues1 = 0;
        let higherValues2 = 0;

        // Recorrer las categorías y subcategorías de ambos objetos
        obj1.detalles.forEach(cat1 => {
            const matchingCat2 = obj2.detalles.find(cat2 =>
                cat2.categoría.toLowerCase() === cat1.categoría.toLowerCase()
            );

            if (matchingCat2) {
                cat1.subcategorías.forEach(sub1 => {
                    const matchingSub2 = matchingCat2.subcategorías.find(sub2 =>
                        sub2.nivel.toLowerCase() === sub1.nivel.toLowerCase()
                    );

                    if (matchingSub2) {
                        if (sub1.importe > matchingSub2.importe) {
                            higherValues1++;
                        } else if (sub1.importe < matchingSub2.importe) {
                            higherValues2++;
                        }
                    }
                });
            }
        });

        // Retornar el objeto con más valores altos
        return higherValues1 >= higherValues2 ? obj1 : obj2;
    }

    // Comparar todos los objetos y obtener el que tiene más valores altos
    return arrayOfObjects.reduce((highest, current) => {
        return compareTwo(highest, current);
    });
}

module.exports = { processSalaryData, compareObjects };
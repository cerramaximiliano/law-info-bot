

const REGION_HOURS = {
    scheduled: true,
    timezone: "America/Argentina/Buenos_Aires",
};

const cronSchedules = {
    notifyNews: "30 10 * * 1-5",
    notifyNewsHours: "30 12 * * 1-5",
    scrapingNoticias: "*/15 8-18 * * 1-5",
    scrapingActs: "0 8 * * 1-5",
    scrapingFees: "10 8 * * 1-5",
    scrapingLegal: "15 8 * * 1-5",

    scrapingLaboral: "20 8 * * 1-5",
    notifyLaboralDomestico: "0 10 * * 1-5 ",

    notifyLaboralComercio: "0 10 5-17 * 1,2",
    notifyLaboralConstruccion: "7 10 5-17 * 2,3",
    notifyLaboralGastronomia: "9 10 5-17 * 3,4",
    notifyLaboralDomesticoTelegram: "20 13 * * 1-5",

    notifyPrev: "10 10 * * 1-5",
    scrapingCourses: "0 19 * * 5",
    feesNotificationHours: "46 16 * * 1-5",
    notifyCoursesHours: "0 9 15 * *",
    notifyNewCoursesHours: "0 9 16 * *",
    cleanLogsHours: "0 0 15,28 * *", //Se ejecuta todos los 15 y 28 de cada mes a las 0 Horas
    loggerReportHours: "50 23 * * 1-5",


    scrapingLaboralComercio: "0 5 5-15 * *", //Se ejecta del 5 al 15 de cada mes
    scrapingLaboralConstruccion: "10 5 5-15 * *", // Se ejecuta del 5 al 15 de cada mes
    scrapingLaboralGastronomia : "20 5 5-15 * *", // Se ejecuta del 5 al 15 de cada mes

    efemerides: [
        {
            cronHours: "30 10 1 1 *",
            nombre: "Año Nuevo",
            descripcion:
                "🎉 Celebramos el inicio de un nuevo año lleno de esperanza y oportunidades. 🌟",
            hashtags: "#AñoNuevo #Felicidades #Esperanza",
            key: "ano_nuevo",
        },
        {
            cronHours: "30 10 25 5 *",
            nombre: "Día de la Revolución de Mayo",
            descripcion:
                "🇦🇷 Conmemoramos el inicio del camino hacia la independencia en 1810. ✊",
            hashtags: "#RevoluciónDeMayo #Argentina",
            key: "revolucion_mayo",
        },
        {
            cronHours: "30 10 9 7 *",
            nombre: "Día de la Independencia",
            descripcion:
                "🎆 Celebramos nuestra libertad y la declaración de independencia en 1816. 🕊️",
            hashtags: "#IndependenciaArgentina #9DeJulio",
            key: "independencia",
        },
        {
            cronHours: "30 10 20 11 *",
            nombre: "Día de la Soberanía Nacional",
            descripcion:
                "⚓ Homenajeamos a los héroes que defendieron nuestra soberanía en 1845. 🌊",
            hashtags: "#SoberaníaNacional #Argentina",
            key: "soberania",
        },
        {
            cronHours: "30 10 2 4 *",
            nombre: "Día del Veterano y de los Caídos en la Guerra de Malvinas",
            descripcion:
                "🎖️ Honramos a quienes dieron todo por nuestra patria en 1982. 🇦🇷",
            hashtags: "#MalvinasArgentinas #2DeAbril",
            key: "malvinas",
        },
        {
            cronHours: "30 10 20 6 *",
            nombre: "Día de la Bandera",
            descripcion:
                "🎌 Celebramos nuestra enseña patria y recordamos a Manuel Belgrano. 💙",
            hashtags: "#DíaDeLaBandera #ManuelBelgrano",
            key: "bandera",
        },
        {
            cronHours: "30 10 2 10 *",
            nombre: "Día del Notariado",
            descripcion:
                "✍️ Agradecemos a quienes garantizan seguridad jurídica en cada acto. ⚖️",
            hashtags: "#Notariado #SeguridadJurídica",
            key: "notariado",
        },
        {
            cronHours: "30 10 1 5 *",
            nombre: "Día de la Constitución Nacional",
            descripcion:
                "📜 Celebramos los principios que rigen nuestra nación y garantizan los derechos de todos. 🇦🇷",
            hashtags: "#ConstituciónNacional #DerechoConstitucional",
            key: "constitucion",
        },
        {
            cronHours: "30 10 5 9 *",
            nombre: "Día de la Mediación",
            descripcion:
                "🤝 Reconocemos la importancia del diálogo para resolver conflictos de manera justa y pacífica. 🕊️",
            hashtags: "#Mediación #ResoluciónDeConflictos",
            key: "mediacion",
        },
        {
            cronHours: "30 10 18 7 *",
            nombre: "Día del Procurador",
            descripcion:
                "📜 Homenajeamos a quienes representan y defienden los intereses del bien común. ⚖️",
            hashtags: "#DíaDelProcurador #Derecho",
            key: "procurador",
        },
        {
            cronHours: "30 10 15 3 *",
            nombre: "Día Mundial del Derecho de los Consumidores",
            descripcion:
                "🛍️ Fomentamos el respeto y la protección de los derechos de los consumidores en todo el mundo. 🌐",
            hashtags: "#DerechosDelConsumidor #ProtecciónAlConsumidor",
            key: "consumidores",
        },
        {
            cronHours: "30 10 9 12 *",
            nombre: "Día Internacional contra la Corrupción",
            descripcion:
                "🚨 Nos comprometemos a luchar contra la corrupción y garantizar la integridad en la justicia. ✨",
            hashtags: "#NoALaCorrupción #JusticiaTransparente",
            key: "corrupcion",
        },
        {
            cronHours: "30 10 25 11 *",
            nombre:
                "Día Internacional de la Eliminación de la Violencia contra la Mujer",
            descripcion:
                "🛑 Decimos NO a la violencia contra las mujeres y promovemos la igualdad y la justicia. ✊",
            hashtags: "#ViolenciaDeGeneroNo #JusticiaParaTodas #Igualdad",
            key: "violencia_mujer",
        },
        {
            cronHours: "30 10 17 7 *",
            nombre: "Día Internacional de la Justicia Penal",
            descripcion:
                "⚖️ Reafirmamos el compromiso global con la justicia y el fin de la impunidad. 🌍",
            hashtags: "#JusticiaPenal #CortePenalInternacional #Derecho",
            key: "justicia_penal",
        },
        {
            cronHours: "30 10 16 5 *",
            nombre: "Día Mundial del Acceso a la Justicia",
            descripcion:
                "🔑 Impulsamos el acceso a la justicia como un derecho esencial para todos. 🌎",
            hashtags: "#AccesoALaJusticia #DerechosHumanos",
            key: "acceso_justicia",
        },
        {
            cronHours: "30 10 5 6 *",
            nombre: "Día del Derecho Ambiental",
            descripcion:
                "🌱 Promovemos el derecho a un ambiente sano y el compromiso con la sostenibilidad. 🌍",
            hashtags: "#DerechoAmbiental #JusticiaVerde",
            key: "derecho_ambiental",
        },
        {
            cronHours: "30 10 12 6 *",
            nombre: "Día Nacional contra el Trabajo Infantil",
            descripcion:
                "🚸 Decimos no al trabajo infantil y sí a la educación y la niñez plena. 📚",
            hashtags: "#TrabajoInfantilNo #DerechosDeLosNiños",
            key: "trabajo_infantil",
        },
        {
            cronHours: "30 10 29 8 *",
            nombre: "Día del Abogado",
            descripcion:
                "⚖️ Celebramos a quienes trabajan incansablemente por la justicia y el derecho. 📜",
            hashtags: "#DiaDelAbogado #Derecho",
            key: "abogado",
        },
        {
            cronHours: "30 10 23 9 *",
            nombre: "Día Contra la Explotación Sexual y Trata de Personas",
            descripcion:
                "🚫 Decimos basta a estas prácticas y buscamos justicia para las víctimas. ✊",
            hashtags: "#TrataDePersonasNo #Justicia",
            key: "trata",
        },
        {
            cronHours: "30 10 8 3 *",
            nombre: "Día Internacional de la Mujer",
            descripcion:
                "🌸 Celebramos los derechos y logros de las mujeres en todo el mundo. 💪",
            hashtags: "#DiaDeLaMujer #IgualdadDeGénero",
            key: "mujer",
        },
        {
            cronHours: "30 10 10 12 *",
            nombre: "Día de los Derechos Humanos",
            descripcion:
                "🕊️ Reflexionamos sobre la importancia de defender la dignidad de todas las personas. 🌍",
            hashtags: "#DerechosHumanos #Igualdad #Justicia",
            key: "humanos",
        },
        {
            cronHours: "30 10 7 7 *",
            nombre: "Día del Abogado Laboralista",
            descripcion:
                "💼 Reconocemos a quienes trabajan para proteger los derechos laborales. ✊",
            hashtags: "#AbogadoLaboralista #DerechoLaboral",
            key: "laboralista",
        },
        {
            cronHours: "30 10 10 10 *",
            nombre: "Día de la Abogacía del Niño",
            descripcion:
                "👦👧 Promovemos la defensa de los derechos de la niñez y la adolescencia para un futuro lleno de justicia y equidad. ⚖️✨",
            hashtags: "#AbogaciaDelNiño #DerechosDeLaNiñez",
            key: "abogado_infancias",
        },
        {
            cronHours: "30 10 3 12 *",
            nombre: "Día del Médico y del Derecho a la Salud",
            descripcion:
                "🩺🌍 Reafirmamos el acceso universal a la salud como un derecho fundamental para todas las personas. 💪❤️",
            hashtags: "#DerechoALaSalud #SaludParaTodos",
            key: "derecho_salud",
        },
        {
            cronHours: "30 10 22 3 *",
            nombre: "Día Mundial del Agua",
            descripcion:
                "💧🌊 Defendemos el acceso al agua potable como un derecho humano esencial para la vida. 🌿✨",
            hashtags: "#DerechoAlAgua #AguaParaTodos",
            key: "derecho_agua",
        },
        {
            cronHours: "30 10 28 4 *",
            nombre: "Día Mundial de la Seguridad y Salud en el Trabajo",
            descripcion:
                "🏢🦺 Fomentamos espacios laborales seguros, saludables y dignos para todos. 💼✨",
            hashtags: "#SeguridadLaboral #DerechosLaborales",
            key: "seguridad_trabajo",
        },
        {
            cronHours: "30 10 16 11 *",
            nombre: "Día Internacional para la Tolerancia",
            descripcion:
                "🌍🤝 Celebramos la diversidad y promovemos la convivencia pacífica entre culturas para un mundo más unido. ❤️✨",
            hashtags: "#Tolerancia #Igualdad #DerechosHumanos",
            key: "tolerancia",
        },
    ],
};





module.exports = { REGION_HOURS, cronSchedules }
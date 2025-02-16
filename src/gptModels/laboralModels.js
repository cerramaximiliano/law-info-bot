const comercioGptResponseModel =
    `{"actualizaciones_salariales": [{"fecha": "string (formato YYYY-MM-DD)","resumen": "string (Resumen de la noticia)", "acuerdo": "string (Descripción del acuerdo salarial)","detalles": [{"categoría": "string (Nombre de la categoría)","subcategorías": [{"nivel": "string (Nivel dentro de la categoría)","importe": "number (Monto salarial en formato numérico, preferentemente en la moneda correspondiente)"}]}],"fuente": "string (URL de la fuente oficial o documento de referencia)"}]}`;


module.exports = { comercioGptResponseModel }
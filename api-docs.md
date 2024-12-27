# API Documentation

## Base URL
```
/api
```

## Endpoints

### Health Check
```
GET /
```
Verifica el estado de la API.

**Response**
```json
{
  "message": "API funcionando correctamente"
}
```

### Fees

#### Update Fees
```
POST /fees/update-fees
```
Ejecuta la actualización y notificación de fees para PJN y CABA.

**Response Success**
```json
{
  "message": "Actualización de fees completada"
}
```

**Response Error**
```json
{
  "error": "Error al procesar la actualización de fees"
}
```

## Estructura de Directorios
```
src/
├── routes/
│   ├── index.js        # Router principal
│   └── fees.route.js   # Rutas relacionadas con fees
└── app.js              # Configuración de la aplicación
```

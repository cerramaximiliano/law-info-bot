const mongoose = require('mongoose');

const actsSchema = new mongoose.Schema({
    href: { type: String, required: true },
    title: { type: String, required: true },
    text: { type: String },
    id: { type: Number, required: true, unique: true }, // El campo número es único
    siteId: { type: String, required: true }, // Identificador del sitio
    notifiedByTelegram: { type: Boolean, default: false }, // Indica si fue notificado por el bot de Telegram
    notificationDate: { type: Date, default: null }
}, {
    timestamps: true // Añade timestamps para createdAt y updatedAt
});

const Acts = mongoose.model('Acts', actsSchema);

module.exports = Acts;

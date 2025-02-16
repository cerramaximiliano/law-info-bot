const mongoose = require('mongoose');
const { Schema } = mongoose;

// Schema para las subcategorías
const SubcategoriaSchema = new Schema({
  nivel: {
    type: String,
    required: true,
    trim: true
  },
  importe: {
    type: Number,
    required: true,
    min: 0
  }
}, { _id: false });

// Schema para las categorías
const CategoriaSchema = new Schema({
  categoría: {
    type: String,
    required: true,
    trim: true
  },
  subcategorías: {
    type: [SubcategoriaSchema],
    required: true,
    validate: [
      {
        validator: function(v) {
          return Array.isArray(v) && v.length > 0;
        },
        message: 'Cada categoría debe tener al menos una subcategoría'
      }
    ]
  }
}, { _id: false });

// Schema principal para las actualizaciones salariales
const LaboralGastronomiaSchema = new Schema({
  fecha: {
    type: Date,
    required: true,
    unique: true,
    validate: {
      validator: function(v) {
        return v instanceof Date && !isNaN(v);
      },
      message: props => `${props.value} no es una fecha válida`
    }
  },
  acuerdo: {
    type: String,
    required: true,
    trim: true
  },
  detalles: {
    type: [CategoriaSchema],
    required: true,
    validate: [
      {
        validator: function(v) {
          return Array.isArray(v) && v.length > 0;
        },
        message: 'Debe haber al menos una categoría en los detalles'
      }
    ]
  },
  fuente: {
    type: String,
    required: true,
    trim: true,
    validate: {
      validator: function(v) {
        try {
          new URL(v);
          return true;
        } catch (error) {
          return false;
        }
      },
      message: props => `${props.value} no es una URL válida`
    }
  },
  fechaCreacion: {
    type: Date,
    default: Date.now
  },
  resumen: {
    type: String,
  },
  ultimaActualizacion: {
    type: Date,
    default: Date.now
  },
  notifiedByTelegram: { type: Boolean, default: false },
  notifiedByWhatsApp: { type: Boolean, default: false },
  postIG: { type: Boolean, default: false },
  notificationDate: { type: Date, default: null },
});

// Middleware para actualizar la fecha de última actualización
LaboralGastronomiaSchema.pre('save', function(next) {
  this.ultimaActualizacion = new Date();
  next();
});

// Índices
LaboralGastronomiaSchema.index({ fecha: 1 });
LaboralGastronomiaSchema.index({ 'detalles.categoría': 1 });

// Métodos estáticos
LaboralGastronomiaSchema.statics.encontrarPorFecha = function(fecha) {
  return this.findOne({ fecha: new Date(fecha) });
};

LaboralGastronomiaSchema.statics.encontrarPorCategoria = function(categoria) {
  return this.find({
    'detalles.categoría': categoria
  });
};

// Middleware para transformar la fecha en formato ISO antes de guardar
LaboralGastronomiaSchema.pre('save', function(next) {
  if (this.fecha && typeof this.fecha === 'string') {
    this.fecha = new Date(this.fecha);
  }
  next();
});

// Configuración para transformar la fecha al serializar
LaboralGastronomiaSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret) {
    if (ret.fecha) {
      ret.fecha = ret.fecha.toISOString().split('T')[0];
    }
    return ret;
  }
});

// Crear y exportar el modelo
const LaboralGastronomia = mongoose.model('LaboralGastronomia', LaboralGastronomiaSchema);

module.exports = LaboralGastronomia;
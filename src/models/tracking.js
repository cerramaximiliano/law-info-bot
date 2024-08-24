const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const trackingSchema = new Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // Referencia al modelo de usuario
    required: true
  },
  notificationId: {
    type: String,
    required: true
  },
  trackingCode: {
    type: String,
    required: true
  },
  movements: [
    {
      date: {
        type: Date,
        required: true
      },
      planta: {
        type: String,
        required: true
      },
      historia: {
        type: String,
        required: true
      },
      estado: {
        type: String,
        default: ""
      }
    }
  ],
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  isCompleted: {
    type: Boolean,
    default: false
  },
  screenshots: [
    {
      path: {
        type: String,
        required: true
      },
      capturedAt: {
        type: Date,
        default: Date.now
      }
    }
  ]
});

trackingSchema.methods.addMovement = function (movement) {
  this.movements.push(movement);
  this.lastUpdated = Date.now();
  return this.save();
};

trackingSchema.methods.addScreenshot = function (screenshotPath) {
  this.screenshots.push({ path: screenshotPath });
  return this.save();
};

module.exports = mongoose.model('Tracking', trackingSchema);

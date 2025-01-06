const mongoose = require('mongoose');
const {logWithDetails} = require('./logger');
mongoose.set('strictQuery', true);
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);   
    logWithDetails.info('MongoDB connected');
  } catch (err) {
    logWithDetails.error(err.message);
    process.exit(1);
  }
};

module.exports = connectDB;
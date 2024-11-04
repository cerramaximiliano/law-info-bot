const mongoose = require('mongoose');
const {logger} = require('./logger');
mongoose.set('strictQuery', true);
const connectDB = async () => {
  try {
    console.log(process.env.MONGO_URI)
    await mongoose.connect(process.env.MONGO_URI);
          
    logger.info('MongoDB connected');
  } catch (err) {
    logger.error(err.message);
    process.exit(1);
  }
};

module.exports = connectDB;
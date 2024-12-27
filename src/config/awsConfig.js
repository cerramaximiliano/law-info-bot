const { SESClient } = require('@aws-sdk/client-ses');

// Configura el cliente SES
const sesClient = new SESClient({
    region: 'us-east-1', // Cambia según tu región
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});

module.exports = sesClient;
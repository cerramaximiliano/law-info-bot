const { SendRawEmailCommand } = require("@aws-sdk/client-ses");
const sesClient = require("../config/awsConfig");
const { logWithDetails } = require("../config/logger");
const fs = require('fs').promises;
const mimeTypes = require('mime-types');

const sendEmail = async (to, subject, htmlBody, textBody, attachments = []) => {
 const boundary = `boundary-${Date.now()}`;
 const emailParts = [];

 emailParts.push(
   'MIME-Version: 1.0',
   `From: soporte@lawanalytics.app`,
   `To: ${to}`,
   `Subject: ${subject}`,
   `Content-Type: multipart/mixed; boundary="${boundary}"`,
   '',
   `--${boundary}`,
   'Content-Type: multipart/alternative; boundary="alt-boundary"',
   '',
   '--alt-boundary',
   'Content-Type: text/plain; charset=UTF-8',
   '',
   textBody,
   '',
   '--alt-boundary',
   'Content-Type: text/html; charset=UTF-8',
   '',
   htmlBody,
   '',
   '--alt-boundary--'
 );

 for (const filepath of attachments) {
   const content = await fs.readFile(filepath);
   const filename = filepath.split('/').pop();
   const mimeType = mimeTypes.lookup(filepath) || 'application/octet-stream';
   
   emailParts.push(
     `--${boundary}`,
     `Content-Type: ${mimeType}`,
     'Content-Transfer-Encoding: base64',
     `Content-Disposition: attachment; filename="${filename}"`,
     '',
     content.toString('base64')
   );
 }

 emailParts.push(`--${boundary}--`);

 const command = new SendRawEmailCommand({
   RawMessage: { Data: Buffer.from(emailParts.join('\r\n')) }
 });

 try {
   const result = await sesClient.send(command);
   logWithDetails.info(`Correo enviado a ${to}:`, result);
   return result;
 } catch (error) {
   logWithDetails.error(`Error al enviar correo a ${to}:`, error);
   throw error;
 }
};

module.exports = { sendEmail };
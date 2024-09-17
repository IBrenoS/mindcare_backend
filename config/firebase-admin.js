const admin = require("firebase-admin");
const serviceAccount = require("../config/mindcare-fbs-firebase-adminsdk-2z49s-b6211106ff.json");

// Inicializando o Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

module.exports = admin;

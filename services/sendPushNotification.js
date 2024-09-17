const admin = require("../config/firebase-admin");

const sendPushNotification = async (deviceToken, message) => {
  const payload = {
    notification: {
      title: message.title,
      body: message.body,
    },
    token: deviceToken,
  };

  try {
    const response = await admin.messaging().send(payload);
    console.log("Notificação enviada com sucesso:", response);
  } catch (error) {
    console.error("Erro ao enviar notificação push:", error);
  }
};

module.exports = { sendPushNotification };

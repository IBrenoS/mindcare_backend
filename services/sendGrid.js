const sgMail = require("@sendgrid/mail");
require("dotenv").config();

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Função para enviar o email de recuperação
const sendPasswordResetEmail = async (email, code) => {
  const msg = {
    to: email,
    from: process.env.SENDGRID_EMAIL_SENDER, // Email do remetente configurado no SendGrid
    subject: "Redefinição de Senha - MindCare",
    text: `Seu código de verificação para redefinir a senha é: ${code}. O código expira em 10 minutos.`,
  };

  try {
    await sgMail.send(msg);
    console.log("Email de recuperação enviado para:", email);
  } catch (error) {
    console.error("Erro ao enviar email de recuperação:", error);
  }
};

module.exports = { sendPasswordResetEmail };

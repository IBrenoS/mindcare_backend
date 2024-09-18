const sgMail = require("@sendgrid/mail");
require("dotenv").config();

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Função para enviar o e-mail de recuperação
const sendPasswordResetEmail = async (email, code) => {
  // Construir o link de redefinição de senha
  const resetLink = `https://mindcare-bb0ea3046931.herokuapp.com/resetPassword?email=${encodeURIComponent(
    email
  )}&code=${encodeURIComponent(code)}`;

  const msg = {
    to: email,
    from: process.env.SENDGRID_EMAIL_SENDER, // E-mail do remetente configurado no SendGrid
    subject: "Redefinição de Senha - MindCare",
    text: `Olá,

    Você solicitou a redefinição de sua senha. Por favor, clique no link abaixo para redefinir sua senha:

    ${resetLink}

    Este link expira em 10 minutos.

    Se você não solicitou a redefinição de senha, por favor, ignore este e-mail.

    Atenciosamente,
    Equipe MindCare`,
      html: `<p>Olá,</p>
    <p>Você solicitou a redefinição de sua senha. Por favor, clique no link abaixo para redefinir sua senha:</p>
    <p><a href="${resetLink}">Redefinir Senha</a></p>
    <p>Este link expira em 10 minutos.</p>
    <p>Se você não solicitou a redefinição de senha, por favor, ignore este e-mail.</p>
    <p>Atenciosamente,<br>Equipe MindCare</p>`,
  };

  try {
    await sgMail.send(msg);
    console.log("E-mail de recuperação enviado para:", email);
  } catch (error) {
    console.error("Erro ao enviar e-mail de recuperação:", error);
  }
};

module.exports = { sendPasswordResetEmail };

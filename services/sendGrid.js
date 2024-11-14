const sgMail = require("@sendgrid/mail");
require("dotenv").config();

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Função para enviar o e-mail de recuperação
const sendPasswordResetEmail = async (email, code) => {
  const resetLink = `https://mindcare-bb0ea3046931.herokuapp.com/resetPassword?email=${encodeURIComponent(
    email
  )}&code=${encodeURIComponent(code)}`;

  const msg = {
    to: email,
    from: process.env.SENDGRID_EMAIL_SENDER, // E-mail do remetente configurado no SendGrid
    subject: "Redefinição de Senha - MindCare",
    text: `Olá,

    Você solicitou a redefinição de sua senha. Seu código de verificação é: ${code}.
    Por favor, insira este código no aplicativo para redefinir sua senha.

    Este código expira em 10 minutos.

    Se você não solicitou a redefinição de senha, por favor, ignore este e-mail.

    Atenciosamente,
    Equipe MindCare`,
    html: `<p>Olá,</p>
    <p>Você solicitou a redefinição de sua senha. Seu código de verificação é: <strong>${code}</strong>.</p>
    <p>Por favor, insira este código no aplicativo para redefinir sua senha. <p><a href="${resetLink}">Redefinir Senha</a></p></p>
    <p>Este código expira em 10 minutos.</p>
    <p>Se você não solicitou a redefinição de senha, por favor, ignore este e-mail.</p>
    <p>Atenciosamente,<br>Equipe MindCare</p>`,
  };


  try {
    console.log("Tentando enviar e-mail para:", email);
    await sgMail.send(msg);
    console.log("E-mail de recuperação enviado com sucesso para:", email);
  } catch (error) {
    console.error("Erro ao enviar e-mail de recuperação:", error);
  }
};


// Função para enviar mensagens de contato ao suporte
const sendContactEmail = async (name, email, subject, message) => {
  const msg = {
    to: process.env.SENDGRID_EMAIL_SUPPORT,
    from: process.env.SENDGRID_EMAIL_SENDER,
    subject: `Contato MindCare: ${subject}`,
    text: `Nome: ${name || "Anônimo"}\nE-mail: ${email}\nAssunto: ${subject}\n\nMensagem:\n${message}`,
    html: `
      <p><strong>Nome:</strong> ${name || "Anônimo"}</p>
      <p><strong>E-mail:</strong> ${email}</p>
      <p><strong>Assunto:</strong> ${subject}</p>
      <p><strong>Mensagem:</strong></p>
      <p>${message}</p>
    `,
  };

  try {
    console.log("Tentando enviar mensagem de contato...");
    await sgMail.send(msg);
    console.log("Mensagem de contato enviada com sucesso!");
  } catch (error) {
    console.error("Erro ao enviar mensagem de contato:", error);
  }
};

module.exports = { sendPasswordResetEmail, sendContactEmail };

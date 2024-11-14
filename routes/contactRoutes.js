const express = require("express");
const { sendContactEmail } = require("../services/sendGrid");
const router = express.Router();
const authMiddleware = require("../middlewares/auth");

router.post("/suport", async (req, res) => {
  const { name, email, subject, message } = req.body;

  if (!email || !message) {
    return res
      .status(400)
      .json({ message: "E-mail e mensagem são obrigatórios." });
  }

  try {
    await sendContactEmail({ name, email, subject, message });
    return res.status(200).json({ message: "Mensagem enviada com sucesso!" });
  } catch (error) {
    console.error("Erro ao enviar mensagem:", error);
    return res.status(500).json({ message: "Erro ao enviar mensagem." });
  }
});

module.exports = router;

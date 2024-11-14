const express = require("express");
const { sendContactEmail } = require("../services/sendGrid");
const router = express.Router();
const authMiddleware = require("../middlewares/auth");

router.post("/suport", authMiddleware, async (req, res) => {
  const { name, email, subject, message } = req.body;

  try {
    await sendContactEmail(name, email, subject, message);
    res.status(200).json({ message: "Mensagem enviada com sucesso!" });
  } catch (error) {
    console.error("Erro ao enviar e-mail:", error);
    res.status(500).json({ message: "Erro ao enviar mensagem" });
  }
});

module.exports = router;

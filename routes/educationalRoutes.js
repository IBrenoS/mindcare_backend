const express = require("express");
const Article = require("../models/Articles");
const authMiddleware = require("../middlewares/auth");
const router = express.Router();

// Rota para listar artigos aprovados (Conteúdo Educativo)
router.get("/articles", authMiddleware, async (req, res) => {
  try {
    const approvedArticles = await Article.find({ status: "approved" });
    res.json(approvedArticles);
  } catch (err) {
    console.error("Erro ao listar artigos aprovados:", err.message);
    res.status(500).json({ msg: "Erro ao listar artigos." });
  }
});

module.exports = router;

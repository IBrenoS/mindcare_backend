const express = require("express");
const Article = require("../models/articles");
const authMiddleware = require("../middlewares/auth");
const router = express.Router();

// Rota para listar artigos aprovados (Conteúdo Educativo) com paginação
router.get("/articles", authMiddleware, async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  try {
    const approvedArticles = await Article.find({ status: "approved" })
      .select("title summary content author source url urlToImage createdAt")
      .skip(skip)
      .limit(limit);

    const totalArticles = await Article.countDocuments({ status: "approved" });

    res.json({
      success: true,
      data: approvedArticles,
      message: "Artigos aprovados listados com sucesso.",
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalArticles / limit),
        totalItems: totalArticles,
      },
    });
  } catch (err) {
    console.error("Erro ao listar artigos aprovados:", err.message);
    res
      .status(500)
      .json({ success: false, message: "Erro ao listar artigos." });
  }
});

module.exports = router;

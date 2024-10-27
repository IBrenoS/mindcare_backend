const express = require("express");
const Video = require("../models/video");
const authMiddleware = require("../middlewares/auth");
const router = express.Router();

// Rota para listar vídeos aprovados com filtragem opcional por categoria
router.get("/videos", authMiddleware, async (req, res) => {
  try {
    const category = req.query.category
      ? decodeURIComponent(req.query.category)
      : null;

    // Filtro para buscar vídeos aprovados, e se houver uma categoria, aplica também
    const filter = { status: "approved" };
    if (category) {
      filter.category = category;
    }

    const approvedVideos = await Video.find(filter);
    res.json({
      success: true,
      data: approvedVideos,
      message: "Vídeos aprovados listados com sucesso.",
    });
  } catch (err) {
    console.error("Erro ao listar vídeos aprovados:", err.message);
    res.status(500).json({
      success: false,
      message: "Erro ao listar vídeos aprovados.",
      error: err.message,
    });
  }
});

module.exports = router;

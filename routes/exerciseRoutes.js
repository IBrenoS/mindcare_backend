const express = require("express");
const Video = require("../models/video");
const authMiddleware = require("../middlewares/auth");
const router = express.Router();

// Retorna uma lista de vídeos de exercícios, com opção de filtro por categoria
router.get("/videos", authMiddleware, async (req, res) => {
  const { category } = req.query;

  try {
    let videos;
    // Filtrar vídeos da categoria "exercises" ou outra fornecida
    if (category) {
      videos = await Video.find({ category: category, status: "approved" });
    } else {
      videos = await Video.find({ category: "exercises", status: "approved" });
    }

    res.json(videos);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ msg: "Erro ao exibir vídeos de exercícios." });
  }
});

module.exports = router;

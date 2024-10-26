const express = require("express");
const router = express.Router();
const Video = require("../models/video");
const authMiddleware = require("../middlewares/auth");
const authorize = require("../middlewares/authorize");

// Rota para aprovar vídeo com categoria
router.post(
  "/videos/approve/:id",
  authMiddleware,
  authorize(["moderator", "admin"]),
  async (req, res) => {
    const videoId = req.params.id;
    const { category } = req.body; // Recebe a categoria do frontend

    try {
      if (
        !category ||
        !["Meditação", "Relaxamento", "Saúde"].includes(category)
      ) {
        return res.status(400).json({ msg: "Categoria inválida." });
      }

      const video = await Video.findByIdAndUpdate(
        videoId,
        { status: "approved", category: category },
        { new: true }
      );

      if (!video) {
        return res.status(404).json({ msg: "Vídeo não encontrado." });
      }

      res.json({ msg: "Vídeo aprovado com sucesso.", video });
    } catch (err) {
      res
        .status(500)
        .json({ msg: "Erro ao aprovar o vídeo.", error: err.message });
    }
  }
);

module.exports = router;

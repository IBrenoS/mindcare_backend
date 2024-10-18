const express = require("express");
const Video = require("../models/video");
const authMiddleware = require("../middlewares/auth");
const router = express.Router();

// Listar vídeos aprovados filtrados por categoria
router.get(
  "/videos",
  async (req, res) => {
    const category = req.query.category;

    try {
      const query = { status: "approved" };
      if (category) {
        query.category = category; // Filtra por categoria, se fornecido
      }

      const videos = await Video.find(query);
      res.json({ success: true, data: videos, message: "Vídeos listados com sucesso." });
    } catch (err) {
      res.status(500).json({ success: false, data: null, message: "Erro ao listar vídeos." });
    }
  }
);


module.exports = router;

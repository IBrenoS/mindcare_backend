const express = require("express");
const router = express.Router();
const fetchYouTubeVideos = require("../services/fetchYouTubeVideos");
const fetchNewsAPIArticles = require("../services/fetchNewsAPIArticles");
const authMiddleware = require("../middlewares/auth");
const authorize = require("../middlewares/authorize");

// Rota para automatizar a busca de vídeos da YouTube API
router.post(
  "/videos",
  authMiddleware,
  authorize(["moderator", "admin"]),
  async (req, res) => {
    try {
      const limit = req.body.limit || 5; // Limite configurável
      await fetchYouTubeVideos(limit);
      res.json({
        success: true,
        message: "Busca de vídeos automatizada realizada com sucesso!",
      });
    } catch (err) {
      res
        .status(500)
        .json({
          success: false,
          message: "Erro ao buscar vídeos.",
          error: err.message,
        });
    }
  }
);

// Rota para automatizar a busca de artigos da NewsAPI
router.post(
  "/articles",
  authMiddleware,
  authorize(["moderator", "admin"]),
  async (req, res) => {
    try {
      const limit = req.body.limit || 10; // Limite configurável
      await fetchNewsAPIArticles(limit);
      res.json({
        success: true,
        message: "Busca de artigos automatizada realizada com sucesso!",
      });
    } catch (err) {
      res
        .status(500)
        .json({
          success: false,
          message: "Erro ao buscar artigos.",
          error: err.message,
        });
    }
  }
);

module.exports = router;

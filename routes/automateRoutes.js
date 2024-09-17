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
      await fetchYouTubeVideos();
      res.json({ msg: "Busca de vídeos automatizada realizada com sucesso!" });
    } catch (err) {
      res.status(500).json({ msg: "Erro ao buscar vídeos." });
    }
  }
);

// Rota para automatizar a busca de artigos API
router.post(
  "/articles",
  authMiddleware,
  authorize(["moderator", "admin"]),
  async (req, res) => {
    try {
      await fetchNewsAPIArticles();
      res.json({ msg: "Busca de artigos automatizada realizada com sucesso!" });
    } catch (err) {
      res.status(500).json({ msg: "Erro ao buscar artigos." });
    }
  }
);

module.exports = router;

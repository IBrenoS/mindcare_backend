const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/auth");
const authorize = require("../middlewares/authorize");
const Video = require("../models/video");
const Article = require("../models/articles");

// Rota para listar vídeos pendentes
router.get(
  "/videos/pending",
  authMiddleware,
  authorize(["moderator", "admin"]),
  async (req, res) => {
    try {
      const pendingVideos = await Video.find({ status: "pending" });
      res.json(pendingVideos);
    } catch (err) {
      res.status(500).json({ msg: "Erro ao listar vídeos pendentes." });
    }
  }
);

// Aprovar vídeo
router.post(
  "/videos/approve/:id",
  authMiddleware,
  authorize(["moderator", "admin"]),
  async (req, res) => {
    try {
      const video = await Video.findByIdAndUpdate(
        req.params.id,
        { status: "approved" },
        { new: true }
      );
      res.json({ msg: "Vídeo aprovado com sucesso.", video });
    } catch (err) {
      res.status(500).json({ msg: "Erro ao aprovar o vídeo." });
    }
  }
);

// Rejeitar vídeo
router.post(
  "/videos/reject/:id",
  authMiddleware,
  authorize(["moderator", "admin"]),
  async (req, res) => {
    try {
      const video = await Video.findByIdAndUpdate(
        req.params.id,
        { status: "rejected" },
        { new: true }
      );
      res.json(video);
    } catch (err) {
      res.status(500).json({ msg: "Erro ao rejeitar o vídeo." });
    }
  }
);

// Rota para listar artigos pendentes
router.get(
  "/articles/pending",
  authMiddleware,
  authorize(["moderator", "admin"]),
  async (req, res) => {
    try {
      const pendingArticles = await Article.find({ status: "pending" });
      res.json(pendingArticles);
    } catch (err) {
      res.status(500).json({ msg: "Erro ao listar artigos pendentes." });
    }
  }
);

// Aprovar artigo
router.post(
  "/articles/approve/:id",
  authMiddleware,
  authorize(["moderator", "admin"]),
  async (req, res) => {
    try {
      const article = await Article.findByIdAndUpdate(
        req.params.id,
        { status: "approved" },
        { new: true }
      );
      res.json(article);
    } catch (err) {
      res.status(500).json({ msg: "Erro ao aprovar o artigo." });
    }
  }
);

// Rejeitar artigo
router.post(
  "/articles/reject/:id",
  authMiddleware,
  authorize(["moderator", "admin"]),
  async (req, res) => {
    try {
      const article = await Article.findByIdAndUpdate(
        req.params.id,
        { status: "rejected" },
        { new: true }
      );
      res.json(article);
    } catch (err) {
      res.status(500).json({ msg: "Erro ao rejeitar o artigo." });
    }
  }
);

module.exports = router;

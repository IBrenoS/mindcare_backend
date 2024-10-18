const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();
const authMiddleware = require("../middlewares/auth");
const authorize = require("../middlewares/authorize");
const Video = require("../models/video");
const Article = require("../models/articles");

// Função para validar o ID recebido como parâmetro
function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

// Rota para listar vídeos pendentes com paginação
router.get(
  "/videos/pending",
  authMiddleware,
  authorize(["moderator", "admin"]),
  async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    try {
      const pendingVideos = await Video.find({ status: "pending" })
        .skip(skip)
        .limit(limit);

      const totalVideos = await Video.countDocuments({ status: "pending" });

      res.json({
        success: true,
        data: pendingVideos,
        message: "Vídeos pendentes listados com sucesso.",
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalVideos / limit),
          totalItems: totalVideos,
        },
      });
    } catch (err) {
      res
        .status(500)
        .json({
          success: false,
          data: null,
          message: "Erro ao listar vídeos pendentes.",
        });
    }
  }
);

// Aprovar vídeo
router.post(
  "/videos/approve/:id",
  authMiddleware,
  authorize(["moderator", "admin"]),
  async (req, res) => {
    const videoId = req.params.id;
    const { category } = req.body;

    if (!isValidObjectId(videoId)) {
      return res
        .status(400)
        .json({ success: false, data: null, message: "ID inválido." });
    }

    if (!category) {
      return res
        .status(400)
        .json({
          success: false,
          data: null,
          message: "A categoria do vídeo é obrigatória.",
        });
    }

    try {
      const video = await Video.findByIdAndUpdate(
        videoId,
        { status: "approved" },
        { new: true }
      );

      if (!video) {
        return res
          .status(404)
          .json({
            success: false,
            data: null,
            message: "Vídeo não encontrado.",
          });
      }

      res.json({
        success: true,
        data: video,
        message: "Vídeo aprovado com sucesso.",
      });
    } catch (err) {
      res
        .status(500)
        .json({
          success: false,
          data: null,
          message: "Erro ao aprovar o vídeo.",
        });
    }
  }
);

// Rejeitar vídeo
router.post(
  "/videos/reject/:id",
  authMiddleware,
  authorize(["moderator", "admin"]),
  async (req, res) => {
    const videoId = req.params.id;

    if (!isValidObjectId(videoId)) {
      return res
        .status(400)
        .json({ success: false, data: null, message: "ID inválido." });
    }

    try {
      const video = await Video.findByIdAndUpdate(
        videoId,
        { status: "rejected" },
        { new: true }
      );

      if (!video) {
        return res
          .status(404)
          .json({
            success: false,
            data: null,
            message: "Vídeo não encontrado.",
          });
      }

      res.json({
        success: true,
        data: video,
        message: "Vídeo rejeitado com sucesso.",
      });
    } catch (err) {
      res
        .status(500)
        .json({
          success: false,
          data: null,
          message: "Erro ao rejeitar o vídeo.",
        });
    }
  }
);

// Rota para listar artigos pendentes com paginação
router.get(
  "/articles/pending",
  authMiddleware,
  authorize(["moderator", "admin"]),
  async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    try {
      const pendingArticles = await Article.find({ status: "pending" })
        .skip(skip)
        .limit(limit);

      const totalArticles = await Article.countDocuments({ status: "pending" });

      res.json({
        success: true,
        data: pendingArticles,
        message: "Artigos pendentes listados com sucesso.",
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalArticles / limit),
          totalItems: totalArticles,
        },
      });
    } catch (err) {
      res
        .status(500)
        .json({
          success: false,
          data: null,
          message: "Erro ao listar artigos pendentes.",
        });
    }
  }
);

// Aprovar artigo
router.post(
  "/articles/approve/:id",
  authMiddleware,
  authorize(["moderator", "admin"]),
  async (req, res) => {
    const articleId = req.params.id;

    if (!isValidObjectId(articleId)) {
      return res
        .status(400)
        .json({ success: false, data: null, message: "ID inválido." });
    }

    try {
      const article = await Article.findByIdAndUpdate(
        articleId,
        { status: "approved" },
        { new: true }
      );

      if (!article) {
        return res
          .status(404)
          .json({
            success: false,
            data: null,
            message: "Artigo não encontrado.",
          });
      }

      res.json({
        success: true,
        data: article,
        message: "Artigo aprovado com sucesso.",
      });
    } catch (err) {
      res
        .status(500)
        .json({
          success: false,
          data: null,
          message: "Erro ao aprovar o artigo.",
        });
    }
  }
);

// Rejeitar artigo
router.post(
  "/articles/reject/:id",
  authMiddleware,
  authorize(["moderator", "admin"]),
  async (req, res) => {
    const articleId = req.params.id;

    if (!isValidObjectId(articleId)) {
      return res
        .status(400)
        .json({ success: false, data: null, message: "ID inválido." });
    }

    try {
      const article = await Article.findByIdAndUpdate(
        articleId,
        { status: "rejected" },
        { new: true }
      );

      if (!article) {
        return res
          .status(404)
          .json({
            success: false,
            data: null,
            message: "Artigo não encontrado.",
          });
      }

      res.json({
        success: true,
        data: article,
        message: "Artigo rejeitado com sucesso.",
      });
    } catch (err) {
      res
        .status(500)
        .json({
          success: false,
          data: null,
          message: "Erro ao rejeitar o artigo.",
        });
    }
  }
);

module.exports = router;

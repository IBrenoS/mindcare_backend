const express = require("express");
const { check, validationResult } = require("express-validator");
const authMiddleware = require("../middlewares/auth"); // Middleware de autenticação JWT
const DiaryEntry = require("../models/diaryEntry");
const router = express.Router();
const dayjs = require("dayjs");

// Criar uma nova entrada no diário de humor
router.post(
  "/entries",
  authMiddleware,
  [
    // Validação dos dados de entrada
    check("moodEmoji")
      .notEmpty()
      .withMessage("O emoji do humor é obrigatório.")
      .isLength({ max: 5 })
      .withMessage("O emoji deve ter no máximo 5 caracteres."),
    check("entry")
      .optional()
      .isLength({ max: 1000 })
      .withMessage("A entrada de texto deve ter no máximo 1000 caracteres."),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      // Retorna erros de validação
      return res.status(400).json({ errors: errors.array() });
    }

    const { moodEmoji, entry } = req.body;

    try {
      const newEntry = new DiaryEntry({
        userId: req.user.id, // ID do usuário autenticado recuperado do token JWT
        moodEmoji,
        entry,
      });

      await newEntry.save();

      // Retorna apenas os campos necessários
      res.status(201).json({
        id: newEntry._id,
        moodEmoji: newEntry.moodEmoji,
        entry: newEntry.entry,
        createdAt: newEntry.createdAt,
        updatedAt: newEntry.updatedAt,
      });
    } catch (error) {
      console.error(error.message);
      res.status(500).json({ msg: "Erro ao criar a entrada de humor." });
    }
  }
);

// Listar entradas de humor do usuário com paginação e filtros opcionais
router.get("/entries", authMiddleware, async (req, res) => {
  const validFilters = ["daily", "weekly", "monthly"];
  const filter = req.query.filter;
  const page = parseInt(req.query.page) || 1;
  const maxLimit = 100;
  const limit = Math.min(parseInt(req.query.limit) || 10, maxLimit);

  if (filter && !validFilters.includes(filter)) {
    return res.status(400).json({ msg: "Filtro inválido." });
  }

  try {
    let dateFilter = {};
    const now = dayjs();

    if (filter === "daily") {
      dateFilter = { createdAt: { $gte: now.startOf("day").toDate() } };
    } else if (filter === "weekly") {
      dateFilter = { createdAt: { $gte: now.startOf("week").toDate() } };
    } else if (filter === "monthly") {
      dateFilter = { createdAt: { $gte: now.startOf("month").toDate() } };
    }

    const query = {
      userId: req.user.id,
      ...dateFilter,
    };

    const totalEntries = await DiaryEntry.countDocuments(query);

    const entries = await DiaryEntry.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit) // Paginação: pular os registros anteriores
      .limit(limit) // Limitar o número de entradas
      .select("id moodEmoji entry createdAt updatedAt"); // Selecionar apenas os campos necessários

    res.json({
      totalEntries,
      totalPages: Math.ceil(totalEntries / limit),
      currentPage: page,
      entries,
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ msg: "Erro ao recuperar as entradas de humor." });
  }
});

// Obter uma entrada de humor específica
router.get("/entries/:id", authMiddleware, async (req, res) => {
  try {
    const entry = await DiaryEntry.findOne({
      _id: req.params.id,
      userId: req.user.id,
    }).select("id moodEmoji entry createdAt updatedAt");

    if (!entry) {
      return res.status(404).json({ msg: "Entrada não encontrada." });
    }

    res.json(entry);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ msg: "Erro ao recuperar a entrada de humor." });
  }
});

// Editar uma entrada de humor existente
router.put(
  "/entries/:id",
  authMiddleware,
  [
    // Validação dos dados de entrada
    check("moodEmoji")
      .optional()
      .notEmpty()
      .withMessage("O emoji do humor não pode estar vazio.")
      .isLength({ max: 5 })
      .withMessage("O emoji deve ter no máximo 5 caracteres."),
    check("entry")
      .optional()
      .isLength({ max: 1000 })
      .withMessage("A entrada de texto deve ter no máximo 1000 caracteres."),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      // Retorna erros de validação
      return res.status(400).json({ errors: errors.array() });
    }

    const { moodEmoji, entry } = req.body;

    try {
      const updatedFields = {};
      if (moodEmoji) updatedFields.moodEmoji = moodEmoji;
      if (entry) updatedFields.entry = entry;

      const updatedEntry = await DiaryEntry.findOneAndUpdate(
        { _id: req.params.id, userId: req.user.id },
        { $set: updatedFields },
        { new: true }
      ).select("id moodEmoji entry createdAt updatedAt");

      if (!updatedEntry) {
        return res.status(404).json({ msg: "Entrada não encontrada." });
      }

      res.json(updatedEntry);
    } catch (error) {
      console.error(error.message);
      res.status(500).json({ msg: "Erro ao atualizar a entrada de humor." });
    }
  }
);

// Deletar uma entrada de humor
router.delete("/entries/:id", authMiddleware, async (req, res) => {
  try {
    const deletedEntry = await DiaryEntry.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!deletedEntry) {
      return res.status(404).json({ msg: "Entrada não encontrada." });
    }

    res.json({ msg: "Entrada de humor deletada com sucesso." });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ msg: "Erro ao deletar a entrada de humor." });
  }
});

// Gerenciar emojis personalizados do usuário
router.put("/emojis", authMiddleware, async (req, res) => {
  const { emojis } = req.body;

  if (!Array.isArray(emojis) || emojis.length > 6) {
    return res.status(400).json({ msg: "Você pode personalizar até 6 emojis." });
  }

  try {
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { customEmojis: emojis },
      { new: true }
    ).select("customEmojis");

    res.json(user.customEmojis);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ msg: "Erro ao atualizar os emojis personalizados." });
  }
});

module.exports = router;

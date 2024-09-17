const express = require("express");
const authMiddleware = require("../middlewares/auth"); // Middleware de autenticação JWT
const DiaryEntry = require("../models/diaryEntry");
const router = express.Router();
const dayjs = require("dayjs");

// Criar uma nova entrada no diário de humor
router.post("/createEntry", authMiddleware, async (req, res) => {
  const { moodEmoji, entry } = req.body;

  try {
    const newEntry = new DiaryEntry({
      userId: req.user.id, // ID do usuário autenticado recuperado do token JWT
      moodEmoji,
      entry,
    });

    await newEntry.save();
    res.status(201).json(newEntry);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ msg: "Erro ao criar a entrada de humor." });
  }
});

// Listar entradas de humor do usuário com filtros opcionais (diário, semanal, mensal)
router.get("/entries", authMiddleware, async (req, res) => {
  const { filter } = req.query; // Exemplo de valores para 'filter': 'daily', 'weekly', 'monthly'

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

    const entries = await DiaryEntry.find({
      userId: req.user.id, // Apenas entradas do usuário autenticado
      ...dateFilter,
    }).sort({ createdAt: -1 });

    res.json(entries);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ msg: "Erro ao recuperar as entradas de humor." });
  }
});

module.exports = router;

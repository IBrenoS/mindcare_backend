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

// Listar entradas de humor do usuário com paginação e filtros opcionais
router.get("/entries", authMiddleware, async (req, res) => {
  const { filter, page = 1, limit = 10 } = req.query;

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
      userId: req.user.id,
      ...dateFilter,
    })
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit) // Paginação: pular os registros anteriores
    .limit(Number(limit)); // Limitar o número de entradas

    res.json(entries);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ msg: "Erro ao recuperar as entradas de humor." });
  }
});

// Editar uma entrada de humor existente
router.put("/entry/:id", authMiddleware, async (req, res) => {
  const { moodEmoji, entry } = req.body;

  try {
    const updatedEntry = await DiaryEntry.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { moodEmoji, entry },
      { new: true }
    );
    res.json(updatedEntry);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ msg: "Erro ao atualizar a entrada de humor." });
  }
});

// Deletar uma entrada de humor
router.delete("/entry/:id", authMiddleware, async (req, res) => {
  try {
    await DiaryEntry.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    res.json({ msg: "Entrada de humor deletada com sucesso." });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ msg: "Erro ao deletar a entrada de humor." });
  }
});

module.exports = router;

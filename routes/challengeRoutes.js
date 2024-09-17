const express = require("express");
const authMiddleware = require("../middlewares/auth"); // Middleware de autenticação JWT
const Challenge = require("../models/challenge");
const router = express.Router();

// Retorna a lista de desafios disponíveis
router.get("/challenges", authMiddleware, async (req, res) => {
  try {
    const challenges = await Challenge.find();
    res.json(challenges);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ msg: "Erro ao recuperar desafios." });
  }
});

// Rota para adicionar novos desafios (Opcional, para gerenciamento de desafios)
router.post("/challenges", authMiddleware, async (req, res) => {
  const { description, points, condition, icon } = req.body;

  try {
    const newChallenge = new Challenge({
      description,
      points,
      condition,
      icon,
    });

    await newChallenge.save();
    res.status(201).json(newChallenge);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ msg: "Erro ao criar desafio." });
  }
});

module.exports = router;

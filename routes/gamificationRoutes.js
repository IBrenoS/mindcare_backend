const express = require("express");
const authMiddleware = require("../middlewares/auth"); // Middleware de autenticação JWT
const Progress = require("../models/progress");
const Reward = require("../models/reward");
const router = express.Router();

// Retorna o progresso do usuário
router.get("/progress", authMiddleware, async (req, res) => {
  try {
    const progress = await Progress.findOne({ userId: req.user.userId });
    if (!progress) {
      return res.status(404).json({ msg: "Progresso não encontrado." });
    }
    res.json(progress);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ msg: "Erro ao recuperar o progresso do usuário." });
  }
});

// Atualiza o progresso do usuário após completar uma tarefa
router.post("/updateProgress", authMiddleware, async (req, res) => {
  const { taskCompleted, pointsEarned } = req.body;

  try {
    let progress = await Progress.findOne({ userId: req.user.userId });

    if (!progress) {
      // Se não houver progresso registrado, cria um novo registro
      progress = new Progress({
        userId: req.user.id,
        tasksCompleted: [taskCompleted],
        points: pointsEarned,
      });
    } else {
      // Atualiza o progresso existente
      progress.tasksCompleted.push(taskCompleted);
      progress.points += pointsEarned;
      progress.lastUpdated = Date.now();
    }

    await progress.save();
    res.status(200).json(progress);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ msg: "Erro ao atualizar o progresso do usuário." });
  }
});

// Retorna as recompensas disponíveis para o usuário
router.get("/rewards", authMiddleware, async (req, res) => {
  try {
    const rewards = await Reward.find();
    res.json(rewards);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ msg: "Erro ao recuperar recompensas." });
  }
});

// Permite que o usuário resgate uma recompensa
router.post("/claimReward", authMiddleware, async (req, res) => {
  const { rewardId } = req.body;

  try {
    const reward = await Reward.findById(rewardId);
    if (!reward) {
      return res.status(404).json({ msg: "Recompensa não encontrada." });
    }

    const progress = await Progress.findOne({ userId: req.user.userId });
    if (!progress) {
      return res
        .status(400)
        .json({ msg: "Você ainda não acumulou pontos suficientes." });
    }

    if (progress.points < reward.pointsRequired) {
      return res
        .status(400)
        .json({ msg: "Pontos insuficientes para resgatar essa recompensa." });
    }

    // Deduz os pontos da recompensa
    progress.points -= reward.pointsRequired;
    await progress.save();

    res.status(200).json({ msg: "Recompensa resgatada com sucesso!" });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ msg: "Erro ao resgatar a recompensa." });
  }
});

module.exports = router;

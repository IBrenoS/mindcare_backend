const mongoose = require("mongoose");

// Definindo o esquema de recompensas
const RewardSchema = new mongoose.Schema({
  description: { type: String, required: true }, // Descrição da recompensa
  pointsRequired: { type: Number, required: true }, // Pontos necessários para resgatar a recompensa
});

module.exports = mongoose.model("Reward", RewardSchema);

const mongoose = require("mongoose");

// Definindo o esquema de desafios
const ChallengeSchema = new mongoose.Schema({
  description: { type: String, required: true }, // Descrição do desafio
  points: { type: Number, required: true }, // Pontos dados ao completar o desafio
  condition: { type: String, required: true }, // Condição para completar o desafio (ex: "meditation_sessions >= 5")
  icon: { type: String }, // URL de um ícone que representa o desafio
});

module.exports = mongoose.model("Challenge", ChallengeSchema);

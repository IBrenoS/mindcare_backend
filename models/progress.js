const mongoose = require("mongoose");

// Definindo o esquema de progresso do usuário
const ProgressSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // Referência ao usuário
  tasksCompleted: [{ type: String }], // Lista de tarefas concluídas
  points: { type: Number, default: 0 }, // Pontos acumulados
  lastUpdated: { type: Date, default: Date.now }, // Última atualização
});

module.exports = mongoose.model("Progress", ProgressSchema);

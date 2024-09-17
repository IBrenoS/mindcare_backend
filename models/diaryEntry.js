const mongoose = require("mongoose");

// Definindo o esquema de entradas do diário de humor
const DiaryEntrySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // Referência ao usuário
  moodEmoji: { type: String, required: true }, // Emoji representando o humor
  entry: { type: String, required: true }, // Texto descrevendo o humor do dia
  createdAt: { type: Date, default: Date.now }, // Data de criação da entrada
});

module.exports = mongoose.model("DiaryEntry", DiaryEntrySchema);

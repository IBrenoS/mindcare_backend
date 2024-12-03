const mongoose = require("mongoose");

const articleSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String, default: "Conteúdo indisponível" }, // Conteúdo opcional
  author: { type: String, default: "Autor desconhecido" }, // Autor opcional
  url: { type: String, required: true }, // URL do artigo
  urlToImage: { type: String, default: "" }, // URL da imagem (thumbnail)
  source: { type: String },
  status: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "pending",
  },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.models.Article || mongoose.model("Article", articleSchema);

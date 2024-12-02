const mongoose = require("mongoose");

const PostSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // Referência ao autor da postagem
  content: { type: String }, // Conteúdo da postagem
  imageUrl: { type: String }, // URL opcional de imagem
  comments: [
    {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      }, // Autor do comentário
      comment: { type: String, required: true }, // Texto do comentário
      createdAt: { type: Date, default: Date.now }, // Data do comentário
    },
  ],
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], // IDs de usuários que curtiram a postagem
  createdAt: { type: Date, default: Date.now }, // Data de criação da postagem
  updatedAt: { type: Date, default: Date.now }, // Data de atualização da postagem
  isActive: { type: Boolean, default: true },
  deletionScheduledAt: { type: Date },
});

// Hook para atualizar `updatedAt` automaticamente
PostSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

PostSchema.index({ userId: 1, createdAt: -1 });
PostSchema.index({ deletionScheduledAt: 1, isActive: 1 });

module.exports = mongoose.model("Post", PostSchema);

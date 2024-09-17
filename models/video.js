const mongoose = require("mongoose");

const videoSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  url: { type: String, required: true },
  thumbnail: { type: String },
  status: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "pending", // Todos os vídeos começam como 'pendentes'
  },
  category: { type: String, default: "general" },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Video", videoSchema);

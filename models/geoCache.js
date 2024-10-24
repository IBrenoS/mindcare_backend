const mongoose = require("mongoose");

const GeoCacheSchema = new mongoose.Schema({
  location: {
    type: { type: String, default: "Point" }, // Tipo do campo geoespacial
    coordinates: { type: [Number], required: true }, // Array [longitude, latitude]
  },
  queries: {
    type: [String],
    required: true,
  },
  data: Array,
  createdAt: { type: Date, default: Date.now, expires: 3600 }, // Expira após 1 hora
});

// Índice geoespacial para otimizar consultas
GeoCacheSchema.index({ location: "2dsphere" });

module.exports = mongoose.model("GeoCache", GeoCacheSchema);

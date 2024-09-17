const mongoose = require("mongoose");

const geoCacheSchema = new mongoose.Schema({
  latitude: {
    type: Number,
    required: true,
  },
  longitude: {
    type: Number,
    required: true,
  },
  data: {
    type: Array, // Armazena os resultados da consulta
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 3600, // Define o tempo de vida do cache em segundos (1 hora = 3600 segundos)
  },
});

module.exports = mongoose.model("GeoCache", geoCacheSchema);

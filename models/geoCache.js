const mongoose = require("mongoose");

// Sub-esquema para armazenar informações de fotos
const PhotoSchema = new mongoose.Schema({
  url: {
    type: String,
    required: true,
  },
  attributions: {
    type: [String],
    required: false,
  },
});

// Sub-esquema para armazenar informações sobre o horário de funcionamento
const OpeningHoursSchema = new mongoose.Schema({
  text: {
    type: [String], // Exemplo: ['Segunda: 9:00 AM – 5:00 PM', 'Terça: 9:00 AM – 5:00 PM']
    required: false,
  },
  status: {
    type: String, // Exemplo: "Aberto agora" ou "Fechado no momento"
    required: false,
  },
});

// Esquema principal para armazenar os dados do cache de pontos de apoio
const GeoCacheSchema = new mongoose.Schema({
  latitude: {
    type: Number,
    required: true,
  },
  longitude: {
    type: Number,
    required: true,
  },
  queries: {
    type: [String], // Exemplo: ["CRAS", "Clínicas de Psicologia", "Clínicas Psiquiátricas"]
    required: true,
  },
  data: [
    {
      id: String,
      title: {
        type: String,
        default: "Ponto de Apoio",
      },
      position: {
        lat: Number,
        lng: Number,
      },
      address: {
        type: String,
        default: "Endereço não disponível",
      },
      type: {
        type: String,
        enum: ["public", "private"],
        default: "private",
      },
      rating: {
        type: String,
        default: "Sem avaliação",
      },
      distance: {
        type: Number, // Para armazenar a distância calculada
        required: false,
      },
      opening_hours: OpeningHoursSchema, // Relaciona com o esquema de horários
      photos: [PhotoSchema], // Relaciona com o esquema de fotos
    },
  ],
  createdAt: {
    type: Date,
    default: Date.now,
    index: { expires: "6h" }, // Cache expira automaticamente após 6 horas
  },
});

module.exports = mongoose.model("GeoCache", GeoCacheSchema);

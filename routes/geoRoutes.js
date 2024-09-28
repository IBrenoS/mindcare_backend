const express = require("express");
const axios = require("axios");
const GeoCache = require("../models/geoCache");
const router = express.Router();

// Chave da API do Google Places
const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;

// Função para buscar pontos de apoio pela Google Places API
async function getSupportPointsFromGoogle(latitude, longitude, query) {
  const googleUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(
    query
  )}&location=${latitude},${longitude}&radius=5000&key=${GOOGLE_PLACES_API_KEY}`;
  try {
    const response = await axios.get(googleUrl);
    // Filtra resultados para exibir apenas os que sejam relevantes
    return response.data.results.map((item) => ({
      id: item.place_id,
      title: item.name || "Ponto de Apoio",
      position: {
        lat: item.geometry.location.lat,
        lng: item.geometry.location.lng,
      },
      address: item.formatted_address,
      type: item.types.includes("health") ? "public" : "private",
    }));
  } catch (error) {
    console.error("Erro na API Google Places:", error.message);
    throw new Error("Erro ao buscar pontos de apoio externos.");
  }
}

// Rota para buscar pontos de apoio usando Google Places API e cache no MongoDB
router.get("/nearby", async (req, res) => {
  try {
    const { latitude: lat, longitude: lon, query } = req.query;
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lon);

    if (isNaN(latitude) || isNaN(longitude)) {
      return res.status(400).json({ msg: "Coordenadas inválidas." });
    }

    // Busca pontos usando Google Places com o termo passado (ex: "clínica de saúde mental")
    const supportPoints = await getSupportPointsFromGoogle(
      latitude,
      longitude,
      query || "centro de apoio"
    );

    if (supportPoints.length === 0) {
      return res.status(404).json({ msg: "Nenhum ponto de apoio encontrado." });
    }

    // Opcional: armazenar resultado no cache para otimizar futuras buscas
    const newCacheEntry = new GeoCache({
      latitude,
      longitude,
      data: supportPoints,
    });

    await newCacheEntry.save();

    // Retorna os pontos de apoio encontrados
    res.json(supportPoints);
  } catch (error) {
    console.error("Erro ao buscar pontos de apoio:", error.message);
    res
      .status(500)
      .json({ msg: "Erro ao buscar pontos de apoio: " + error.message });
  }
});

module.exports = router;

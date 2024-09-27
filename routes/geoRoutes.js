const express = require("express");
const axios = require("axios");
const GeoCache = require("../models/geoCache");
const router = express.Router();

// Chave da API do Here Geocoding
const HERE_API_KEY = process.env.HERE_API_KEY;

// Função para buscar pontos de apoio pela Here API
async function getSupportPointsFromHere(latitude, longitude) {
  const hereUrl = `https://discover.search.hereapi.com/v1/discover?at=${latitude},${longitude}&q=centro+de+apoio&limit=10&apiKey=${HERE_API_KEY}`;

  const response = await axios.get(hereUrl);
  return response.data.items; // Retorna os locais encontrados
}

// Função para calcular a distância entre dois pontos (em km)
function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Raio da Terra em km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Rota para buscar pontos de apoio automaticamente usando Here API e cache no MongoDB
router.get("/nearby", async (req, res) => {
  const { latitude, longitude } = req.query;
  const searchRadius = 0.5; // Raio de busca em km para utilizar o cache

  if (!latitude || !longitude) {
    return res.status(400).json({ msg: "Latitude e longitude são obrigatórias." });
  }

  try {
    // Busca entradas de cache próximas considerando um raio (ex: 500 metros)
    const cachedResults = await GeoCache.find({
      latitude: { $gte: latitude - 0.005, $lte: latitude + 0.005 },
      longitude: { $gte: longitude - 0.005, $lte: longitude + 0.005 },
    });

    // Filtra resultados no cache pelo raio de proximidade usando Haversine
    const validCache = cachedResults.find((cache) => {
      const distance = haversineDistance(
        latitude,
        longitude,
        cache.latitude,
        cache.longitude
      );
      return distance <= searchRadius;
    });

    if (validCache) {
      // Se houver dados no cache dentro do raio, retorna-os diretamente
      return res.json(validCache.data);
    } else {
      // Se não houver no cache, faz a consulta à API Here
      const supportPoints = await getSupportPointsFromHere(latitude, longitude);

      if (supportPoints.length === 0) {
        return res.status(404).json({ msg: "Nenhum ponto de apoio encontrado." });
      }

      // Armazena o resultado no cache do MongoDB
      const newCacheEntry = new GeoCache({
        latitude,
        longitude,
        data: supportPoints,
      });

      await newCacheEntry.save();

      // Retorna os pontos de apoio encontrados
      res.json(supportPoints);
    }
  } catch (error) {
    console.error("Erro ao buscar pontos de apoio:", error.message);
    res.status(500).json({ msg: "Erro no servidor." });
  }
});

module.exports = router;

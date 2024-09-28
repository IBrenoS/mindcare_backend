const express = require("express");
const axios = require("axios");
const GeoCache = require("../models/geoCache");
const router = express.Router();

// Chave da API do Here Geocoding
const HERE_API_KEY = process.env.HERE_API_KEY;

// Função para buscar pontos de apoio pela Here API
async function getSupportPointsFromHere(latitude, longitude) {
  const hereUrl = `https://discover.search.hereapi.com/v1/discover?at=${latitude},${longitude}&q=clínica de saúde mental, CRAS, centro de apoio&limit=20&apiKey=${HERE_API_KEY}`;
  try {
    const response = await axios.get(hereUrl);
    // Filtra pontos relevantes e mapeia para o formato necessário
    return response.data.items
      .filter((item) => item.categories.some(category => category.id.includes('health-care') || category.id.includes('social-services')))
      .map((item) => ({
        id: item.id,
        title: item.title || "Ponto de Apoio",
        position: {
          lat: item.position.lat,
          lng: item.position.lng,
        },
        address: item.address,
        type: item.categories[0]?.id === "health-care" ? "public" : "private",
      }));
  } catch (error) {
    console.error("Erro na API Here:", error.message);
    throw new Error("Erro ao buscar pontos de apoio externos.");
  }
}

// Função para converter as coordenadas para números e tratar erros de entrada
function parseCoordinates(lat, lon) {
  const latitude = parseFloat(lat);
  const longitude = parseFloat(lon);

  if (isNaN(latitude) || isNaN(longitude)) {
    throw new Error("Invalid coordinates format");
  }
  return { latitude, longitude };
}

// Rota para buscar pontos de apoio automaticamente usando Here API e cache no MongoDB
router.get("/nearby", async (req, res) => {
  try {
    const { latitude: lat, longitude: lon } = req.query;

    // Converte e valida as coordenadas
    const { latitude, longitude } = parseCoordinates(lat, lon);

    // Verifica se a resposta já está no cache do MongoDB
    const cachedResult = await GeoCache.findOne({
      latitude: { $gte: latitude - 0.005, $lte: latitude + 0.005 },
      longitude: { $gte: longitude - 0.005, $lte: longitude + 0.005 },
    });

    if (cachedResult) {
      // Se houver dados no cache, retorna-os diretamente
      return res.json(cachedResult.data);
    } else {
      // Se não houver no cache, faz a consulta à API Here
      const supportPoints = await getSupportPointsFromHere(latitude, longitude);

      if (supportPoints.length === 0) {
        return res
          .status(404)
          .json({ msg: "Nenhum ponto de apoio encontrado." });
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
    res
      .status(500)
      .json({ msg: "Erro ao buscar pontos de apoio: " + error.message });
  }
});

module.exports = router;

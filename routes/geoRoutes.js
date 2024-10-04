const express = require("express");
const axios = require("axios");
const GeoCache = require("../models/geoCache");
const router = express.Router();
const rateLimit = require("express-rate-limit");

// Chave da API do Google Places (certifique-se de defini-la nas variáveis de ambiente)
const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;

// Função para arredondar coordenadas para melhorar a eficiência do cache
function roundCoordinate(coordinate, precision = 3) {
  return parseFloat(coordinate.toFixed(precision));
}

// Configuração do limitador de taxa
const nearbyLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 50, // Limite de 50 solicitações por IP
  message: {
    msg: "Muitas solicitações na rota /nearby. Por favor, tente novamente mais tarde.",
  },
});

// Função para calcular a distância entre dois pontos (usando a fórmula de Haversine)
function getDistance(lat1, lon1, lat2, lon2) {
  const toRad = (value) => (value * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distância em quilômetros
}

// Função para buscar pontos de apoio pela API do Google Places
async function getSupportPointsFromGoogle(
  latitude,
  longitude,
  queries,
  nextPageToken
) {
  let results = [];

  for (const query of queries) {
    let googleUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(
      query
    )}&location=${latitude},${longitude}&radius=5000&key=${GOOGLE_PLACES_API_KEY}`;

    if (nextPageToken) {
      googleUrl += `&pagetoken=${nextPageToken}`;
    }

    try {
      // Logando a URL exata da requisição para depuração
      console.log("Requisitando ao Google Places com a URL:", googleUrl);

      const response = await axios.get(googleUrl);

      // Logar a resposta completa da API do Google Places para análise
      console.log("Resposta da API do Google Places:", response.data);

      // Verificar se há erros na resposta
      if (response.data.error_message) {
        console.error("Erro na resposta da API do Google:", response.data.error_message);
      }

      // Mapear resultados relevantes
      const queryResults = response.data.results.map((item) => {
        const photos =
          item.photos?.map((photo) => {
            return {
              url: `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${photo.photo_reference}&key=${GOOGLE_PLACES_API_KEY}`,
              attributions: photo.html_attributions,
            };
          }) || [];

        const openingHours =
          item.opening_hours?.weekday_text || "Horários não disponíveis";
        const openNow = item.opening_hours?.open_now
          ? "Aberto agora"
          : "Fechado no momento";

        return {
          id: item.place_id,
          title: item.name || "Ponto de Apoio",
          position: {
            lat: item.geometry.location.lat,
            lng: item.geometry.location.lng,
          },
          address: item.formatted_address || "Endereço não disponível",
          type: item.types.includes("health") ? "public" : "private",
          rating: item.rating || "Sem avaliação",
          opening_hours: {
            text: openingHours,
            status: openNow,
          },
          photos: photos,
        };
      });

      results = [...results, ...queryResults];
    } catch (error) {
      console.error("Erro na API Google Places:", error.message);
      throw new Error("Erro ao buscar pontos de apoio externos.");
    }
  }

  return {
    results,
    nextPageToken: nextPageToken || null,
  };
}

// Rota atualizada com mais logs
router.get("/nearby", nearbyLimiter, async (req, res, next) => {
  try {
    const {
      latitude: lat,
      longitude: lon,
      query,
      page = 1,
      limit = 20,
      type,
      sortBy,
    } = req.query;

    // Adicionar logs para cada parâmetro recebido
    console.log("Parâmetros recebidos:");
    console.log("Latitude:", lat);
    console.log("Longitude:", lon);
    console.log("Query:", query);
    console.log("Type:", type);
    console.log("SortBy:", sortBy);

    let latitude = parseFloat(lat);
    let longitude = parseFloat(lon);
    const pageNumber = parseInt(page);
    const limitNumber = parseInt(limit);

    // Validação das coordenadas
    if (isNaN(latitude) || isNaN(longitude)) {
      console.error("Coordenadas inválidas:", latitude, longitude);
      return res.status(400).json({ msg: "Coordenadas inválidas." });
    }

    // Arredondar coordenadas para otimizar o cache
    latitude = roundCoordinate(latitude);
    longitude = roundCoordinate(longitude);

    console.log("Coordenadas arredondadas:", latitude, longitude);

    let queries = ["CRAS", "Clínicas de Saúde Mental"];
    if (query) {
      queries = query.split(",").map((q) => q.trim());
    }
    console.log("Queries a serem buscadas:", queries);

    // Fazer chamada à API do Google Places
    const { results } = await getSupportPointsFromGoogle(
      latitude,
      longitude,
      queries
    );
    console.log("Resultados da API do Google Places:", results);

    if (results.length === 0) {
      console.warn("Nenhum ponto de apoio encontrado.");
      return res.status(200).json({
        msg: "Nenhum ponto de apoio encontrado.",
        results: [],
        totalResults: 0,
        page: pageNumber,
        totalPages: 0,
      });
    }

    res.json({
      totalResults: results.length,
      page: pageNumber,
      totalPages: Math.ceil(results.length / limitNumber),
      results: results.slice(0, limitNumber), // Paginando resultados
    });
  } catch (error) {
    console.error("Erro ao buscar pontos de apoio:", error.message);
    next(error);
  }
});

module.exports = router;

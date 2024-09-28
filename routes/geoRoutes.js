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

async function getSupportPointsFromGoogle(
  latitude,
  longitude,
  queries,
  nextPageToken
) {
  let allResults = [];

  for (const query of queries) {
    let googleUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(
      query
    )}&location=${latitude},${longitude}&radius=5000&key=${GOOGLE_PLACES_API_KEY}`;

    if (nextPageToken) {
      googleUrl += `&pagetoken=${nextPageToken}`;
    }

    try {
      const response = await axios.get(googleUrl);

      const results = response.data.results.map((item) => ({
        id: item.place_id,
        title: item.name || "Ponto de Apoio",
        position: {
          lat: item.geometry.location.lat,
          lng: item.geometry.location.lng,
        },
        address: item.formatted_address,
        type: item.types.includes("health") ? "public" : "private",
        rating: item.rating || null,
        opening_hours: item.opening_hours || null,
        photos: item.photos || [],
      }));

      allResults = allResults.concat(results);
    } catch (error) {
      console.error("Erro na API Google Places:", error.message);
      throw new Error("Erro ao buscar pontos de apoio externos.");
    }
  }

  // Remover duplicatas
  const uniqueResults = Array.from(
    new Map(allResults.map((item) => [item.id, item])).values()
  );

  return {
    results: uniqueResults,
    nextPageToken: null,
  };
}

// Rota atualizada
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

    let latitude = parseFloat(lat);
    let longitude = parseFloat(lon);
    const pageNumber = parseInt(page);
    const limitNumber = parseInt(limit);

    if (isNaN(latitude) || isNaN(longitude)) {
      return res.status(400).json({ msg: "Coordenadas inválidas." });
    }

    // Arredondar coordenadas para otimizar o cache
    latitude = roundCoordinate(latitude);
    longitude = roundCoordinate(longitude);

    // Definir os termos de busca
    let queries = ["CRAS", "Clínicas de Saúde Mental"];
    if (query) {
      queries = query.split(",").map((q) => q.trim());
    }

    // Chave do cache
    const cacheKey = {
      latitude,
      longitude,
      queries,
    };

    // Tentar recuperar dados do cache
    const cacheEntry = await GeoCache.findOne(cacheKey);

    let supportPoints;
    if (cacheEntry) {
      // Dados encontrados no cache
      supportPoints = cacheEntry.data;
    } else {
      // Nenhum cache encontrado, fazer chamada à API do Google Places
      const { results } = await getSupportPointsFromGoogle(
        latitude,
        longitude,
        queries
      );

      if (results.length === 0) {
        return res
          .status(404)
          .json({ msg: "Nenhum ponto de apoio encontrado." });
      }

      // Armazenar resultados no cache
      const newCacheEntry = new GeoCache({
        latitude,
        longitude,
        queries,
        data: results,
      });

      await newCacheEntry.save();

      supportPoints = results;
    }

    // Adicionar cálculo de distância a cada ponto
    supportPoints = supportPoints.map((point) => {
      const distance = getDistance(
        latitude,
        longitude,
        point.position.lat,
        point.position.lng
      );
      return { ...point, distance };
    });

    // Filtrar por tipo, se especificado
    if (type) {
      supportPoints = supportPoints.filter((point) => point.type === type);
    }

    // Ordenar resultados, se especificado
    if (sortBy === "distance") {
      supportPoints.sort((a, b) => a.distance - b.distance);
    } else if (sortBy === "rating") {
      supportPoints.sort((a, b) => b.rating - a.rating);
    }

    // Implementar paginação
    const startIndex = (pageNumber - 1) * limitNumber;
    const endIndex = startIndex + limitNumber;
    const paginatedResults = supportPoints.slice(startIndex, endIndex);

    // Retornar resultados paginados
    res.json({
      totalResults: supportPoints.length,
      page: pageNumber,
      totalPages: Math.ceil(supportPoints.length / limitNumber),
      results: paginatedResults,
    });
  } catch (error) {
    console.error("Erro ao buscar pontos de apoio:", error.message);
    next(error);
  }
});

module.exports = router;

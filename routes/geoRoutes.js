const express = require("express");
const axios = require("axios");
const GeoCache = require("../models/geoCache");
const router = express.Router();
const rateLimit = require("express-rate-limit");
const { query, validationResult } = require("express-validator");

// Chave da API do Google Places
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
  const R = 6371; // Raio da Terra em quilômetros
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
      const response = await axios.get(googleUrl);

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
          distance: 0,
        };
      });

      results = [...results, ...queryResults];
    } catch (error) {
      if (error.response) {
        // Erro vindo da API
        console.error(
          `Erro na API Google Places: ${error.response.data.error_message}`
        );
      } else {
        // Outro erro (ex: falha de rede)
        console.error(
          `Erro de rede ao acessar Google Places API: ${error.message}`
        );
      }
      throw new Error("Erro ao buscar pontos de apoio externos.");
    }
  }

  return {
    results,
    nextPageToken: nextPageToken || null,
  };
}

// Validação de parâmetros com express-validator
const validateQueryParams = [
  query("latitude")
    .isFloat({ min: -90, max: 90 })
    .withMessage("Latitude inválida"),
  query("longitude")
    .isFloat({ min: -180, max: 180 })
    .withMessage("Longitude inválida"),
  query("page").optional().isInt({ min: 1 }).withMessage("Página inválida"),
  query("limit").optional().isInt({ min: 1 }).withMessage("Limite inválido"),
];

// Rota para buscar pontos de apoio
router.get(
  "/nearby",
  nearbyLimiter,
  validateQueryParams,
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

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

      // Arredondar coordenadas para otimizar o cache
      latitude = roundCoordinate(latitude);
      longitude = roundCoordinate(longitude);

      // Definir os termos de busca
      let queries = [
        "CRAS",
        "Centro de Referência de Assistência Social",
        "Clínicas Psicológicas",
        "Psicólogo",
        "Psiquiátrico",
        "Psiquiatra",
      ];
      if (query) {
        queries = query.split(",").map((q) => q.trim());
      }

      // Chave do cache
      const cacheKey = {
        location: {
          type: "Point",
          coordinates: [longitude, latitude],
        },
        queries,
      };

      // Tentar recuperar dados do cache
      const cacheEntry = await GeoCache.findOne(cacheKey);

      let supportPoints;
      if (cacheEntry) {
        supportPoints = cacheEntry.data;
      } else {
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

        const newCacheEntry = new GeoCache({
          location: {
            type: "Point",
            coordinates: [longitude, latitude], // Corrigir a inserção das coordenadas
          },
          queries,
          data: results,
          createdAt: new Date(), // TTL para expiração do cache
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
        supportPoints.sort((a, b) => (b.rating || 0) - (a.rating || 0));
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
  }
);

module.exports = router;

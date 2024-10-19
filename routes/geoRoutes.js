const express = require("express");
const axios = require("axios");
const GeoCache = require("../models/geoCache");
const router = express.Router();
const rateLimit = require("express-rate-limit");
require("dotenv").config();

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
    )}&location=${latitude},${longitude}&radius=10000&fields=place_id,name,geometry,formatted_address,photos,opening_hours,rating&key=${GOOGLE_PLACES_API_KEY}`;

    if (nextPageToken) {
      googleUrl += `&pagetoken=${nextPageToken}`;
    }

    console.log(`Fazendo requisição para: ${googleUrl}`);

    try {
      const response = await axios.get(googleUrl);

      // Loga a resposta completa formatada como JSON
      console.log(
        `Resposta da API do Google: ${JSON.stringify(response.data, null, 2)}`
      );

      // Verifica se há resultados
      if (response.data.results && response.data.results.length > 0) {
        const queryResults = response.data.results.map((item) => {
          const photos =
            item.photos?.map((photo) => ({
              url: `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${photo.photo_reference}&key=${GOOGLE_PLACES_API_KEY}`,
              attributions: photo.html_attributions,
            })) || [];

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
      } else {
        console.log(
          "Nenhum resultado encontrado na resposta da API do Google."
        );
      }
    } catch (error) {
      console.error(`Erro na requisição para Google Places: ${error.message}`);
      throw new Error("Erro ao buscar pontos de apoio externos.");
    }
  }

  return {
    results,
    nextPageToken: nextPageToken || null,
  };
}

// Rota atualizada com suporte a paginação e busca dinâmica
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
      nextPageToken,
    } = req.query;

    let latitude = parseFloat(lat);
    let longitude = parseFloat(lon);
    const pageNumber = parseInt(page);
    const limitNumber = parseInt(limit);

    // Validação das coordenadas
    if (isNaN(latitude) || isNaN(longitude)) {
      return res.status(400).json({ msg: "Coordenadas inválidas." });
    }

    // Arredondar coordenadas para otimizar o cache
    latitude = roundCoordinate(latitude);
    longitude = roundCoordinate(longitude);

    // Definir os termos de busca com múltiplos filtros
    let queries = ["CRAS", "Clínicas Psiquiátricas", "Clínicas de Psicologia"];
    if (query) {
      queries = query.split(",").map((q) => q.trim());
    }

    // Validação do parâmetro "type"
    const validTypes = ["public", "private"];
    if (type && !validTypes.includes(type)) {
      return res
        .status(400)
        .json({ msg: "Tipo inválido. Use 'public' ou 'private'." });
    }

    // Validação do parâmetro "sortBy"
    const validSortOptions = ["distance", "rating"];
    if (sortBy && !validSortOptions.includes(sortBy)) {
      return res
        .status(400)
        .json({ msg: "Ordenação inválida. Use 'distance' ou 'rating'." });
    }

    // Chave do cache (não foi alterada, mas válida para otimização)
    const cacheKey = {
      latitude,
      longitude,
      queries,
    };

    // Tentar recuperar dados do cache
    const cacheEntry = await GeoCache.findOne(cacheKey);

    let supportPoints;
    let nextToken;
    if (cacheEntry) {
      // Dados encontrados no cache
      supportPoints = cacheEntry.data;
    } else {
      // Nenhum cache encontrado, fazer chamada à API do Google Places
      const { results, nextPageToken: token } =
        await getSupportPointsFromGoogle(
          latitude,
          longitude,
          queries,
          nextPageToken
        );
      nextToken = token;

      if (results.length === 0) {
        return res.status(200).json({
          msg: "Nenhum ponto de apoio encontrado.",
          results: [],
          totalResults: 0,
          page: pageNumber,
          totalPages: 0,
        });
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

    // Retornar resultados paginados com o próximo token de página
    res.json({
      totalResults: supportPoints.length,
      page: pageNumber,
      totalPages: Math.ceil(supportPoints.length / limitNumber),
      results: paginatedResults,
      nextPageToken: nextToken,
    });
  } catch (error) {
    console.error("Erro ao buscar pontos de apoio:", error.message);
    next(error);
  }
});

module.exports = router;

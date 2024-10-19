const axios = require("axios");
const Video = require("../models/video");
require("dotenv").config();

async function fetchYouTubeVideos(limit = 5) {
  const apiKey = process.env.YOUTUBE_API_KEY;
  const searchQuery = "meditação, saúde mental"; // Palavras-chave para buscar vídeos

  try {
    const videos = await fetchVideosFromYouTube(apiKey, searchQuery, limit);
    await saveVideos(videos, limit);
    console.log(`${videos.length} vídeos buscados e salvos com sucesso!`);
  } catch (err) {
    console.error("Erro ao buscar vídeos do YouTube:", err.message);
  }
}

async function fetchVideosFromYouTube(apiKey, searchQuery, limit) {
  const response = await axios.get(
    "https://www.googleapis.com/youtube/v3/search",
    {
      params: {
        part: "snippet",
        q: searchQuery,
        type: "video",
        maxResults: limit, // Define o limite de vídeos por requisição
        key: apiKey,
      },
    }
  );
  return response.data.items;
}

async function saveVideos(videos, batchSize) {
  let batch = [];
  for (const video of videos) {
    const newVideo = createVideo(video);
    batch.push(newVideo);

    if (batch.length === batchSize) {
      await saveBatch(batch);
      batch = []; // Limpa o batch após salvar
    }
  }

  // Salva qualquer vídeo restante
  if (batch.length > 0) {
    await saveBatch(batch);
  }
}

function createVideo(video) {
  return new Video({
    title: video.snippet.title,
    description: video.snippet.description,
    url: `https://www.youtube.com/watch?v=${video.id.videoId}`,
    thumbnail: video.snippet.thumbnails.default.url,
    status: "pending",
  });
}

async function saveBatch(batch) {
  try {
    await Video.insertMany(batch); // Usa inserção em lote para otimizar o desempenho
    console.log(`Lote de ${batch.length} vídeos salvo com sucesso!`);
  } catch (err) {
    console.error(
      "Erro ao salvar o lote de vídeos no banco de dados:",
      err.message
    );
  }
}

module.exports = fetchYouTubeVideos;

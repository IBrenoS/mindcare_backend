const axios = require("axios");
const Video = require("../models/video");

async function fetchYouTubeVideos() {
  const apiKey = process.env.YOUTUBE_API_KEY; // Sua chave de API do YouTube
  const searchQuery = "meditação, saúde mental"; // Palavras-chave para buscar vídeos

  try {
    const response = await axios.get(
      "https://www.googleapis.com/youtube/v3/search",
      {
        params: {
          part: "snippet",
          q: searchQuery,
          type: "video",
          maxResults: 5,
          key: apiKey,
        },
      }
    );

    const videos = response.data.items;

    // Salvando os vídeos no banco de dados
    for (const video of videos) {
      const newVideo = new Video({
        title: video.snippet.title,
        description: video.snippet.description,
        url: `https://www.youtube.com/watch?v=${video.id.videoId}`,
        thumbnail: video.snippet.thumbnails.default.url,
        status: "pending",
      });
      await newVideo.save();
    }
    console.log("Vídeos buscados e salvos com sucesso!");
  } catch (err) {
    console.error("Erro ao buscar vídeos do YouTube:", err.message);
  }
}

module.exports = fetchYouTubeVideos;

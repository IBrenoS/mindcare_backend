const mongoose = require("mongoose");

const geoCacheSchema = new mongoose.Schema({
  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true },
  query: { type: String, required: true },
  data: { type: Array, required: true },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 3600,
  },
});

module.exports = mongoose.model("GeoCache", geoCacheSchema);

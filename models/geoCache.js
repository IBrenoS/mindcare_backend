const mongoose = require('mongoose');

const GeoCacheSchema = new mongoose.Schema({
  latitude: Number,
  longitude: Number,
  queries: {
    type: [String],
    required: true,
  },
  data: Array,
});

module.exports = mongoose.model('GeoCache', GeoCacheSchema);

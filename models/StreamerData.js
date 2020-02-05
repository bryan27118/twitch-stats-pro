var mongoose = require("mongoose");

//TODO GROUP DATA BY MONTHS
var StreamerDataSchema = new mongoose.Schema({
  //Games ID
  streamerID: Number,
  //Time the data was taken
  timestamp: Date,
  //Number of viewers
  views: { type: Number, default: 0, get: v => Math.round(v), set: v => Math.round(v) },
  //Number of live channel
  followers: { type: Number, default: 0, get: v => Math.round(v), set: v => Math.round(v) }
});

var StreamerData = mongoose.model('StreamerData', StreamerDataSchema);

module.exports = StreamerData;
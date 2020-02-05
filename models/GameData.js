var mongoose = require("mongoose");

//TODO GROUP DATA BY MONTHS
var GameDataSchema = new mongoose.Schema({
  //Games ID
  gameID: Number,
  //Time the data was taken
  timestamp: Date,
  //Number of viewers
  viewers: { type: Number, default: 0, get: v => Math.round(v), set: v => Math.round(v) },
  //Number of live channel
  channels: { type: Number, default: 0, get: v => Math.round(v), set: v => Math.round(v) }
});

var GameData = mongoose.model('GameData', GameDataSchema);

module.exports = GameData;
var mongoose = require("mongoose");

//TODO GROUP DATA BY MONTHS
var StreamDataSchema = new mongoose.Schema({
  //Games ID
  streamID: Number,
  //Time the data was taken
  timestamp: Date,
  //Number of viewers
  viewers: { type: Number, default: 0, get: v => Math.round(v), set: v => Math.round(v) }
});

var StreamData = mongoose.model('StreamData', StreamDataSchema);

module.exports = StreamData;
var mongoose = require("mongoose");

var StreamerGamePointSchema = new mongoose.Schema({
  //Games ID
  gameID: Number,
  //Name of the streamer
  channel: String,
  //Number of points
  points: { type: Number, default: 0, get: v => Math.round(v), set: v => Math.round(v) }
});

StreamerGamePointSchema.methods.addPoints = function(points){
	this.points += points;
	this.save();
}

var StreamerGamePoint = mongoose.model('StreamerGamePoint', StreamerGamePointSchema);

module.exports = StreamerGamePoint;
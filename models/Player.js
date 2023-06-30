const mongoose = require("mongoose");

const playerSchema = mongoose.Schema({
  nickname: {
    required: true,
    type: String,
    trim: true,
//    default:"dnyan",
  },
  socketID: {
    type: String,
  },
  isPartyLeader: {
    type: Boolean,
    default: false,
  },
  points: {
    type: Number,
    default: 0,
  },
});

const playerModel = mongoose.model("Player", playerSchema);

module.exports = { playerModel, playerSchema };
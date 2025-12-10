// src/models/User.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, index: true },
    passwordHash: { type: String, required: true },

    // Packs this user owns
    ownedPackIds: [
      { type: mongoose.Schema.Types.ObjectId, ref: 'FlashcardPack' },
    ],

    // Packs this user has saved / subscribed to
    savedPackIds: [
      { type: mongoose.Schema.Types.ObjectId, ref: 'FlashcardPack' },
    ],

    // Friends list (other users)
    friendIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
);

const User = mongoose.model('User', userSchema);

module.exports = User;

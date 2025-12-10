// src/models/FlashcardPack.js
const mongoose = require('mongoose');
const VisibilityEnum = require('../utils/visibilityEnum');

const flashcardSchema = new mongoose.Schema(
  {
    // Allow empty/uninitialized cards to be saved
    question: {
      type: String,
      default: '',
    },
    answer: {
      type: String,
      default: '',
    },
    hint: { type: String, default: '' },

    positionX: { type: Number, default: 0 },
    positionY: { type: Number, default: 0 },
    width: { type: Number, default: 200 },
    height: { type: Number, default: 120 },
  },
  { _id: true } // keep _id for cardId
);

const flashcardPackSchema = new mongoose.Schema(
  {
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: { type: String, required: true },
    description: { type: String, default: '' },

    visibility: {
      type: String,
      enum: Object.values(VisibilityEnum),
      default: VisibilityEnum.PRIVATE,
      index: true,
    },

    cards: {
      type: [flashcardSchema],
      validate: {
        validator: function (cards) {
          return cards.length <= 64;
        },
        message: 'A flashcard pack cannot contain more than 64 cards.',
      },
    },

    
    subscriberIds: [
      { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    ],
  },
  { timestamps: true }
);

/**
 * Change visibility and auto-unsubscribe non-owner subscribers
 * when going PUBLIC -> PRIVATE.
 *
 * @param {string} newVisibility
 * @param {Model} UserModel

flashcardPackSchema.methods.changeVisibilityAndDetach = async function (
  newVisibility,
  UserModel
) {
  const oldVisibility = this.visibility;
  this.visibility = newVisibility;

  // Make sure subscriberIds is always an array
  if (!Array.isArray(this.subscriberIds)) {
    this.subscriberIds = [];
  }

  if (
    oldVisibility === VisibilityEnum.PUBLIC &&
    newVisibility === VisibilityEnum.PRIVATE
  ) {
    const packId = this._id;
    const ownerIdStr = this.ownerId.toString();

    const nonOwnerSubscriberIds = this.subscriberIds.filter(
      (uid) => uid.toString() !== ownerIdStr
    );

    if (nonOwnerSubscriberIds.length > 0) {
      // Remove pack from saved lists of non-owner subscribers
      await UserModel.updateMany(
        { _id: { $in: nonOwnerSubscriberIds } },
        { $pull: { savedPackIds: packId } }
      );
    }

    // Keep only owner in subscriberIds (or you could also clear it entirely)
    this.subscriberIds = this.subscriberIds.filter(
      (uid) => uid.toString() === ownerIdStr
    );
  }

  return this.save();
};

const FlashcardPack = mongoose.model('FlashcardPack', flashcardPackSchema);

module.exports = {
  FlashcardPack,
  flashcardSchema,
};

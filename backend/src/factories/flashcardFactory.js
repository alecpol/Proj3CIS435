
const { Types } = require('mongoose');

const defaultCardSize = {
  width: 200,
  height: 120,
};

const flashcardFactory = {
  create(question, answer, hint = '', x = 0, y = 0) {
    return {
      _id: new Types.ObjectId(),
      question,
      answer,
      hint,
      positionX: x,
      positionY: y,
      width: defaultCardSize.width,
      height: defaultCardSize.height,
    };
  },
};

module.exports = flashcardFactory;

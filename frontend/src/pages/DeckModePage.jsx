// src/pages/DeckModePage.jsx
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getPack } from '../api/packs';

function shuffleArray(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function DeckModePage() {
  const { packId } = useParams();
  const navigate = useNavigate();

  const [pack, setPack] = useState(null);
  const [order, setOrder] = useState([]); // indices into pack.cards
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [error, setError] = useState('');

  async function loadPack() {
    setError('');
    try {
      const data = await getPack(packId);
      setPack(data);
      if (data.cards && data.cards.length > 0) {
        const indices = data.cards.map((_, i) => i);
        setOrder(indices);
        setCurrentIndex(0);
        setShowAnswer(false);
      }
    } catch (err) {
      setError(err.message || 'Failed to load pack');
    }
  }

  useEffect(() => {
    loadPack();
  }, [packId]);

  function handleFlip() {
    setShowAnswer((prev) => !prev);
  }

  function handleNext() {
    if (!order.length) return;
    // Move current card index to bottom
    setOrder((prevOrder) => {
      if (prevOrder.length <= 1) return prevOrder;
      const [first, ...rest] = prevOrder;
      return [...rest, first];
    });
    setCurrentIndex(0);
    setShowAnswer(false);
  }

  function handleShuffle() {
    setOrder((prevOrder) => shuffleArray(prevOrder));
    setCurrentIndex(0);
    setShowAnswer(false);
  }

  if (!pack && !error) {
    return <div style={{ padding: '1rem' }}>Loading deck...</div>;
  }

  if (error && !pack) {
    return (
      <div style={{ padding: '1rem' }}>
        <p style={{ color: 'red' }}>{error}</p>
        <button onClick={() => navigate('/dashboard')}>Back to Dashboard</button>
      </div>
    );
  }

  const hasCards = pack.cards && pack.cards.length > 0;
  const currentCardIndex = order[0];
  const currentCard = hasCards ? pack.cards[currentCardIndex] : null;

  return (
    <div style={{ padding: '1rem' }}>
      <button onClick={() => navigate('/dashboard')}>Back</button>
      <h1>Deck Mode – {pack.title}</h1>

      {!hasCards && <p>No cards in this pack.</p>}

      {hasCards && currentCard && (
        <div
          style={{
            border: '1px solid #333',
            padding: '2rem',
            marginTop: '1rem',
            maxWidth: 600,
          }}
        >
          <p>
            Card {currentCardIndex + 1} of {pack.cards.length}
          </p>
          <h2>{showAnswer ? 'Answer' : 'Question'}</h2>
          <p style={{ fontSize: '1.2rem' }}>
            {showAnswer ? currentCard.answer : currentCard.question}
          </p>
          {currentCard.hint && !showAnswer && (
            <p style={{ fontStyle: 'italic' }}>Hint: {currentCard.hint}</p>
          )}

          <div style={{ marginTop: '1rem' }}>
            <button onClick={handleFlip} style={{ marginRight: '0.5rem' }}>
              Flip
            </button>
            <button onClick={handleNext} style={{ marginRight: '0.5rem' }}>
              Next (send to bottom)
            </button>
            <button onClick={handleShuffle}>Shuffle</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default DeckModePage;

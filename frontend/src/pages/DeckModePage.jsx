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
    return (
      <div className="page-shell auth-card">
        <p className="helper-text">Loading deck...</p>
      </div>
    );
  }

  if (error && !pack) {
    return (
      <div className="page-shell auth-card" style={{ alignItems: 'flex-start' }}>
        <p className="notice">{error}</p>
        <button className="btn secondary" onClick={() => navigate('/dashboard')}>
          Back to Dashboard
        </button>
      </div>
    );
  }

  const hasCards = pack.cards && pack.cards.length > 0;
  const currentCardIndex = order[0];
  const currentCard = hasCards ? pack.cards[currentCardIndex] : null;

  return (
    <div className="page-shell" style={{ alignItems: 'center' }}>
      <header className="page-header">
        <div>
          <h1 className="page-title">Deck Mode – {pack.title}</h1>
          <p className="subtitle">Flip, shuffle, and focus in a centered workspace.</p>
        </div>
        <button className="btn secondary" onClick={() => navigate('/dashboard')}>
          Back
        </button>
      </header>

      {!hasCards && <p className="helper-text">No cards in this pack.</p>}

      {hasCards && currentCard && (
        <div className="deck-card">
          <p className="helper-text" style={{ marginBottom: '0.5rem' }}>
            Card {currentCardIndex + 1} of {pack.cards.length}
          </p>
          <h2 style={{ marginTop: 0 }}>{showAnswer ? 'Answer' : 'Question'}</h2>
          <p style={{ fontSize: '1.2rem', margin: '0.5rem 0' }}>
            {showAnswer ? currentCard.answer : currentCard.question}
          </p>
          {currentCard.hint && !showAnswer && (
            <p style={{ fontStyle: 'italic', color: '#cbd5e1' }}>
              Hint: {currentCard.hint}
            </p>
          )}

          <div className="button-row" style={{ marginTop: '1rem' }}>
            <button className="btn" onClick={handleFlip}>
              Flip
            </button>
            <button className="btn secondary" onClick={handleNext}>
              Next (send to bottom)
            </button>
            <button className="btn secondary" onClick={handleShuffle}>
              Shuffle
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default DeckModePage;

// src/pages/EditorPage.jsx
import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  getPack,
  updatePackCards,
  updatePackVisibility,
  updatePackMeta
} from "../api/packs";
import VisibilityEnum from "../utils/visibilityEnum";
import { socket } from "../utils/socket";

const MAX_CARDS = 64;

// Helper to deep clone cards for history snapshots
function cloneCards(cards) {
  if (!Array.isArray(cards)) return [];
  return cards.map((c) => ({ ...c }));
}

function EditorPage() {
  const { packId } = useParams();
  const navigate = useNavigate();

  const [pack, setPack] = useState(null);
  const [packTitle, setPackTitle] = useState("");
  const [cards, setCards] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(null);

  const [saving, setSaving] = useState(false);
  const [savingTitle, setSavingTitle] = useState(false);
  const [error, setError] = useState("");

  // Undo/redo stacks of card arrays
  const [history, setHistory] = useState([]);
  const [future, setFuture] = useState([]);

  // Save current cards into history before making a change
  const pushHistory = useCallback((prevCards) => {
    const snapshot = cloneCards(prevCards);
    setHistory((h) => [...h, snapshot]);
    setFuture([]); // Clear redo stack on new edits
  }, []);

  // Load pack from backend
  async function loadPack() {
    setError("");
    try {
      const data = await getPack(packId);
      setPack(data);
      setPackTitle(data.title || "");
      setCards(Array.isArray(data.cards) ? data.cards : []);
      setHistory([]);
      setFuture([]);
      setSelectedIndex(null);
    } catch (err) {
      setError(err.message || "Failed to load pack");
    }
  }

  // Initial load
  useEffect(() => {
    loadPack();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [packId]);

  // Socket.io: join room and listen for pack updates
  useEffect(() => {
    if (!packId) return;

    socket.emit("join-pack", packId);

    function handlePackUpdated(payload) {
      try {
        if (!payload || !payload.pack) return;
        if (payload.pack._id !== packId) return;

        setPack((prev) => ({
          ...(prev || {}),
          ...payload.pack
        }));
        setPackTitle(payload.pack.title || "");
        setCards(Array.isArray(payload.pack.cards) ? payload.pack.cards : []);
        setHistory([]);
        setFuture([]);
        setSelectedIndex(null);
      } catch (err) {
        console.error("Error handling pack-updated:", err);
      }
    }

    socket.on("pack-updated", handlePackUpdated);

    return () => {
      socket.emit("leave-pack", packId);
      socket.off("pack-updated", handlePackUpdated);
    };
  }, [packId]);

  function handleCardChange(field, value) {
    if (selectedIndex === null) return;
    setCards((prevCards) => {
      const prev = cloneCards(prevCards);
      pushHistory(prev);

      const updated = [...prevCards];
      updated[selectedIndex] = { ...updated[selectedIndex], [field]: value };
      return updated;
    });
  }

  function handleAddCard() {
    setError("");
    setCards((prevCards) => {
      const safePrev = Array.isArray(prevCards) ? prevCards : [];
      if (safePrev.length >= MAX_CARDS) {
        setError(`Cannot have more than ${MAX_CARDS} cards in a pack.`);
        return safePrev;
      }
      pushHistory(safePrev);

      return [
        ...safePrev,
        {
          question: "",
          answer: "",
          hint: "",
          width: 180,
          height: 120
        }
      ];
    });
  }

  function handleRemoveCard(index) {
    setCards((prevCards) => {
      const safePrev = Array.isArray(prevCards) ? prevCards : [];
      if (index < 0 || index >= safePrev.length) return safePrev;

      pushHistory(safePrev);
      const updated = safePrev.filter((_, i) => i !== index);
      return updated;
    });
    if (selectedIndex === index) {
      setSelectedIndex(null);
    } else if (selectedIndex > index) {
      setSelectedIndex((s) => s - 1);
    }
  }

  async function handleSaveCards() {
    setSaving(true);
    setError("");
    try {
      const updatedPack = await updatePackCards(packId, cards);
      setPack(updatedPack);
      setPackTitle(updatedPack.title || "");
      setCards(Array.isArray(updatedPack.cards) ? updatedPack.cards : []);
      setHistory([]);
      setFuture([]);
    } catch (err) {
      setError(err.message || "Failed to save cards");
    } finally {
      setSaving(false);
    }
  }

  async function handleVisibilityChange(e) {
    const newVisibility = e.target.value;
    setError("");
    try {
      const updatedPack = await updatePackVisibility(packId, newVisibility);
      setPack(updatedPack);
      setPackTitle(updatedPack.title || "");
    } catch (err) {
      setError(err.message || "Failed to change visibility");
    }
  }

  async function handleSaveTitle() {
    if (!pack) return;
    setSavingTitle(true);
    setError("");
    try {
      const updatedPack = await updatePackMeta(packId, {
        title: packTitle
      });
      setPack(updatedPack);
      setPackTitle(updatedPack.title || "");
    } catch (err) {
      setError(err.message || "Failed to update title");
    } finally {
      setSavingTitle(false);
    }
  }

  function handleUndo() {
    if (history.length === 0) return;

    const lastSnapshot = history[history.length - 1];
    const newHistory = history.slice(0, -1);
    const currentSnapshot = cloneCards(cards);

    setHistory(newHistory);
    setFuture([currentSnapshot, ...future]);
    setCards(cloneCards(lastSnapshot));
  }

  function handleRedo() {
    if (future.length === 0) return;

    const [nextSnapshot, ...rest] = future;
    const currentSnapshot = cloneCards(cards);

    setHistory([...history, currentSnapshot]);
    setFuture(rest);
    setCards(cloneCards(nextSnapshot));
  }

  if (!pack && !error) {
    return <div style={{ padding: "1rem" }}>Loading pack...</div>;
  }

  if (error && !pack) {
    return (
      <div style={{ padding: "1rem" }}>
        <p style={{ color: "red" }}>{error}</p>
        <button onClick={() => navigate("/dashboard")}>Back to Dashboard</button>
      </div>
    );
  }

  const selectedCard = selectedIndex !== null ? cards[selectedIndex] : null;

  return (
    <div className="page-shell editor-shell">
      <header className="page-header">
        <div>
          <h2 className="page-title" style={{ marginBottom: "0.25rem" }}>
            Pack Editor
          </h2>
          <p className="subtitle">Shape your cards in a focused workspace.</p>
        </div>
        <button className="btn secondary" onClick={() => navigate("/dashboard")}>
          Back
        </button>
      </header>

      <div className="editor-layout">
        <aside className="editor-sidebar">
          {/* Editable title field */}
          <div>
            <label className="label">
              Pack Title:
              <input
                type="text"
                value={packTitle}
                onChange={(e) => setPackTitle(e.target.value)}
              />
            </label>
            <div className="button-row" style={{ marginTop: "0.35rem" }}>
              <button className="btn secondary" onClick={handleSaveTitle} disabled={savingTitle}>
                {savingTitle ? "Saving..." : "Save Title"}
              </button>
            </div>
          </div>

          <label className="label" style={{ marginTop: "0.5rem" }}>
            Visibility:
            <select value={pack.visibility} onChange={handleVisibilityChange}>
              <option value={VisibilityEnum.PRIVATE}>PRIVATE</option>
              <option value={VisibilityEnum.PUBLIC}>PUBLIC</option>
            </select>
          </label>

          <div className="button-row" style={{ marginTop: "0.75rem" }}>
            <button className="btn" onClick={handleAddCard}>
              Add Card
            </button>
            <button className="btn secondary" onClick={handleSaveCards} disabled={saving}>
              {saving ? "Saving..." : "Save Cards"}
            </button>
          </div>

          <div className="button-row" style={{ marginTop: "0.5rem" }}>
            <button className="btn secondary" onClick={handleUndo} disabled={history.length === 0}>
              Undo
            </button>
            <button className="btn secondary" onClick={handleRedo} disabled={future.length === 0}>
              Redo
            </button>
          </div>

          {error && <p className="notice" style={{ marginTop: "0.5rem" }}>{error}</p>}

          <div style={{ marginTop: "0.75rem" }}>
            <h3 style={{ margin: 0 }}>
              Cards ({cards.length}/{MAX_CARDS})
            </h3>
          </div>

          {/* List of cards for quick selection */}
          <div style={{ marginTop: "0.5rem" }}>
            {cards.map((card, index) => (
              <div
                key={card._id || index}
                className={
                  selectedIndex === index ? "tile flashcard selected" : "tile flashcard"
                }
                style={{ padding: "0.5rem", marginBottom: "0.35rem" }}
                onClick={() => setSelectedIndex(index)}
              >
                Card {index + 1} –
                {card.question && card.question.trim().length > 0
                  ? ` ${card.question}`
                  : " (empty)"}
              </div>
            ))}
          </div>
        </aside>

        {/* Right side (80%) – responsive grid of cards */}
        <main className="editor-main">
          <h2 style={{ marginTop: 0 }}>Pack Cards</h2>
          <p className="helper-text" style={{ marginTop: 0, marginBottom: "0.75rem" }}>
            Cards are auto-arranged to fit your screen size. Click a card to edit
            it on the left.
          </p>

          <div className="card-grid">
            {cards.map((card, index) => {
              const isSelected = selectedIndex === index;

              return (
                <div
                  key={card._id || index}
                  onClick={() => setSelectedIndex(index)}
                  className={isSelected ? "flashcard selected" : "flashcard"}
                  style={{ minHeight: 150, fontSize: "0.95rem" }}
                >
                  <div>
                    <div style={{ fontWeight: "bold", marginBottom: "0.35rem" }}>
                      Card {index + 1}
                    </div>

                    <div style={{ marginBottom: "0.25rem" }}>
                      <strong>Q:</strong>{" "}
                      {card.question && card.question.trim().length > 0
                        ? card.question
                        : "(no question yet)"}
                    </div>

                    <div style={{ marginBottom: "0.25rem" }}>
                      <strong>A:</strong>{" "}
                      {card.answer && card.answer.trim().length > 0
                        ? card.answer
                        : "(no answer yet)"}
                    </div>

                    <div style={{ marginTop: "0.25rem", color: "#cbd5e1" }}>
                      <strong>Hint:</strong>{" "}
                      {card.hint && card.hint.trim().length > 0
                        ? card.hint
                        : "(no hint yet)"}
                    </div>
                  </div>
                </div>
              );
            })}

            {cards.length === 0 && (
              <div className="tile" style={{ textAlign: "center" }}>
                No cards yet. Click “Add Card” on the left to get started.
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

export default EditorPage;

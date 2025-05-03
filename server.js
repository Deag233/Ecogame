const express = require('express');
const cors = require('cors');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// In-memory storage
const players = new Map();

// API Routes
app.post('/api/players', (req, res) => {
    try {
        const { telegramId, username, gameState } = req.body;
        
        const player = {
            telegramId,
            username,
            score: gameState.score,
            multiplier: gameState.multiplier,
            upgrades: gameState.upgrades,
            lastUpdated: new Date()
        };
        
        players.set(telegramId, player);
        res.json(player);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/players/:telegramId', (req, res) => {
    try {
        const player = players.get(req.params.telegramId);
        if (!player) {
            return res.status(404).json({ error: 'Player not found' });
        }
        res.json(player);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/leaderboard', (req, res) => {
    try {
        const leaderboard = Array.from(players.values())
            .sort((a, b) => b.score - a.score)
            .slice(0, 10)
            .map(({ username, score }) => ({ username, score }));
        res.json(leaderboard);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
}); 
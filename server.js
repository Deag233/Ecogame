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
        console.log('Received save request:', req.body);
        const { telegramId, username, gameState } = req.body;
        
        if (!telegramId || !gameState) {
            console.error('Missing required fields:', { telegramId, gameState });
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const player = {
            telegramId,
            username: username || 'Anonymous',
            score: gameState.score || 0,
            multiplier: gameState.multiplier || 1,
            upgrades: gameState.upgrades || {
                autoClicker: { level: 0, cost: 10, baseCost: 10, clicksPerSecond: 0 },
                clickPower: { level: 0, cost: 50, baseCost: 50, power: 1 }
            },
            lastUpdated: new Date()
        };
        
        players.set(telegramId, player);
        console.log('Saved player data:', player);
        res.json(player);
    } catch (error) {
        console.error('Error saving player:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/players/:telegramId', (req, res) => {
    try {
        console.log('Received load request for player:', req.params.telegramId);
        const player = players.get(req.params.telegramId);
        if (!player) {
            console.log('Player not found:', req.params.telegramId);
            return res.status(404).json({ error: 'Player not found' });
        }
        console.log('Returning player data:', player);
        res.json(player);
    } catch (error) {
        console.error('Error loading player:', error);
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
        console.error('Error getting leaderboard:', error);
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
}); 
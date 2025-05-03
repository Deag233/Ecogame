const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/econoch';
mongoose.connect(MONGODB_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err));

// Player Schema
const playerSchema = new mongoose.Schema({
    telegramId: { type: String, required: true, unique: true },
    username: { type: String, default: 'Anonymous' },
    score: { type: Number, default: 0 },
    multiplier: { type: Number, default: 1 },
    upgrades: {
        autoClicker: {
            level: { type: Number, default: 0 },
            cost: { type: Number, default: 10 },
            baseCost: { type: Number, default: 10 },
            clicksPerSecond: { type: Number, default: 0 }
        },
        clickPower: {
            level: { type: Number, default: 0 },
            cost: { type: Number, default: 50 },
            baseCost: { type: Number, default: 50 },
            power: { type: Number, default: 1 }
        }
    },
    lastUpdated: { type: Date, default: Date.now }
});

const Player = mongoose.model('Player', playerSchema);

// API Routes
app.post('/api/players', async (req, res) => {
    try {
        console.log('Received save request body:', JSON.stringify(req.body, null, 2));
        const { telegramId, username, gameState } = req.body;
        
        if (!telegramId) {
            console.error('Missing telegramId in request');
            return res.status(400).json({ error: 'Missing telegramId' });
        }

        if (!gameState) {
            console.error('Missing gameState in request');
            return res.status(400).json({ error: 'Missing gameState' });
        }

        const playerData = {
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
        
        console.log('Prepared player data:', JSON.stringify(playerData, null, 2));
        
        const player = await Player.findOneAndUpdate(
            { telegramId },
            playerData,
            { new: true, upsert: true }
        );
        
        console.log('Saved player data:', JSON.stringify(player, null, 2));
        res.json(player);
    } catch (error) {
        console.error('Error saving player:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/players/:telegramId', async (req, res) => {
    try {
        console.log('Received load request for player:', req.params.telegramId);
        const player = await Player.findOne({ telegramId: req.params.telegramId });
        
        if (!player) {
            console.log('Player not found:', req.params.telegramId);
            return res.status(404).json({ error: 'Player not found' });
        }
        
        console.log('Returning player data:', JSON.stringify(player, null, 2));
        res.json(player);
    } catch (error) {
        console.error('Error loading player:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/leaderboard', async (req, res) => {
    try {
        const leaderboard = await Player.find()
            .sort({ score: -1 })
            .limit(10)
            .select('username score -_id');
            
        console.log('Returning leaderboard:', JSON.stringify(leaderboard, null, 2));
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
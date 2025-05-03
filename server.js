const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// File storage path
const STORAGE_FILE = path.join(__dirname, 'game_data.json');

// Load data from file
async function loadData() {
    try {
        const data = await fs.readFile(STORAGE_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        if (error.code === 'ENOENT') {
            // File doesn't exist, create empty storage
            await fs.writeFile(STORAGE_FILE, JSON.stringify({}));
            return {};
        }
        throw error;
    }
}

// Save data to file
async function saveData(data) {
    await fs.writeFile(STORAGE_FILE, JSON.stringify(data, null, 2));
}

// API Routes
app.post('/api/players', async (req, res) => {
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
        
        const data = await loadData();
        data[telegramId] = player;
        await saveData(data);
        
        console.log('Saved player data:', player);
        res.json(player);
    } catch (error) {
        console.error('Error saving player:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/players/:telegramId', async (req, res) => {
    try {
        console.log('Received load request for player:', req.params.telegramId);
        const data = await loadData();
        const player = data[req.params.telegramId];
        
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

app.get('/api/leaderboard', async (req, res) => {
    try {
        const data = await loadData();
        const leaderboard = Object.values(data)
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
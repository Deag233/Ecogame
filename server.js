const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// File storage path
const DATA_DIR = path.join(__dirname, 'data');
const STORAGE_FILE = path.join(DATA_DIR, 'game_data.json');

// Ensure data directory exists
async function ensureDataDir() {
    try {
        await fs.mkdir(DATA_DIR, { recursive: true });
        console.log('Data directory created/verified:', DATA_DIR);
    } catch (error) {
        console.error('Error creating data directory:', error);
        throw error;
    }
}

// Load data from file
async function loadData() {
    try {
        await ensureDataDir();
        console.log('Loading data from file:', STORAGE_FILE);
        const data = await fs.readFile(STORAGE_FILE, 'utf8');
        console.log('Loaded data:', data);
        return JSON.parse(data);
    } catch (error) {
        console.error('Error loading data:', error);
        if (error.code === 'ENOENT') {
            console.log('File does not exist, creating new storage');
            const emptyData = {};
            await fs.writeFile(STORAGE_FILE, JSON.stringify(emptyData, null, 2));
            return emptyData;
        }
        throw error;
    }
}

// Save data to file
async function saveData(data) {
    try {
        await ensureDataDir();
        console.log('Saving data to file:', STORAGE_FILE);
        console.log('Data to save:', JSON.stringify(data, null, 2));
        await fs.writeFile(STORAGE_FILE, JSON.stringify(data, null, 2));
        console.log('Data saved successfully');
    } catch (error) {
        console.error('Error saving data:', error);
        throw error;
    }
}

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

        const player = {
            telegramId,
            username: username || 'Anonymous',
            score: gameState.score || 0,
            multiplier: gameState.multiplier || 1,
            upgrades: gameState.upgrades || {
                autoClicker: { level: 0, cost: 10, baseCost: 10, clicksPerSecond: 0 },
                clickPower: { level: 0, cost: 50, baseCost: 50, power: 1 }
            },
            lastUpdated: new Date().toISOString()
        };
        
        console.log('Prepared player data:', JSON.stringify(player, null, 2));
        
        const data = await loadData();
        console.log('Current storage data:', JSON.stringify(data, null, 2));
        
        data[telegramId] = player;
        await saveData(data);
        
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
        const data = await loadData();
        console.log('Current storage data:', JSON.stringify(data, null, 2));
        
        const player = data[req.params.telegramId];
        
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
        const data = await loadData();
        console.log('Current storage data for leaderboard:', JSON.stringify(data, null, 2));
        
        const leaderboard = Object.values(data)
            .sort((a, b) => b.score - a.score)
            .slice(0, 10)
            .map(({ username, score }) => ({ username, score }));
            
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
    console.log('Data directory:', DATA_DIR);
    console.log('Storage file:', STORAGE_FILE);
}); 
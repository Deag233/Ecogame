const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Путь к файлу с данными
const DATA_FILE = path.join(__dirname, 'data', 'players.json');

// Функция для создания директории и файла, если они не существуют
async function ensureDataFile() {
    try {
        // Создаем директорию data, если её нет
        await fs.mkdir(path.join(__dirname, 'data'), { recursive: true });
        
        // Проверяем существование файла
        try {
            await fs.access(DATA_FILE);
        } catch {
            // Если файл не существует, создаем его с пустым массивом
            await fs.writeFile(DATA_FILE, JSON.stringify([], null, 2));
            console.log('Created new data file');
        }
    } catch (error) {
        console.error('Error ensuring data file:', error);
        throw error;
    }
}

// Функция для чтения данных
async function readData() {
    try {
        const data = await fs.readFile(DATA_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading data:', error);
        return [];
    }
}

// Функция для записи данных
async function writeData(data) {
    try {
        await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2));
        return true;
    } catch (error) {
        console.error('Error writing data:', error);
        return false;
    }
}

// Функция для создания бэкапа
async function createBackup() {
    try {
        const data = await readData();
        const backupDir = path.join(__dirname, 'backups');
        await fs.mkdir(backupDir, { recursive: true });
        
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupFile = path.join(backupDir, `backup-${timestamp}.json`);
        
        await fs.writeFile(backupFile, JSON.stringify({
            timestamp: new Date().toISOString(),
            totalPlayers: data.length,
            players: data
        }, null, 2));
        
        console.log(`Backup created: ${backupFile}`);
        return true;
    } catch (error) {
        console.error('Error creating backup:', error);
        return false;
    }
}

// Создаем бэкап каждый час
setInterval(createBackup, 3600000);

// Routes
app.get('/api/status', async (req, res) => {
    try {
        await ensureDataFile();
        res.json({
            status: 'ok',
            timestamp: new Date().toISOString(),
            storage: 'json'
        });
    } catch (error) {
        console.error('Status check error:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});

app.get('/api/players/:telegramId', async (req, res) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] GET /api/players/${req.params.telegramId}`);
    console.log('Request headers:', req.headers);
    console.log('Request query:', req.query);
    console.log('Request body:', req.body);

    try {
        await ensureDataFile();
        const players = await readData();
        console.log('Current players in database:', players);
        
        const player = players.find(p => p.telegramId === req.params.telegramId);
        console.log('Found player:', player);
        
        if (!player) {
            console.log(`Player not found: ${req.params.telegramId}`);
            return res.status(404).json({
                error: 'Player not found',
                timestamp,
                telegramId: req.params.telegramId
            });
        }

        console.log(`Player found: ${req.params.telegramId}`);
        res.json(player);
    } catch (error) {
        console.error('Error fetching player:', error);
        console.error('Error stack:', error.stack);
        res.status(500).json({
            error: 'Internal server error',
            message: error.message,
            timestamp,
            telegramId: req.params.telegramId
        });
    }
});

app.post('/api/players', async (req, res) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] POST /api/players`);
    console.log('Request headers:', req.headers);
    console.log('Request body:', req.body);

    try {
        await ensureDataFile();
        const players = await readData();
        console.log('Current players in database:', players);
        
        // Проверяем, существует ли уже игрок с таким telegramId
        const existingPlayer = players.find(p => p.telegramId === req.body.telegramId);
        if (existingPlayer) {
            console.log('Player already exists:', existingPlayer);
            return res.status(400).json({
                error: 'Player already exists',
                timestamp,
                telegramId: req.body.telegramId
            });
        }

        // Создаем нового игрока
        const newPlayer = {
            ...req.body,
            createdAt: new Date().toISOString()
        };
        console.log('Creating new player:', newPlayer);
        
        players.push(newPlayer);
        await writeData(players);
        await createBackup();
        
        console.log(`New player created: ${newPlayer.telegramId}`);
        res.status(201).json(newPlayer);
    } catch (error) {
        console.error('Error creating player:', error);
        console.error('Error stack:', error.stack);
        res.status(500).json({
            error: 'Internal server error',
            message: error.message,
            timestamp,
            telegramId: req.body?.telegramId
        });
    }
});

app.put('/api/players/:telegramId', async (req, res) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] PUT /api/players/${req.params.telegramId}`);
    console.log('Request body:', req.body);

    try {
        await ensureDataFile();
        const players = await readData();
        const playerIndex = players.findIndex(p => p.telegramId === req.params.telegramId);
        
        if (playerIndex === -1) {
            console.log(`Player not found for update: ${req.params.telegramId}`);
            return res.status(404).json({
                error: 'Player not found',
                timestamp
            });
        }

        // Обновляем данные игрока
        players[playerIndex] = {
            ...players[playerIndex],
            ...req.body,
            updatedAt: new Date().toISOString()
        };
        
        await writeData(players);
        await createBackup();
        
        console.log(`Player updated: ${req.params.telegramId}`);
        res.json(players[playerIndex]);
    } catch (error) {
        console.error('Error updating player:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: error.message,
            timestamp
        });
    }
});

// Запускаем сервер
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log('Using JSON file storage');
    
    // Создаем файл данных при запуске
    ensureDataFile()
        .then(() => console.log('Data file initialized'))
        .catch(err => console.error('Error initializing data file:', err));
}); 
const express = require('express');
const { MongoClient } = require('mongodb');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Добавляем middleware для логирования
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    console.log('Headers:', req.headers);
    console.log('Body:', req.body);
    next();
});

// MongoDB connection
const uri = 'mongodb+srv://econoch:DeaG16181822@cluster0.zweknv6.mongodb.net/econoch?retryWrites=true&w=majority&appName=Cluster0';
const client = new MongoClient(uri, {
    serverSelectionTimeoutMS: 5000,
    connectTimeoutMS: 10000,
    socketTimeoutMS: 45000,
    maxPoolSize: 10,
    minPoolSize: 5,
    maxIdleTimeMS: 30000,
    retryWrites: true,
    retryReads: true
});

// Функция для проверки подключения к MongoDB
async function checkMongoConnection() {
    try {
        console.log('Проверка подключения к MongoDB...');
        if (!client.topology || !client.topology.isConnected()) {
            console.log('Переподключение к MongoDB...');
            await client.connect();
        }
        
        const db = client.db('econoch');
        console.log('Подключение к базе данных:', db.databaseName);
        
        // Проверяем доступность коллекции
        const collections = await db.listCollections().toArray();
        console.log('Доступные коллекции:', collections.map(c => c.name));
        
        // Проверяем индексы
        const playersCollection = db.collection('players');
        const indexes = await playersCollection.indexes();
        console.log('Индексы коллекции players:', indexes);
        
        return true;
    } catch (error) {
        console.error('Ошибка подключения к MongoDB:', error);
        console.error('Детали ошибки:', {
            name: error.name,
            message: error.message,
            code: error.code,
            stack: error.stack
        });
        return false;
    }
}

// Проверяем подключение при старте
client.connect()
    .then(async () => {
        console.log('Connected to MongoDB');
        const isConnected = await checkMongoConnection();
        if (!isConnected) {
            console.error('Не удалось установить стабильное подключение к MongoDB');
            process.exit(1);
        }
    })
    .catch(err => {
        console.error('Failed to connect to MongoDB:', err);
        process.exit(1);
    });

// Добавляем обработчик для проверки состояния подключения
app.get('/api/status', async (req, res) => {
    try {
        const isConnected = await checkMongoConnection();
        if (!isConnected) {
            return res.status(500).json({
                status: 'error',
                message: 'Database connection error',
                timestamp: new Date()
            });
        }
        
        res.json({
            status: 'ok',
            database: 'econoch',
            connection: 'active',
            timestamp: new Date()
        });
    } catch (error) {
        console.error('Ошибка проверки статуса:', error);
        res.status(500).json({
            status: 'error',
            message: error.message,
            timestamp: new Date()
        });
    }
});

// Добавляем обработчик для проверки коллекции
app.get('/api/collections', async (req, res) => {
    try {
        const db = client.db('econoch');
        const collections = await db.listCollections().toArray();
        
        res.json({
            status: 'ok',
            collections: collections.map(c => ({
                name: c.name,
                type: c.type,
                options: c.options
            })),
            timestamp: new Date()
        });
    } catch (error) {
        console.error('Ошибка получения списка коллекций:', error);
        res.status(500).json({
            status: 'error',
            message: error.message,
            timestamp: new Date()
        });
    }
});

// Add OPTIONS route for CORS preflight
app.options('/api/players/:telegramId', cors());
app.options('/api/players', cors());

// Добавляем проверку статуса сервера
app.get('/api/players', async (req, res) => {
    try {
        // Проверяем подключение к MongoDB
        if (!client.topology || !client.topology.isConnected()) {
            console.error('MongoDB не подключен');
            return res.status(500).json({ error: 'Database connection error' });
        }

        const db = client.db('econoch');
        const collections = await db.listCollections().toArray();
        
        res.json({ 
            status: 'ok',
            database: 'econoch',
            collections: collections.map(c => c.name),
            serverTime: new Date()
        });
    } catch (error) {
        console.error('Ошибка проверки статуса:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});

// Routes
app.get('/api/players/:telegramId', async (req, res) => {
    try {
        const { telegramId } = req.params;
        const telegramUserId = req.headers['x-telegram-user-id'];
        const telegramVersion = req.headers['x-telegram-version'];
        
        console.log('GET запрос для игрока:', {
            paramId: telegramId,
            headerId: telegramUserId,
            version: telegramVersion,
            headers: req.headers
        });
        
        // Проверяем подключение к MongoDB
        if (!client.topology || !client.topology.isConnected()) {
            console.error('MongoDB не подключен');
            return res.status(500).json({ error: 'Database connection error' });
        }
        
        const db = client.db('econoch');
        console.log('База данных:', db.databaseName);
        
        const collection = db.collection('players');
        console.log('Коллекция:', collection.collectionName);
        
        const query = { telegramId: String(telegramId) };
        console.log('Запрос:', query);
        
        const player = await collection.findOne(query);
        console.log('Найден игрок:', player);
        
        if (player) {
            console.log('Отправляем данные игрока');
            res.json(player);
        } else {
            console.log('Игрок не найден, возвращаем 404');
            res.status(404).json({ 
                error: 'Player not found',
                details: {
                    telegramId: telegramId,
                    query: query
                }
            });
        }
    } catch (error) {
        console.error('Ошибка при получении игрока:', error);
        console.error('Стек ошибки:', error.stack);
        res.status(500).json({ 
            error: 'Internal server error', 
            details: error.message,
            path: req.path,
            method: req.method
        });
    }
});

app.post('/api/players', async (req, res) => {
    try {
        const player = req.body;
        console.log('POST request with data:', player);
        
        if (!player.telegramId) {
            console.error('Missing telegramId in request');
            return res.status(400).json({ error: 'Missing telegramId' });
        }
        
        // Convert telegramId to string
        player.telegramId = String(player.telegramId);
        
        const result = await client.db('econoch').collection('players').insertOne(player);
        console.log('Insert result:', result);
        
        res.status(201).json({ ...player, _id: result.insertedId });
    } catch (error) {
        console.error('Error creating player:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});

app.put('/api/players/:telegramId', async (req, res) => {
    try {
        const { telegramId } = req.params;
        const player = req.body;
        console.log('PUT request for player:', telegramId);
        console.log('Update data:', player);
        
        // Convert telegramId to string
        const query = { telegramId: String(telegramId) };
        
        const result = await client.db('econoch').collection('players').updateOne(
            query,
            { $set: { ...player, lastUpdated: new Date() } },
            { upsert: true }
        );
        
        console.log('Update result:', result);
        
        if (result.matchedCount > 0) {
            res.json({ message: 'Player updated successfully', result });
        } else if (result.upsertedCount > 0) {
            res.json({ message: 'Player created successfully', result });
        } else {
            res.status(404).json({ error: 'Player not found' });
        }
    } catch (error) {
        console.error('Error updating player:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});

// Start the server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
}); 
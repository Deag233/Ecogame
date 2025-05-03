// Initialize Telegram WebApp
const tg = window.Telegram.WebApp;

// Check if the game is opened through Telegram
if (!tg.initDataUnsafe?.user?.id) {
    document.body.innerHTML = `
        <div style="text-align: center; padding: 20px; font-family: Arial, sans-serif;">
            <h2>Пожалуйста, откройте игру через Telegram бота</h2>
            <p>Эта игра работает только внутри Telegram.</p>
            <p>Откройте бота и нажмите кнопку "Играть" или используйте команду /start</p>
        </div>
    `;
    throw new Error('Game must be opened through Telegram bot');
}

tg.expand();

// Log Telegram data for debugging
console.log('Telegram WebApp data:', {
    initData: tg.initData,
    initDataUnsafe: tg.initDataUnsafe,
    user: tg.initDataUnsafe?.user
});

// API URL - будет заменен на реальный URL после деплоя
const API_URL = 'https://econoch.onrender.com/api';

// Game state
let gameState = {
    score: 0,
    multiplier: 1,
    upgrades: {
        autoClicker: {
            level: 0,
            cost: 10,
            baseCost: 10,
            clicksPerSecond: 0
        },
        clickPower: {
            level: 0,
            cost: 50,
            baseCost: 50,
            power: 1
        }
    }
};

// DOM Elements
const scoreElement = document.getElementById('score');
const multiplierElement = document.getElementById('multiplier');
const clickButton = document.getElementById('clickButton');
const upgrade1Button = document.getElementById('upgrade1');
const upgrade2Button = document.getElementById('upgrade2');
const upgrade1CostElement = document.getElementById('upgrade1Cost');
const upgrade2CostElement = document.getElementById('upgrade2Cost');
const upgrade1LevelElement = document.getElementById('upgrade1Level');
const upgrade2LevelElement = document.getElementById('upgrade2Level');

// Add this function after the DOM Elements section
function showNotification(message, isError = false) {
    const notification = document.createElement('div');
    notification.style.position = 'fixed';
    notification.style.top = '20px';
    notification.style.left = '50%';
    notification.style.transform = 'translateX(-50%)';
    notification.style.padding = '10px 20px';
    notification.style.borderRadius = '5px';
    notification.style.backgroundColor = isError ? '#ff4444' : '#4CAF50';
    notification.style.color = 'white';
    notification.style.zIndex = '1000';
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
}

// Update UI and save state
async function updateUI() {
    scoreElement.textContent = Math.floor(gameState.score);
    multiplierElement.textContent = gameState.multiplier;
    upgrade1CostElement.textContent = Math.floor(gameState.upgrades.autoClicker.cost);
    upgrade2CostElement.textContent = Math.floor(gameState.upgrades.clickPower.cost);
    upgrade1LevelElement.textContent = `Level: ${gameState.upgrades.autoClicker.level}`;
    upgrade2LevelElement.textContent = `Level: ${gameState.upgrades.clickPower.level}`;

    // Update button states
    upgrade1Button.disabled = gameState.score < gameState.upgrades.autoClicker.cost;
    upgrade2Button.disabled = gameState.score < gameState.upgrades.clickPower.cost;

    // Save state after any UI update
    await saveGameState();
}

// Update saveGameState function
async function saveGameState() {
    try {
        const telegramId = tg.initDataUnsafe?.user?.id;
        if (!telegramId) {
            showNotification('Ошибка: ID пользователя не найден', true);
            return;
        }

        // Create a deep copy of the game state to ensure all values are included
        const saveData = {
            telegramId,
            username: tg.initDataUnsafe?.user?.username,
            score: Number(gameState.score),
            multiplier: Number(gameState.multiplier),
            upgrades: {
                autoClicker: {
                    level: Number(gameState.upgrades.autoClicker.level),
                    cost: Number(gameState.upgrades.autoClicker.cost),
                    baseCost: Number(gameState.upgrades.autoClicker.baseCost),
                    clicksPerSecond: Number(gameState.upgrades.autoClicker.clicksPerSecond)
                },
                clickPower: {
                    level: Number(gameState.upgrades.clickPower.level),
                    cost: Number(gameState.upgrades.clickPower.cost),
                    baseCost: Number(gameState.upgrades.clickPower.baseCost),
                    power: Number(gameState.upgrades.clickPower.power)
                }
            }
        };

        showNotification('Сохранение...');
        const response = await fetch(`${API_URL}/players`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(saveData)
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            showNotification(`Ошибка сохранения: ${errorData.error || response.statusText}`, true);
            throw new Error(`Failed to save game state: ${errorData.error || response.statusText}`);
        }
        
        const savedData = await response.json();
        showNotification('Прогресс сохранен');
    } catch (error) {
        showNotification(`Ошибка: ${error.message}`, true);
    }
}

// Update loadGameState function
async function loadGameState() {
    try {
        const telegramId = tg.initDataUnsafe?.user?.id;
        if (!telegramId) {
            showNotification('Ошибка: ID пользователя не найден', true);
            return;
        }

        showNotification('Загрузка...');
        const response = await fetch(`${API_URL}/players/${telegramId}`);
        
        if (response.ok) {
            const data = await response.json();
            gameState = {
                score: data.score || 0,
                multiplier: data.multiplier || 1,
                upgrades: data.upgrades || {
                    autoClicker: { level: 0, cost: 10, baseCost: 10, clicksPerSecond: 0 },
                    clickPower: { level: 0, cost: 50, baseCost: 50, power: 1 }
                }
            };
            showNotification('Прогресс загружен');
            updateUI();
        } else if (response.status === 404) {
            showNotification('Начинаем новую игру');
            gameState = {
                score: 0,
                multiplier: 1,
                upgrades: {
                    autoClicker: { level: 0, cost: 10, baseCost: 10, clicksPerSecond: 0 },
                    clickPower: { level: 0, cost: 50, baseCost: 50, power: 1 }
                }
            };
            updateUI();
        } else {
            const errorData = await response.json();
            showNotification(`Ошибка загрузки: ${errorData.error || response.statusText}`, true);
            throw new Error(`Failed to load game state: ${errorData.error || response.statusText}`);
        }
    } catch (error) {
        showNotification(`Ошибка: ${error.message}`, true);
        gameState = {
            score: 0,
            multiplier: 1,
            upgrades: {
                autoClicker: { level: 0, cost: 10, baseCost: 10, clicksPerSecond: 0 },
                clickPower: { level: 0, cost: 50, baseCost: 50, power: 1 }
            }
        };
        updateUI();
    }
}

// Click handler
async function handleClick() {
    gameState.score += gameState.multiplier * gameState.upgrades.clickPower.power;
    await updateUI();
}

// Upgrade handlers
async function buyAutoClicker() {
    if (gameState.score >= gameState.upgrades.autoClicker.cost) {
        gameState.score -= gameState.upgrades.autoClicker.cost;
        gameState.upgrades.autoClicker.level++;
        gameState.upgrades.autoClicker.clicksPerSecond += 0.5;
        gameState.upgrades.autoClicker.cost = Math.floor(gameState.upgrades.autoClicker.baseCost * Math.pow(1.5, gameState.upgrades.autoClicker.level));
        await updateUI();
    }
}

async function buyClickPower() {
    if (gameState.score >= gameState.upgrades.clickPower.cost) {
        gameState.score -= gameState.upgrades.clickPower.cost;
        gameState.upgrades.clickPower.level++;
        gameState.upgrades.clickPower.power *= 1.5;
        gameState.upgrades.clickPower.cost = Math.floor(gameState.upgrades.clickPower.baseCost * Math.pow(1.5, gameState.upgrades.clickPower.level));
        await updateUI();
    }
}

// Auto clicker
async function autoClick() {
    gameState.score += gameState.upgrades.autoClicker.clicksPerSecond * gameState.upgrades.clickPower.power;
    await updateUI();
}

// Event listeners
clickButton.addEventListener('click', handleClick);
upgrade1Button.addEventListener('click', buyAutoClicker);
upgrade2Button.addEventListener('click', buyClickPower);

// Start auto clicker
setInterval(autoClick, 1000);

// Load game state when app starts
loadGameState();

// Initial UI update
updateUI(); 
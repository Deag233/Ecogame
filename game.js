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

        console.log('=== SAVE REQUEST START ===');
        console.log('Sending save request with data:', JSON.stringify(saveData, null, 2));
        console.log('API URL:', API_URL);
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

            console.log('=== LOAD REQUEST START ===');
            console.log('Loading game state for user:', telegramId);
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

// Add after DOM Elements section
const settingsButton = document.createElement('button');
settingsButton.textContent = '⚙️';
settingsButton.style.position = 'fixed';
settingsButton.style.top = '10px';
settingsButton.style.right = '10px';
settingsButton.style.padding = '10px';
settingsButton.style.fontSize = '20px';
settingsButton.style.border = 'none';
settingsButton.style.background = 'none';
settingsButton.style.cursor = 'pointer';
document.body.appendChild(settingsButton);

let settingsClickCount = 0;
let devMenuOpen = false;

function createDevMenu() {
    const devMenu = document.createElement('div');
    devMenu.style.position = 'fixed';
    devMenu.style.top = '50%';
    devMenu.style.left = '50%';
    devMenu.style.transform = 'translate(-50%, -50%)';
    devMenu.style.backgroundColor = '#2c3e50';
    devMenu.style.padding = '20px';
    devMenu.style.borderRadius = '10px';
    devMenu.style.zIndex = '1000';
    devMenu.style.display = 'none';
    devMenu.id = 'devMenu';

    const title = document.createElement('h2');
    title.textContent = 'Меню разработчика';
    title.style.color = 'white';
    title.style.marginBottom = '20px';
    devMenu.appendChild(title);

    const consoleButton = document.createElement('button');
    consoleButton.textContent = 'Открыть консоль';
    consoleButton.style.padding = '10px 20px';
    consoleButton.style.margin = '5px';
    consoleButton.style.backgroundColor = '#3498db';
    consoleButton.style.color = 'white';
    consoleButton.style.border = 'none';
    consoleButton.style.borderRadius = '5px';
    consoleButton.style.cursor = 'pointer';
    consoleButton.onclick = () => {
        const consoleDiv = document.createElement('div');
        consoleDiv.style.position = 'fixed';
        consoleDiv.style.bottom = '0';
        consoleDiv.style.left = '0';
        consoleDiv.style.right = '0';
        consoleDiv.style.height = '200px';
        consoleDiv.style.backgroundColor = '#1e1e1e';
        consoleDiv.style.color = '#fff';
        consoleDiv.style.padding = '10px';
        consoleDiv.style.fontFamily = 'monospace';
        consoleDiv.style.overflowY = 'auto';
        consoleDiv.id = 'devConsole';
        document.body.appendChild(consoleDiv);

        // Override console.log
        const originalConsoleLog = console.log;
        console.log = function(...args) {
            originalConsoleLog.apply(console, args);
            const message = args.map(arg => 
                typeof arg === 'object' ? JSON.stringify(arg, null, 2) : arg
            ).join(' ');
            const consoleDiv = document.getElementById('devConsole');
            if (consoleDiv) {
                const line = document.createElement('div');
                line.textContent = message;
                consoleDiv.appendChild(line);
                consoleDiv.scrollTop = consoleDiv.scrollHeight;
            }
        };
    };
    devMenu.appendChild(consoleButton);

    const closeButton = document.createElement('button');
    closeButton.textContent = 'Закрыть';
    closeButton.style.padding = '10px 20px';
    closeButton.style.margin = '5px';
    closeButton.style.backgroundColor = '#e74c3c';
    closeButton.style.color = 'white';
    closeButton.style.border = 'none';
    closeButton.style.borderRadius = '5px';
    closeButton.style.cursor = 'pointer';
    closeButton.onclick = () => {
        devMenu.style.display = 'none';
        devMenuOpen = false;
    };
    devMenu.appendChild(closeButton);

    document.body.appendChild(devMenu);
}

createDevMenu();

settingsButton.addEventListener('click', () => {
    settingsClickCount++;
    if (settingsClickCount >= 14 && !devMenuOpen) {
        const devMenu = document.getElementById('devMenu');
        devMenu.style.display = 'block';
        devMenuOpen = true;
        settingsClickCount = 0;
    }
}); 
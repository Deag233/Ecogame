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

// Initialize game state with default values
let gameState = null;

function initializeGameState(data = null) {
    console.log('Initializing game state with data:', data);
    gameState = {
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

    if (data) {
        gameState.score = Number(data.score) || 0;
        gameState.multiplier = Number(data.multiplier) || 1;
        
        if (data.upgrades) {
            if (data.upgrades.autoClicker) {
                gameState.upgrades.autoClicker = {
                    level: Number(data.upgrades.autoClicker.level) || 0,
                    cost: Number(data.upgrades.autoClicker.cost) || 10,
                    baseCost: Number(data.upgrades.autoClicker.baseCost) || 10,
                    clicksPerSecond: Number(data.upgrades.autoClicker.clicksPerSecond) || 0
                };
            }
            if (data.upgrades.clickPower) {
                gameState.upgrades.clickPower = {
                    level: Number(data.upgrades.clickPower.level) || 0,
                    cost: Number(data.upgrades.clickPower.cost) || 50,
                    baseCost: Number(data.upgrades.clickPower.baseCost) || 50,
                    power: Number(data.upgrades.clickPower.power) || 1
                };
            }
        }
    }
    
    console.log('Game state initialized:', gameState);
    return gameState;
}

// Initialize game state immediately
initializeGameState();

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
    console.log('Updating UI, current gameState:', gameState);
    
    if (!gameState) {
        console.error('gameState is not initialized in updateUI');
        gameState = initializeGameState();
    }

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
        console.log('Starting saveGameState, current gameState:', gameState);
        
        const telegramId = tg.initDataUnsafe?.user?.id;
        if (!telegramId) {
            showNotification('Ошибка: ID пользователя не найден', true);
            return;
        }

        // Validate gameState
        if (!gameState || typeof gameState !== 'object') {
            console.error('Invalid gameState in saveGameState:', gameState);
            gameState = initializeGameState();
        }

        // Create a deep copy of the game state to ensure all values are included
        const saveData = {
            telegramId,
            username: tg.initDataUnsafe?.user?.username || 'unknown',
            score: Number(gameState.score) || 0,
            multiplier: Number(gameState.multiplier) || 1,
            upgrades: {
                autoClicker: {
                    level: Number(gameState.upgrades?.autoClicker?.level) || 0,
                    cost: Number(gameState.upgrades?.autoClicker?.cost) || 10,
                    baseCost: Number(gameState.upgrades?.autoClicker?.baseCost) || 10,
                    clicksPerSecond: Number(gameState.upgrades?.autoClicker?.clicksPerSecond) || 0
                },
                clickPower: {
                    level: Number(gameState.upgrades?.clickPower?.level) || 0,
                    cost: Number(gameState.upgrades?.clickPower?.cost) || 50,
                    baseCost: Number(gameState.upgrades?.clickPower?.baseCost) || 50,
                    power: Number(gameState.upgrades?.clickPower?.power) || 1
                }
            }
        };

        console.log('Preparing to save game state:', saveData);

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
            console.error('Save error response:', errorData);
            showNotification(`Ошибка сохранения: ${errorData.error || response.statusText}`, true);
            throw new Error(`Failed to save game state: ${errorData.error || response.statusText}`);
        }
        
        const savedData = await response.json();
        console.log('Game state saved successfully:', savedData);
        showNotification('Прогресс сохранен');

    } catch (error) {
        console.error('Save error:', error);
        showNotification(`Ошибка: ${error.message}`, true);
    }
}

// Update loadGameState function
async function loadGameState() {
    try {
        console.log('Starting loadGameState');
        
        const telegramId = tg.initDataUnsafe?.user?.id;
        if (!telegramId) {
            showNotification('Ошибка: ID пользователя не найден', true);
            return;
        }

        showNotification('Загрузка...');
        const response = await fetch(`${API_URL}/players/${telegramId}`);
        
        if (response.ok) {
            const data = await response.json();
            console.log('Loaded game data:', data);
            
            // Initialize gameState with loaded data
            gameState = initializeGameState(data);
            console.log('Game state initialized with loaded data:', gameState);
            
            showNotification('Прогресс загружен');
            updateUI();
        } else if (response.status === 404) {
            console.log('No saved game found, starting new game');
            showNotification('Начинаем новую игру');
            gameState = initializeGameState();
            updateUI();
        } else {
            const errorData = await response.json();
            console.error('Load error response:', errorData);
            showNotification(`Ошибка загрузки: ${errorData.error || response.statusText}`, true);
            throw new Error(`Failed to load game state: ${errorData.error || response.statusText}`);
        }
    } catch (error) {
        console.error('Load error:', error);
        showNotification(`Ошибка: ${error.message}`, true);
        // Initialize with default values on error
        gameState = initializeGameState();
        updateUI();
    }
}

// Click handler
async function handleClick() {
    console.log('Handle click, current gameState:', gameState);
    
    if (!gameState) {
        console.error('gameState is not initialized in handleClick');
        gameState = initializeGameState();
    }
    
    gameState.score += gameState.multiplier * gameState.upgrades.clickPower.power;
    await updateUI();
}

// Upgrade handlers
async function buyAutoClicker() {
    console.log('Buy auto clicker, current gameState:', gameState);
    
    if (!gameState) {
        console.error('gameState is not initialized in buyAutoClicker');
        gameState = initializeGameState();
    }
    
    if (gameState.score >= gameState.upgrades.autoClicker.cost) {
        gameState.score -= gameState.upgrades.autoClicker.cost;
        gameState.upgrades.autoClicker.level++;
        gameState.upgrades.autoClicker.clicksPerSecond += 0.5;
        gameState.upgrades.autoClicker.cost = Math.floor(gameState.upgrades.autoClicker.baseCost * Math.pow(1.5, gameState.upgrades.autoClicker.level));
        await updateUI();
    }
}

async function buyClickPower() {
    console.log('Buy click power, current gameState:', gameState);
    
    if (!gameState) {
        console.error('gameState is not initialized in buyClickPower');
        gameState = initializeGameState();
    }
    
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
    console.log('Auto click, current gameState:', gameState);
    
    if (!gameState) {
        console.error('gameState is not initialized in autoClick');
        gameState = initializeGameState();
    }
    
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

// Settings button code
const settingsButton = document.getElementById('settingsButton');
let settingsClickCount = 0;
let devMenuOpen = false;

function createDevMenu() {
    const devMenu = document.createElement('div');
    devMenu.style.position = 'fixed';
    devMenu.style.top = '50%';
    devMenu.style.left = '50%';
    devMenu.style.transform = 'translate(-50%, -50%)';
    devMenu.style.backgroundColor = 'var(--tg-theme-bg-color, #2c3e50)';
    devMenu.style.padding = '20px';
    devMenu.style.borderRadius = '10px';
    devMenu.style.zIndex = '1001';
    devMenu.style.display = 'none';
    devMenu.style.boxShadow = '0 0 20px rgba(0, 0, 0, 0.3)';
    devMenu.id = 'devMenu';

    const title = document.createElement('h2');
    title.textContent = 'Меню разработчика';
    title.style.color = 'var(--tg-theme-text-color, white)';
    title.style.marginBottom = '20px';
    title.style.textAlign = 'center';
    devMenu.appendChild(title);

    const consoleButton = document.createElement('button');
    consoleButton.textContent = 'Открыть консоль';
    consoleButton.style.padding = '10px 20px';
    consoleButton.style.margin = '5px';
    consoleButton.style.backgroundColor = 'var(--tg-theme-button-color, #3498db)';
    consoleButton.style.color = 'var(--tg-theme-button-text-color, white)';
    consoleButton.style.border = 'none';
    consoleButton.style.borderRadius = '5px';
    consoleButton.style.cursor = 'pointer';
    consoleButton.style.width = '100%';
    consoleButton.onclick = () => {
        const consoleDiv = document.createElement('div');
        consoleDiv.style.position = 'fixed';
        consoleDiv.style.bottom = '60px';
        consoleDiv.style.left = '0';
        consoleDiv.style.right = '0';
        consoleDiv.style.height = '200px';
        consoleDiv.style.backgroundColor = 'var(--tg-theme-bg-color, #1e1e1e)';
        consoleDiv.style.color = 'var(--tg-theme-text-color, #fff)';
        consoleDiv.style.padding = '10px';
        consoleDiv.style.fontFamily = 'monospace';
        consoleDiv.style.overflowY = 'auto';
        consoleDiv.style.zIndex = '1000';
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
    closeButton.style.backgroundColor = 'var(--tg-theme-button-color, #e74c3c)';
    closeButton.style.color = 'var(--tg-theme-button-text-color, white)';
    closeButton.style.border = 'none';
    closeButton.style.borderRadius = '5px';
    closeButton.style.cursor = 'pointer';
    closeButton.style.width = '100%';
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
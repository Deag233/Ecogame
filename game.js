// Initialize Telegram WebApp
const tg = window.Telegram.WebApp;

// Add loading screen
function showLoadingScreen() {
    // Remove existing loading screen if any
    const existingScreen = document.getElementById('loadingScreen');
    if (existingScreen) {
        existingScreen.remove();
    }

    const loadingScreen = document.createElement('div');
    loadingScreen.id = 'loadingScreen';
    loadingScreen.style.position = 'fixed';
    loadingScreen.style.top = '0';
    loadingScreen.style.left = '0';
    loadingScreen.style.width = '100%';
    loadingScreen.style.height = '100%';
    loadingScreen.style.backgroundColor = 'var(--tg-theme-bg-color, #2c3e50)';
    loadingScreen.style.display = 'flex';
    loadingScreen.style.flexDirection = 'column';
    loadingScreen.style.alignItems = 'center';
    loadingScreen.style.justifyContent = 'center';
    loadingScreen.style.zIndex = '9999';

    const spinner = document.createElement('div');
    spinner.style.width = '50px';
    spinner.style.height = '50px';
    spinner.style.border = '5px solid var(--tg-theme-hint-color, rgba(255, 255, 255, 0.3))';
    spinner.style.borderTop = '5px solid var(--tg-theme-button-color, #2481cc)';
    spinner.style.borderRadius = '50%';
    spinner.style.animation = 'spin 1s linear infinite';

    const loadingText = document.createElement('div');
    loadingText.textContent = 'Загрузка...';
    loadingText.style.marginTop = '20px';
    loadingText.style.color = 'var(--tg-theme-text-color, white)';
    loadingText.style.fontSize = '18px';

    const statusText = document.createElement('div');
    statusText.id = 'loadingStatus';
    statusText.style.marginTop = '10px';
    statusText.style.color = 'var(--tg-theme-hint-color, rgba(255, 255, 255, 0.6))';
    statusText.style.fontSize = '14px';

    const style = document.createElement('style');
    style.textContent = `
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    `;

    loadingScreen.appendChild(spinner);
    loadingScreen.appendChild(loadingText);
    loadingScreen.appendChild(statusText);
    document.head.appendChild(style);
    document.body.appendChild(loadingScreen);
}

function updateLoadingStatus(message) {
    const statusText = document.getElementById('loadingStatus');
    if (statusText) {
        statusText.textContent = message;
    }
}

function hideLoadingScreen() {
    const loadingScreen = document.getElementById('loadingScreen');
    if (loadingScreen) {
        loadingScreen.style.opacity = '0';
        loadingScreen.style.transition = 'opacity 0.5s ease-out';
        setTimeout(() => loadingScreen.remove(), 500);
    }
}

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', () => {
    // Show loading screen immediately
    showLoadingScreen();
    updateLoadingStatus('Инициализация игры...');

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

    // Initialize game
    initializeGame();
});

// Initialize game
async function initializeGame() {
    try {
        // Проверяем данные Telegram
        console.log('Начало инициализации игры...');
        checkTelegramData();
        
        // Проверяем статус API
        updateLoadingStatus('Проверка соединения с сервером...');
        console.log('Проверка соединения с сервером...');
        const apiStatus = await checkApiStatus();
        if (!apiStatus) {
            throw new Error('Сервер недоступен');
        }

        // Загружаем состояние игры
        updateLoadingStatus('Загрузка сохраненного прогресса...');
        console.log('Загрузка состояния игры...');
        await loadGameState();

        // Инициализируем UI
        updateLoadingStatus('Загрузка интерфейса...');
        console.log('Инициализация интерфейса...');
        tg.expand();
        updateUI();

        // Создаем меню разработчика
        updateLoadingStatus('Инициализация дополнительных функций...');
        console.log('Создание меню разработчика...');
        createDevMenu();

        // Скрываем экран загрузки
        console.log('Инициализация завершена успешно');
        hideLoadingScreen();
    } catch (error) {
        console.error('Ошибка инициализации:', error);
        console.error('Стек ошибки:', error.stack);
        updateLoadingStatus(`Ошибка: ${error.message}`);
        showNotification(`Ошибка инициализации: ${error.message}`, true);
    }
}

// Show loading screen
showLoadingScreen();
updateLoadingStatus('Инициализация игры...');

// Log Telegram data for debugging
console.log('Telegram WebApp data:', {
    initData: tg.initData,
    initDataUnsafe: tg.initDataUnsafe,
    user: tg.initDataUnsafe?.user
});

// API URL - Local server
const API_URL = 'http://localhost:3001/api';

// Добавляем функцию для проверки Telegram данных
function checkTelegramData() {
    console.log('Проверка данных Telegram:', {
        window: !!window.Telegram,
        WebApp: !!window.Telegram?.WebApp,
        initData: tg.initData,
        initDataUnsafe: tg.initDataUnsafe,
        user: tg.initDataUnsafe?.user,
        id: tg.initDataUnsafe?.user?.id
    });
    
    if (!window.Telegram) {
        throw new Error('Telegram WebApp не инициализирован');
    }
    
    if (!tg.initDataUnsafe?.user?.id) {
        throw new Error('ID пользователя не найден');
    }
}

// Initialize game state with default values
function initializeGameState(data = null) {
    console.log('Initializing game state with data:', data);
    
    const defaultState = {
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
        // Merge provided data with default state
        return {
            ...defaultState,
            ...data,
            upgrades: {
                autoClicker: {
                    ...defaultState.upgrades.autoClicker,
                    ...(data.upgrades?.autoClicker || {})
                },
                clickPower: {
                    ...defaultState.upgrades.clickPower,
                    ...(data.upgrades?.clickPower || {})
                }
            }
        };
    }

    return defaultState;
}

// Initialize game state immediately
let gameState = initializeGameState();

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

// Add debounce function to prevent multiple saves
let saveTimeout = null;
let lastSaveTime = 0;
const SAVE_COOLDOWN = 5000; // 5 seconds between saves

async function debouncedSave() {
    const now = Date.now();
    if (now - lastSaveTime < SAVE_COOLDOWN) {
        console.log('Save cooldown active, skipping save');
        return;
    }
    
    if (saveTimeout) {
        clearTimeout(saveTimeout);
    }
    
    saveTimeout = setTimeout(async () => {
        try {
            console.log('Executing debounced save...');
            await saveGameState();
            lastSaveTime = Date.now();
        } catch (error) {
            console.error('Error in debounced save:', error);
        }
    }, 1000);
}

// Update UI and save state
async function updateUI() {
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

    // Save state after any UI update with debounce
    await debouncedSave();
}

// Add function to check API status
async function checkApiStatus() {
    try {
        console.log('Проверка статуса API...');
        console.log('URL API:', API_URL);
        
        const response = await fetch(`${API_URL}/players`, {
            method: 'OPTIONS',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Origin': window.location.origin
            }
        });
        
        console.log('Статус ответа API:', response.status);
        console.log('Заголовки ответа:', Object.fromEntries(response.headers.entries()));
        
        if (!response.ok) {
            console.error('Ответ API не OK:', response.status, response.statusText);
            throw new Error(`Сервер вернул ошибку: ${response.status} ${response.statusText}`);
        }
        
        return true;
    } catch (error) {
        console.error('Ошибка проверки API:', error);
        if (error.message.includes('Failed to fetch')) {
            console.error('Детали сетевой ошибки:', {
                error: error.message,
                type: error.name,
                stack: error.stack,
                url: API_URL
            });
            throw new Error('Не удалось подключиться к серверу. Проверьте подключение к интернету и работу сервера.');
        }
        throw error;
    }
}

// Update loadGameState function
async function loadGameState() {
    try {
        console.log('Начало загрузки состояния игры...');
        console.log('Данные Telegram:', {
            initData: tg.initData,
            user: tg.initDataUnsafe?.user,
            id: tg.initDataUnsafe?.user?.id
        });
        
        const telegramId = tg.initDataUnsafe?.user?.id;
        if (!telegramId) {
            console.error('ID пользователя не найден в данных:', tg.initDataUnsafe);
            showNotification('Ошибка: ID пользователя не найден. Попробуйте перезапустить игру.', true);
            return;
        }

        // Проверяем статус API
        try {
            updateLoadingStatus('Проверка соединения с сервером...');
            console.log('Проверка соединения с сервером...');
            const apiStatus = await checkApiStatus();
            if (!apiStatus) {
                throw new Error('Сервер недоступен');
            }
        } catch (error) {
            console.error('Ошибка проверки API:', error);
            updateLoadingStatus(`Ошибка: ${error.message}`);
            throw error;
        }

        showNotification('Загрузка...');
        console.log('Запрос состояния игры для пользователя:', telegramId);
        console.log('URL запроса:', `${API_URL}/players/${telegramId}`);
        
        const response = await fetch(`${API_URL}/players/${telegramId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });
        
        console.log('Статус ответа:', response.status);
        console.log('Заголовки ответа:', Object.fromEntries(response.headers.entries()));
        
        if (response.ok) {
            const data = await response.json();
            console.log('Полученные данные:', data);
            
            if (!data || typeof data !== 'object') {
                console.error('Некорректные данные получены:', data);
                throw new Error('Получены некорректные данные с сервера');
            }
            
            // Инициализируем состояние игры с загруженными данными
            gameState = initializeGameState(data);
            console.log('Состояние игры инициализировано:', gameState);
            
            showNotification('Прогресс загружен');
            updateUI();
        } else if (response.status === 404) {
            console.log('Сохраненная игра не найдена, начинаем новую игру');
            showNotification('Начинаем новую игру');
            gameState = initializeGameState();
            updateUI();
        } else {
            const errorData = await response.json().catch(() => ({ error: 'Неизвестная ошибка' }));
            console.error('Ошибка загрузки:', errorData);
            console.error('Статус ответа:', response.status);
            console.error('Текст ответа:', response.statusText);
            showNotification(`Ошибка загрузки: ${errorData.error || response.statusText}. Код: ${response.status}`, true);
            throw new Error(`Ошибка загрузки состояния игры: ${errorData.error || response.statusText}`);
        }
    } catch (error) {
        console.error('Ошибка загрузки:', error);
        console.error('Стек ошибки:', error.stack);
        showNotification(`Ошибка: ${error.message}`, true);
        // Инициализируем с значениями по умолчанию при ошибке
        gameState = initializeGameState();
        updateUI();
    }
}

// Update saveGameState function
async function saveGameState() {
    try {
        console.log('Starting saveGameState...');
        
        const telegramId = tg.initDataUnsafe?.user?.id;
        if (!telegramId) {
            console.error('No telegram ID found');
            showNotification('Ошибка: ID пользователя не найден', true);
            return;
        }

        // Check API status first
        const apiStatus = await checkApiStatus();
        if (!apiStatus) {
            console.error('API is not available');
            showNotification('Ошибка: Сервер недоступен', true);
            return;
        }

        // Validate gameState
        if (!gameState || typeof gameState !== 'object') {
            console.error('Invalid gameState:', gameState);
            gameState = initializeGameState();
        }

        // Create a deep copy of the game state, excluding MongoDB fields
        const saveData = {
            telegramId: String(telegramId), // Ensure telegramId is a string
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

        console.log('Saving game state:', saveData);

        // If we have an _id, use PUT to update
        if (gameState._id) {
            console.log('Updating existing player with _id:', gameState._id);
            const updateResponse = await fetch(`${API_URL}/players/${gameState._id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(saveData)
            });

            if (updateResponse.ok) {
                const savedData = await updateResponse.json();
                console.log('Game state updated successfully:', savedData);
                
                // Update local gameState with saved data
                gameState = {
                    ...gameState,
                    ...savedData
                };
                
                showNotification('Прогресс сохранен');
                return;
            } else {
                console.log('Update failed, trying to create new player');
            }
        }

        // If no _id or update failed, create new player
        console.log('Creating new player...');
        const createResponse = await fetch(`${API_URL}/players`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(saveData)
        });
        
        if (!createResponse.ok) {
            const errorData = await createResponse.json().catch(() => ({ error: 'Unknown error' }));
            console.error('Create error response:', errorData);
            showNotification(`Ошибка сохранения: ${errorData.error || createResponse.statusText}`, true);
            throw new Error(`Failed to save game state: ${errorData.error || createResponse.statusText}`);
        }
        
        const savedData = await createResponse.json();
        console.log('Game state created successfully:', savedData);
        
        // Update local gameState with saved data
        gameState = {
            ...gameState,
            ...savedData
        };
        
        showNotification('Прогресс сохранен');

    } catch (error) {
        console.error('Save error:', error);
        showNotification(`Ошибка: ${error.message}`, true);
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

// Update auto clicker function
async function autoClick() {
    if (!gameState) {
        console.error('gameState is not initialized in autoClick');
        gameState = initializeGameState();
    }
    
    const clickValue = gameState.upgrades.autoClicker.clicksPerSecond * gameState.upgrades.clickPower.power;
    if (clickValue > 0) {
        gameState.score += clickValue;
        await updateUI();
    }
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
let lastClickTime = 0;

function showClickCount() {
    // Remove existing notification if any
    const existingNotification = document.getElementById('clickCountNotification');
    if (existingNotification) {
        existingNotification.remove();
    }

    const notification = document.createElement('div');
    notification.id = 'clickCountNotification';
    notification.style.position = 'fixed';
    notification.style.top = '50%';
    notification.style.left = '50%';
    notification.style.transform = 'translate(-50%, -50%)';
    notification.style.padding = '15px 30px';
    notification.style.backgroundColor = 'var(--tg-theme-bg-color, #2c3e50)';
    notification.style.color = 'var(--tg-theme-text-color, white)';
    notification.style.borderRadius = '10px';
    notification.style.zIndex = '1002';
    notification.style.fontSize = '24px';
    notification.style.fontWeight = 'bold';
    notification.style.boxShadow = '0 0 20px rgba(0, 0, 0, 0.3)';
    notification.textContent = `${14 - settingsClickCount} кликов осталось`;
    document.body.appendChild(notification);

    // Add animation
    notification.style.animation = 'fadeInOut 1s ease-in-out';
    
    // Add animation style
    const style = document.createElement('style');
    style.textContent = `
        @keyframes fadeInOut {
            0% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
            20% { opacity: 1; transform: translate(-50%, -50%) scale(1.1); }
            80% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
            100% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
        }
    `;
    document.head.appendChild(style);

    setTimeout(() => {
        notification.remove();
        style.remove();
    }, 1000);
}

function createDevMenu() {
    // Remove existing dev menu if any
    const existingMenu = document.getElementById('devMenu');
    if (existingMenu) {
        existingMenu.remove();
    }

    const devMenu = document.createElement('div');
    devMenu.id = 'devMenu';
    devMenu.style.display = 'none';
    devMenu.style.position = 'fixed';
    devMenu.style.top = '50%';
    devMenu.style.left = '50%';
    devMenu.style.transform = 'translate(-50%, -50%)';
    devMenu.style.backgroundColor = 'var(--tg-theme-bg-color, #2c3e50)';
    devMenu.style.color = 'var(--tg-theme-text-color, white)';
    devMenu.style.padding = '20px';
    devMenu.style.borderRadius = '10px';
    devMenu.style.zIndex = '1000';
    devMenu.style.minWidth = '300px';
    devMenu.style.boxShadow = '0 0 20px rgba(0, 0, 0, 0.3)';

    const title = document.createElement('h2');
    title.textContent = 'Developer Menu';
    title.style.marginBottom = '20px';
    title.style.textAlign = 'center';
    devMenu.appendChild(title);

    const consoleButton = document.createElement('button');
    consoleButton.textContent = 'Open Console';
    consoleButton.style.width = '100%';
    consoleButton.style.padding = '10px';
    consoleButton.style.marginBottom = '10px';
    consoleButton.style.backgroundColor = 'var(--tg-theme-button-color, #2481cc)';
    consoleButton.style.color = 'var(--tg-theme-button-text-color, white)';
    consoleButton.style.border = 'none';
    consoleButton.style.borderRadius = '5px';
    consoleButton.style.cursor = 'pointer';

    consoleButton.onclick = () => {
        // Remove existing console if any
        const existingConsole = document.getElementById('devConsole');
        if (existingConsole) {
            existingConsole.remove();
        }

        const consoleDiv = document.createElement('div');
        consoleDiv.id = 'devConsole';
        consoleDiv.style.position = 'fixed';
        consoleDiv.style.bottom = '20px';
        consoleDiv.style.left = '20px';
        consoleDiv.style.right = '20px';
        consoleDiv.style.height = '300px';
        consoleDiv.style.backgroundColor = 'var(--tg-theme-bg-color, #2c3e50)';
        consoleDiv.style.color = 'var(--tg-theme-text-color, white)';
        consoleDiv.style.padding = '10px';
        consoleDiv.style.borderRadius = '10px';
        consoleDiv.style.overflowY = 'auto';
        consoleDiv.style.fontFamily = 'monospace';
        consoleDiv.style.fontSize = '12px';
        consoleDiv.style.zIndex = '1001';
        consoleDiv.style.boxShadow = '0 0 20px rgba(0, 0, 0, 0.3)';

        // Add copy button
        const copyButton = document.createElement('button');
        copyButton.textContent = 'Copy Console';
        copyButton.style.position = 'absolute';
        copyButton.style.top = '10px';
        copyButton.style.right = '10px';
        copyButton.style.padding = '5px 10px';
        copyButton.style.backgroundColor = 'var(--tg-theme-button-color, #2481cc)';
        copyButton.style.color = 'var(--tg-theme-button-text-color, white)';
        copyButton.style.border = 'none';
        copyButton.style.borderRadius = '5px';
        copyButton.style.cursor = 'pointer';
        copyButton.style.fontSize = '12px';

        copyButton.onclick = () => {
            const consoleText = consoleDiv.innerText;
            navigator.clipboard.writeText(consoleText).then(() => {
                showNotification('Console copied to clipboard');
            }).catch(err => {
                showNotification('Failed to copy console', true);
                console.error('Copy failed:', err);
            });
        };

        consoleDiv.appendChild(copyButton);

        // Override console.log
        const originalConsoleLog = console.log;
        console.log = function() {
            const args = Array.from(arguments);
            const message = args.map(arg => 
                typeof arg === 'object' ? JSON.stringify(arg, null, 2) : arg
            ).join(' ');
            
            const logEntry = document.createElement('div');
            logEntry.style.marginBottom = '5px';
            logEntry.style.borderBottom = '1px solid rgba(255, 255, 255, 0.1)';
            logEntry.style.paddingBottom = '5px';
            logEntry.textContent = message;
            consoleDiv.appendChild(logEntry);
            
            // Scroll to bottom
            consoleDiv.scrollTop = consoleDiv.scrollHeight;
            
            // Call original console.log
            originalConsoleLog.apply(console, arguments);
        };

        document.body.appendChild(consoleDiv);
        console.log('Developer console opened');
        console.log('Current game state:', gameState);
        console.log('Telegram WebApp data:', {
            initData: tg.initData,
            initDataUnsafe: tg.initDataUnsafe,
            user: tg.initDataUnsafe?.user
        });
    };

    const closeButton = document.createElement('button');
    closeButton.textContent = 'Close';
    closeButton.style.width = '100%';
    closeButton.style.padding = '10px';
    closeButton.style.backgroundColor = 'var(--tg-theme-button-color, #2481cc)';
    closeButton.style.color = 'var(--tg-theme-button-text-color, white)';
    closeButton.style.border = 'none';
    closeButton.style.borderRadius = '5px';
    closeButton.style.cursor = 'pointer';

    closeButton.onclick = () => {
        devMenu.style.display = 'none';
        devMenuOpen = false;
        // Remove console when closing menu
        const consoleDiv = document.getElementById('devConsole');
        if (consoleDiv) {
            consoleDiv.remove();
        }
    };

    devMenu.appendChild(consoleButton);
    devMenu.appendChild(closeButton);
    document.body.appendChild(devMenu);
}

// Add click handler for settings button
if (settingsButton) {
    console.log('Settings button found, adding click handler');
    settingsButton.addEventListener('click', () => {
        const currentTime = Date.now();
        // Reset count if more than 2 seconds between clicks
        if (currentTime - lastClickTime > 2000) {
            settingsClickCount = 0;
        }
        lastClickTime = currentTime;

        console.log('Settings button clicked, count:', settingsClickCount + 1);
        settingsClickCount++;
        
        // Add click animation to button
        settingsButton.style.transform = 'scale(0.9)';
        setTimeout(() => {
            settingsButton.style.transform = 'scale(1)';
        }, 100);
        
        // Show click count notification
        showClickCount();

        if (settingsClickCount >= 14 && !devMenuOpen) {
            console.log('Opening developer menu');
            const devMenu = document.getElementById('devMenu');
            if (devMenu) {
                devMenu.style.display = 'block';
                devMenuOpen = true;
                settingsClickCount = 0;
                
                // Add opening animation
                devMenu.style.animation = 'menuOpen 0.3s ease-out';
                const style = document.createElement('style');
                style.textContent = `
                    @keyframes menuOpen {
                        0% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
                        100% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
                    }
                `;
                document.head.appendChild(style);
                setTimeout(() => style.remove(), 300);
            } else {
                console.error('Developer menu not found');
            }
        }
    });
} else {
    console.error('Settings button not found');
}

// Create dev menu when the page loads
createDevMenu(); 
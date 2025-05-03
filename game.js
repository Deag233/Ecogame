// Initialize Telegram WebApp
const tg = window.Telegram.WebApp;
tg.expand();

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

// Update UI
function updateUI() {
    scoreElement.textContent = Math.floor(gameState.score);
    multiplierElement.textContent = gameState.multiplier;
    upgrade1CostElement.textContent = Math.floor(gameState.upgrades.autoClicker.cost);
    upgrade2CostElement.textContent = Math.floor(gameState.upgrades.clickPower.cost);
    upgrade1LevelElement.textContent = `Level: ${gameState.upgrades.autoClicker.level}`;
    upgrade2LevelElement.textContent = `Level: ${gameState.upgrades.clickPower.level}`;

    // Update button states
    upgrade1Button.disabled = gameState.score < gameState.upgrades.autoClicker.cost;
    upgrade2Button.disabled = gameState.score < gameState.upgrades.clickPower.cost;
}

// Click handler
function handleClick() {
    gameState.score += gameState.multiplier * gameState.upgrades.clickPower.power;
    updateUI();
}

// Upgrade handlers
function buyAutoClicker() {
    if (gameState.score >= gameState.upgrades.autoClicker.cost) {
        gameState.score -= gameState.upgrades.autoClicker.cost;
        gameState.upgrades.autoClicker.level++;
        gameState.upgrades.autoClicker.clicksPerSecond += 0.5;
        gameState.upgrades.autoClicker.cost = Math.floor(gameState.upgrades.autoClicker.baseCost * Math.pow(1.5, gameState.upgrades.autoClicker.level));
        updateUI();
    }
}

function buyClickPower() {
    if (gameState.score >= gameState.upgrades.clickPower.cost) {
        gameState.score -= gameState.upgrades.clickPower.cost;
        gameState.upgrades.clickPower.level++;
        gameState.upgrades.clickPower.power *= 1.5;
        gameState.upgrades.clickPower.cost = Math.floor(gameState.upgrades.clickPower.baseCost * Math.pow(1.5, gameState.upgrades.clickPower.level));
        updateUI();
    }
}

// Auto clicker
function autoClick() {
    gameState.score += gameState.upgrades.autoClicker.clicksPerSecond * gameState.upgrades.clickPower.power;
    updateUI();
}

// Event listeners
clickButton.addEventListener('click', handleClick);
upgrade1Button.addEventListener('click', buyAutoClicker);
upgrade2Button.addEventListener('click', buyClickPower);

// Start auto clicker
setInterval(autoClick, 1000);

// Initial UI update
updateUI();

// Save game state periodically
setInterval(() => {
    tg.sendData(JSON.stringify(gameState));
}, 5000);

// Load saved game state if available
tg.onEvent('viewportChanged', function() {
    const savedState = tg.initDataUnsafe?.start_param;
    if (savedState) {
        try {
            const parsedState = JSON.parse(savedState);
            gameState = parsedState;
            updateUI();
        } catch (e) {
            console.error('Failed to parse saved state:', e);
        }
    }
}); 
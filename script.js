const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game objects
const player = {
    x: 50,
    y: 300,
    width: 40,
    height: 40,
    color: '#4caf50',
    dx: 0,
    dy: 0,
    speed: 4,
    jumpPower: 12,
    onGround: false,
    jumpCount: 0,
    maxJumps: 2
};

const gravity = 0.6;

let level = 1;
let score = 0;
let platforms = [];
let coins = [];
let movingPlatforms = [];
let enemies = [];
let hazards = [];
let keys = [];
let doors = [];
let checkpoints = [];
let timer = 0;
let timerActive = false;
let powerUps = [];
let lastCheckpoint = { x: 50, y: 300 };
let hasKey = false;
let levelComplete = false;
let musicStarted = false;

function generateLevel(lvl) {
    // Base ground
    platforms = [ { x: 0, y: 360, width: 800, height: 40 } ];
    coins = [];
    movingPlatforms = [];

    // Add more static platforms with gaps (increase platform count)
    for (let i = 0; i < lvl + 5; i++) {
        let gap = (i % 2 === 0) ? 60 + 10 * lvl : 0;
        let px = 80 + i * (650 / (lvl + 5)) + gap;
        let py = 320 - i * (50 + 8 * lvl);
        let width = 80 + 20 * (i % 2);
        platforms.push({ x: px, y: py, width: width, height: 20 });
        // Place coins only on some platforms
        if (i % 3 === 0 && coins.length < Math.max(2, Math.floor((lvl + 5) / 3))) {
            coins.push({ x: px + width / 2 - 10, y: py - 40, collected: false });
        }
    }

    // Add moving platforms for higher levels
    if (lvl > 2) {
        for (let i = 0; i < Math.min(lvl + 2, 5); i++) {
            let mp = {
                x: 200 + i * 120,
                y: 180 + i * 35,
                width: 80,
                height: 20,
                dir: i % 2 === 0 ? 1 : -1,
                range: 100 + 30 * lvl,
                baseX: 200 + i * 120,
                speed: 1 + lvl * 0.5
            };
            movingPlatforms.push(mp);
            // Place coins on some moving platforms
            if (i % 2 === 0 && coins.length < Math.max(2, Math.floor((lvl + 5) / 2))) {
                coins.push({ x: mp.x + 30, y: mp.y - 30, collected: false });
            }
        }
    }

    // Add fewer floating coins for challenge
    for (let i = 0; i < Math.min(lvl, 2); i++) {
        coins.push({ x: 80 + i * 120, y: 80 + (i % 2) * 40, collected: false });
    }

    // Add enemies
    enemies = [];
    for (let i = 0; i < Math.floor(lvl / 2); i++) {
        enemies.push({ x: 300 + i * 120, y: 340 - i * 40, width: 30, height: 30, dir: i % 2 === 0 ? 1 : -1, range: 60 + 20 * lvl, baseX: 300 + i * 120, speed: 1 + lvl * 0.3 });
    }
    // Add hazards (spikes)
    hazards = [];
    for (let i = 0; i < lvl; i++) {
        hazards.push({ x: 200 + i * 150, y: 380, width: 40, height: 20 });
    }
    // Add key and door
    keys = [{ x: 700, y: 100, collected: false }];
    doors = [{ x: 750, y: 320, width: 30, height: 60, open: false }];
    // Add checkpoints
    checkpoints = [{ x: 400, y: 200, reached: false }];
    // Add power-ups
    powerUps = [];
    if (lvl % 2 === 0) powerUps.push({ x: 600, y: 80, type: 'speed', collected: false });

    // Reset state
    lastCheckpoint = { x: 50, y: 300 };
    hasKey = false;
    levelComplete = false;
    timer = 0;
    timerActive = true;

    // Reset player position
    player.x = 50;
    player.y = 300;
    player.dx = 0;
    player.dy = 0;
}

generateLevel(level);


// Controls
const keysPressed = {};
document.addEventListener('keydown', e => {
    keysPressed[e.code] = true;
    // Next level on 'n'
    if (e.code === 'KeyN') {
        level++;
        generateLevel(level);
    }
    // Double jump on Space
    if (e.code === 'Space') {
        if (player.jumpCount < player.maxJumps) {
            player.dy = -player.jumpPower;
            player.onGround = false;
            player.jumpCount++;
        }
    }
});
document.addEventListener('keyup', e => keysPressed[e.code] = false);

function updateMovingPlatforms() {
    for (const mp of movingPlatforms) {
        mp.x += mp.dir * mp.speed;
        if (Math.abs(mp.x - mp.baseX) > mp.range) {
            mp.dir *= -1;
        }
    }
}

function updateEnemies() {
    for (const enemy of enemies) {
        enemy.x += enemy.dir * enemy.speed;
        if (Math.abs(enemy.x - enemy.baseX) > enemy.range) {
            enemy.dir *= -1;
        }
    }
}

function updatePlayer() {
    // Horizontal movement
    if (keysPressed['ArrowLeft']) player.dx = -player.speed;
    else if (keysPressed['ArrowRight']) player.dx = player.speed;
    else player.dx = 0;

    // Gravity
    player.dy += gravity;
    player.x += player.dx;
    player.y += player.dy;

    // Platform collision
    let landed = false;
    // Static platforms
    for (const plat of platforms) {
        if (
            player.x < plat.x + plat.width &&
            player.x + player.width > plat.x &&
            player.y < plat.y + plat.height &&
            player.y + player.height > plat.y
        ) {
            // Land on top
            if (player.dy > 0 && player.y + player.height - player.dy <= plat.y) {
                player.y = plat.y - player.height;
                player.dy = 0;
                player.onGround = true;
                landed = true;
            }
        }
    }
    // Moving platforms
    for (const mp of movingPlatforms) {
        if (
            player.x < mp.x + mp.width &&
            player.x + player.width > mp.x &&
            player.y < mp.y + mp.height &&
            player.y + player.height > mp.y
        ) {
            // Land on top
            if (player.dy > 0 && player.y + player.height - player.dy <= mp.y) {
                player.y = mp.y - player.height;
                player.dy = 0;
                player.onGround = true;
                landed = true;
            }
        }
    }
    if (landed) {
        player.jumpCount = 0;
    } else {
        player.onGround = false;
    }

    // Boundaries
    if (player.x < 0) player.x = 0;
    if (player.x + player.width > canvas.width) player.x = canvas.width - player.width;
    if (player.y + player.height > canvas.height) {
        player.y = canvas.height - player.height;
        player.dy = 0;
        player.onGround = true;
        player.jumpCount = 0;
    }
}

function checkCoins() {
    for (const coin of coins) {
        if (!coin.collected &&
            player.x < coin.x + 20 &&
            player.x + player.width > coin.x &&
            player.y < coin.y + 20 &&
            player.y + player.height > coin.y
        ) {
            coin.collected = true;
            score++;
        }
    }
}

function checkCollisions() {
    // Enemy collision
    for (const enemy of enemies) {
        if (player.x < enemy.x + enemy.width && player.x + player.width > enemy.x && player.y < enemy.y + enemy.height && player.y + player.height > enemy.y) {
            respawnPlayer();
        }
    }
    // Hazard collision
    for (const hz of hazards) {
        if (player.x < hz.x + hz.width && player.x + player.width > hz.x && player.y < hz.y + hz.height && player.y + player.height > hz.y) {
            respawnPlayer();
        }
    }
    // Key collection
    for (const key of keys) {
        if (!key.collected && player.x < key.x + 20 && player.x + player.width > key.x && player.y < key.y + 20 && player.y + player.height > key.y) {
            key.collected = true;
            hasKey = true;
        }
    }
    // Door
    for (const door of doors) {
        if (hasKey && player.x < door.x + door.width && player.x + player.width > door.x && player.y < door.y + door.height && player.y + player.height > door.y) {
            door.open = true;
            levelComplete = true;
        }
    }
    // Checkpoint
    for (const cp of checkpoints) {
        if (!cp.reached && player.x < cp.x + 20 && player.x + player.width > cp.x && player.y < cp.y + 20 && player.y + player.height > cp.y) {
            cp.reached = true;
            lastCheckpoint = { x: cp.x, y: cp.y };
        }
    }
    // Power-up
    for (const pu of powerUps) {
        if (!pu.collected && player.x < pu.x + 20 && player.x + player.width > pu.x && player.y < pu.y + 20 && player.y + player.height > pu.y) {
            pu.collected = true;
            if (pu.type === 'speed') player.speed += 2;
        }
    }
}

function respawnPlayer() {
    player.x = lastCheckpoint.x;
    player.y = lastCheckpoint.y;
    player.dx = 0;
    player.dy = 0;
    player.speed = 4;
}

function updateTimer() {
    if (timerActive && !levelComplete) timer += 1 / 60;
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw static platforms
    ctx.fillStyle = '#888';
    for (const plat of platforms) {
        ctx.fillRect(plat.x, plat.y, plat.width, plat.height);
    }
    // Draw moving platforms
    ctx.fillStyle = '#00bcd4';
    for (const mp of movingPlatforms) {
        ctx.fillRect(mp.x, mp.y, mp.width, mp.height);
    }

    // Draw coins
    for (const coin of coins) {
        if (!coin.collected) {
            ctx.beginPath();
            ctx.arc(coin.x + 10, coin.y + 10, 10, 0, Math.PI * 2);
            ctx.fillStyle = 'gold';
            ctx.fill();
            ctx.closePath();
        }
    }

    // Draw player
    ctx.fillStyle = player.color;
    ctx.fillRect(player.x, player.y, player.width, player.height);

    // Draw enemies
    ctx.fillStyle = 'purple';
    for (const enemy of enemies) {
        ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
    }

    // Draw hazards
    ctx.fillStyle = 'red';
    for (const hz of hazards) {
        ctx.fillRect(hz.x, hz.y, hz.width, hz.height);
        ctx.beginPath();
        ctx.moveTo(hz.x, hz.y + hz.height);
        ctx.lineTo(hz.x + hz.width / 2, hz.y);
        ctx.lineTo(hz.x + hz.width, hz.y + hz.height);
        ctx.fill();
    }

    // Draw key
    for (const key of keys) {
        if (!key.collected) {
            ctx.fillStyle = 'yellow';
            ctx.fillRect(key.x, key.y, 20, 20);
        }
    }
    // Draw door
    for (const door of doors) {
        ctx.fillStyle = door.open ? 'green' : 'brown';
        ctx.fillRect(door.x, door.y, door.width, door.height);
    }
    // Draw checkpoints
    for (const cp of checkpoints) {
        ctx.fillStyle = cp.reached ? 'lime' : 'orange';
        ctx.beginPath();
        ctx.arc(cp.x + 10, cp.y + 10, 10, 0, Math.PI * 2);
        ctx.fill();
    }
    // Draw power-ups
    for (const pu of powerUps) {
        if (!pu.collected) {
            ctx.fillStyle = pu.type === 'speed' ? 'cyan' : 'magenta';
            ctx.beginPath();
            ctx.arc(pu.x + 10, pu.y + 10, 10, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // Draw score and level
    ctx.fillStyle = '#fff';
    ctx.font = '24px Arial';
    ctx.fillText('Score: ' + score, 20, 30);
    ctx.fillText('Level: ' + level, 20, 60);
    ctx.font = '18px Arial';
    ctx.fillText('Press N for next level', 20, 90);
    ctx.fillText('Double jump: press Space twice', 20, 120);
    ctx.font = '16px Arial';
    ctx.fillText('Blue platforms move!', 20, 150);
    // Draw timer
    ctx.fillStyle = '#fff';
    ctx.font = '18px Arial';
    ctx.fillText('Time: ' + timer.toFixed(2), 650, 30);
    if (levelComplete) {
        ctx.font = '32px Arial';
        ctx.fillStyle = 'yellow';
        ctx.fillText('Level Complete!', 300, 200);
    }
}

function gameLoop() {
    updateMovingPlatforms();
    updateEnemies();
    updatePlayer();
    checkCoins();
    checkCollisions();
    updateTimer();
    draw();
    requestAnimationFrame(gameLoop);
}

gameLoop();

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const scoreEl = document.getElementById("score");
const livesEl = document.getElementById("lives");
const levelEl = document.getElementById("level");
const messageEl = document.getElementById("message");

const gameWidth = canvas.width;
const gameHeight = canvas.height;
const keys = {};

let score = 0;
let lives = 3;
let level = 1;
let state = "ready";
let invaderDirection = 1;
let invaderSpeed = 0.4;
let invaders = [];
let bullets = [];
let enemyBullets = [];
let bunkers = [];
let particles = [];
let enemyFireTimer = 0;
let screenShake = 0;
let animationFrame = 0;
let lastTime = 0;
let highScores = [];

const player = {
  width: 40,
  height: 16,
  x: gameWidth / 2 - 20,
  y: gameHeight - 60,
  speed: 6,
  cooldown: 0,
};

function loadHighScores() {
  const saved = localStorage.getItem("spaceInvadersHighScores");
  if (saved) {
    highScores = JSON.parse(saved);
  } else {
    highScores = [
      { score: 1000, level: 1 },
      { score: 800, level: 1 },
      { score: 600, level: 1 },
      { score: 400, level: 1 },
      { score: 200, level: 1 },
    ];
  }
}

function saveHighScores() {
  localStorage.setItem("spaceInvadersHighScores", JSON.stringify(highScores));
}

function addHighScore(finalScore, finalLevel) {
  const entry = { score: finalScore, level: finalLevel };
  highScores.push(entry);
  highScores.sort((a, b) => b.score - a.score);
  highScores = highScores.slice(0, 5);
  saveHighScores();
  return highScores.some((hs) => hs.score === finalScore && hs.level === finalLevel);
}

function formatHighScores() {
  let text = "TOP 5 HIGH SCORES\n\n";
  highScores.forEach((entry, i) => {
    text += `${i + 1}. Score: ${entry.score} - Level: ${entry.level}\n`;
  });
  return text;
}

function triggerGameOver() {
  state = "gameover";
  addHighScore(score, level);
  const hsText = formatHighScores();
  showMessage(`Game Over! Score: ${score} Level: ${level}\n\n${hsText}\nPress ENTER to restart`);
}

function resetGame() {
  score = 0;
  lives = 3;
  level = 1;
  player.x = gameWidth / 2 - player.width / 2;
  bullets = [];
  enemyBullets = [];
  particles = [];
  screenShake = 0;
  animationFrame = 0;
  createInvaders();
  createBunkers();
  updateHUD();
  showMessage("Press ENTER to start");
  state = "ready";
}

function createBunkers() {
  bunkers = [];
  const bunkerCount = 4;
  const bunkerWidth = 80;
  const bunkerHeight = 40;
  const startX = 80;
  const spacing = 140;
  const baseY = gameHeight - 170;

  for (let i = 0; i < bunkerCount; i += 1) {
    const x = startX + i * spacing;
    for (let row = 0; row < 4; row += 1) {
      for (let col = 0; col < 6; col += 1) {
        if (row === 0 && (col === 0 || col === 5)) continue;
        bunkers.push({
          x: x + col * 12,
          y: baseY + row * 10,
          width: 12,
          height: 10,
          health: 2,
        });
      }
    }
  }
}

function createInvaders() {
  invaders = [];
  invaderDirection = 1;
  invaderSpeed = 0.2 + level * 0.05;
  const rows = Math.min(5, 3 + Math.floor(level / 2));
  const cols = 10;
  const offsetX = 60;
  const offsetY = 60;
  const spacingX = 60;
  const spacingY = 46;

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      invaders.push({
        x: offsetX + col * spacingX,
        y: offsetY + row * spacingY,
        width: 38,
        height: 24,
        alive: true,
        row,
        animOffset: Math.random() * 4,
      });
    }
  }
}

function createExplosion(x, y, color = "#ffff00", count = 8) {
  for (let i = 0; i < count; i += 1) {
    const angle = (Math.PI * 2 * i) / count;
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * (3 + Math.random() * 3),
      vy: Math.sin(angle) * (3 + Math.random() * 3),
      life: 20,
      maxLife: 20,
      color,
    });
  }
}

function updateHUD() {
  scoreEl.textContent = `Score: ${score}`;
  livesEl.textContent = `Lives: ${lives}`;
  levelEl.textContent = `Level: ${level}`;
}

function showMessage(text) {
  messageEl.textContent = text;
  messageEl.classList.remove("hidden");
}

function hideMessage() {
  messageEl.classList.add("hidden");
}

function fireBullet() {
  if (player.cooldown > 0 || bullets.length >= 3) {
    return;
  }

  bullets.push({
    x: player.x + player.width / 2 - 3,
    y: player.y - 10,
    width: 6,
    height: 14,
  });

  player.cooldown = 14;
}

function handleInput() {
  if (keys.ArrowLeft || keys.KeyA) {
    player.x -= player.speed;
  }

  if (keys.ArrowRight || keys.KeyD) {
    player.x += player.speed;
  }

  if (keys.Space) {
    fireBullet();
  }

  player.x = Math.max(10, Math.min(gameWidth - player.width - 10, player.x));

  if (player.cooldown > 0) {
    player.cooldown -= 1;
  }
}

function updateBullets() {
  bullets.forEach((bullet) => {
    bullet.y -= 10;
  });

  bullets = bullets.filter((bullet) => bullet.y + bullet.height > 0);
}

function fireEnemyBullet() {
  const aliveInvaders = invaders.filter((invader) => invader.alive);
  if (aliveInvaders.length === 0) {
    return;
  }

  const shooter = aliveInvaders[Math.floor(Math.random() * aliveInvaders.length)];
  enemyBullets.push({
    x: shooter.x + shooter.width / 2 - 3,
    y: shooter.y + shooter.height + 6,
    width: 6,
    height: 14,
  });
}

function updateEnemyBullets() {
  enemyFireTimer -= 1;
  if (enemyFireTimer <= 0) {
    fireEnemyBullet();
    enemyFireTimer = Math.max(50, 140 - level * 8);
  }

  enemyBullets.forEach((bullet) => {
    bullet.y += 4 + level * 0.12;
  });

  enemyBullets = enemyBullets.filter((bullet) => bullet.y < gameHeight);
}

function updateInvaders(delta) {
  const moveDistance = invaderSpeed * delta;
  let shouldDrop = false;
  let leftEdge = Infinity;
  let rightEdge = -Infinity;

  invaders.forEach((invader) => {
    if (!invader.alive) return;
    leftEdge = Math.min(leftEdge, invader.x);
    rightEdge = Math.max(rightEdge, invader.x + invader.width);
  });

  if (rightEdge >= gameWidth - 10 && invaderDirection === 1) {
    shouldDrop = true;
  }

  if (leftEdge <= 10 && invaderDirection === -1) {
    shouldDrop = true;
  }

  invaders.forEach((invader) => {
    if (!invader.alive) return;
    invader.x += invaderDirection * moveDistance;
  });

  if (shouldDrop) {
    invaderDirection *= -1;
    invaders.forEach((invader) => {
      if (!invader.alive) return;
      invader.y += 24;
    });
  }
}

function detectCollisions() {
  bullets.forEach((bullet) => {
    invaders.forEach((invader) => {
      if (!invader.alive) return;
      if (
        bullet.x < invader.x + invader.width &&
        bullet.x + bullet.width > invader.x &&
        bullet.y < invader.y + invader.height &&
        bullet.y + bullet.height > invader.y
      ) {
        invader.alive = false;
        bullet.y = -100;
        score += 10 + invader.row * 2;
        createExplosion(invader.x + invader.width / 2, invader.y + invader.height / 2, "#ffaa00");
      }
    });

    bunkers.forEach((block) => {
      if (block.health <= 0) return;
      if (
        bullet.x < block.x + block.width &&
        bullet.x + bullet.width > block.x &&
        bullet.y < block.y + block.height &&
        bullet.y + bullet.height > block.y
      ) {
        block.health -= 1;
        bullet.y = -100;
        createExplosion(block.x + block.width / 2, block.y + block.height / 2, "#00ff88", 4);
      }
    });
  });

  enemyBullets.forEach((bullet) => {
    if (
      bullet.x < player.x + player.width &&
      bullet.x + bullet.width > player.x &&
      bullet.y < player.y + player.height &&
      bullet.y + bullet.height > player.y
    ) {
      lives -= 1;
      bullet.y = gameHeight + 100;
      screenShake = 8;
      createExplosion(player.x + player.width / 2, player.y + player.height / 2, "#ff3333", 12);
      if (lives <= 0) {
        triggerGameOver();
      }
    }

    bunkers.forEach((block) => {
      if (block.health <= 0) return;
      if (
        bullet.x < block.x + block.width &&
        bullet.x + bullet.width > block.x &&
        bullet.y < block.y + block.height &&
        bullet.y + bullet.height > block.y
      ) {
        block.health -= 1;
        bullet.y = gameHeight + 100;
        createExplosion(block.x + block.width / 2, block.y + block.height / 2, "#00ff88", 4);
      }
    });
  });

  bullets = bullets.filter((bullet) => bullet.y + bullet.height > 0);
  enemyBullets = enemyBullets.filter((bullet) => bullet.y < gameHeight);
  bunkers = bunkers.filter((block) => block.health > 0);

  const aliveInvaders = invaders.filter((invader) => invader.alive);

  aliveInvaders.forEach((invader) => {
    if (invader.y + invader.height >= player.y) {
      lives = 0;
      triggerGameOver();
    }
  });

  if (aliveInvaders.length === 0) {
    level += 1;
    updateHUD();
    state = "levelup";
    showMessage(`Level ${level} cleared! Press ENTER to continue`);
  }
}

function updateGame(delta) {
  if (state !== "playing") {
    return;
  }

  animationFrame += 1;
  if (screenShake > 0) {
    screenShake -= 1;
  }

  handleInput();
  updateBullets();
  updateEnemyBullets();
  updateInvaders(delta);
  
  particles = particles.filter((p) => {
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.2;
    p.life -= 1;
    return p.life > 0;
  });

  detectCollisions();

  if (lives <= 0) {
    triggerGameOver();
  }

  updateHUD();
}

function drawPlayer() {
  ctx.fillStyle = "#7efaff";
  ctx.fillRect(player.x, player.y, player.width, player.height);
  ctx.fillStyle = "#0ff";
  ctx.fillRect(player.x + 10, player.y - 6, 20, 6);
}

function drawBullets() {
  ctx.fillStyle = "#fff";
  bullets.forEach((bullet) => {
    ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
  });
}

function drawEnemyBullets() {
  ctx.fillStyle = "#ff6b6b";
  enemyBullets.forEach((bullet) => {
    ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
  });
}

function drawBunkers() {
  bunkers.forEach((block) => {
    ctx.fillStyle = block.health === 2 ? "#66ff88" : "#75ffad";
    ctx.fillRect(block.x, block.y, block.width, block.height);
  });
}

function drawInvaders() {
  invaders.forEach((invader) => {
    if (!invader.alive) return;
    const animPhase = Math.floor((animationFrame + invader.animOffset) / 8) % 2;
    const color = invader.row % 2 === 0 ? "#ffb347" : "#8ae3ff";
    ctx.fillStyle = color;
    const offsetX = animPhase === 0 ? 0 : 2;
    ctx.fillRect(invader.x + offsetX, invader.y, invader.width - (animPhase === 0 ? 0 : 4), invader.height);
    ctx.fillStyle = "rgba(255, 255, 255, 0.16)";
    ctx.fillRect(invader.x + 8 + offsetX, invader.y + 6, invader.width - 20, 6);
  });
}

function drawParticles() {
  particles.forEach((p) => {
    const alpha = p.life / p.maxLife;
    ctx.globalAlpha = alpha * 0.8;
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
    ctx.globalAlpha = 1;
  });
}

function drawGrid() {
  ctx.strokeStyle = "rgba(255,255,255,0.06)";
  ctx.lineWidth = 1;
  for (let x = 0; x <= gameWidth; x += 80) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, gameHeight);
    ctx.stroke();
  }
  for (let y = 0; y <= gameHeight; y += 80) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(gameWidth, y);
    ctx.stroke();
  }
}

function render() {
  ctx.clearRect(0, 0, gameWidth, gameHeight);
  
  const shakeX = screenShake > 0 ? (Math.random() - 0.5) * screenShake * 2 : 0;
  const shakeY = screenShake > 0 ? (Math.random() - 0.5) * screenShake * 2 : 0;
  
  ctx.save();
  ctx.translate(shakeX, shakeY);
  
  drawGrid();
  drawBunkers();
  drawPlayer();
  drawBullets();
  drawEnemyBullets();
  drawInvaders();
  drawParticles();
  
  ctx.restore();
}

function gameLoop(timestamp) {
  const delta = Math.min(20, timestamp - lastTime);
  lastTime = timestamp;
  updateGame(delta);
  render();
  requestAnimationFrame(gameLoop);
}

window.addEventListener("keydown", (event) => {
  if (event.code === "Enter") {
    if (state === "ready" || state === "levelup") {
      const wasLevelUp = state === "levelup";
      hideMessage();
      state = "playing";
      bullets = [];
      enemyBullets = [];
      particles = [];
      screenShake = 0;
      enemyFireTimer = 60;
      if (wasLevelUp || invaders.every((invader) => !invader.alive)) {
        createInvaders();
      }
      createBunkers();
      return;
    }

    if (state === "gameover") {
      resetGame();
      hideMessage();
      state = "playing";
      return;
    }
  }

  if (event.code === "Space") {
    event.preventDefault();
    keys.Space = true;
  }

  keys[event.code] = true;
});

window.addEventListener("keyup", (event) => {
  if (event.code === "Space") {
    keys.Space = false;
  }
  keys[event.code] = false;
});

window.addEventListener("blur", () => {
  Object.keys(keys).forEach((key) => {
    keys[key] = false;
  });
});

loadHighScores();
resetGame();
requestAnimationFrame((timestamp) => {
  lastTime = timestamp;
  render();
  requestAnimationFrame(gameLoop);
});

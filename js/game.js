const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const scoreEl = document.getElementById("score");
const livesEl = document.getElementById("lives");
const levelEl = document.getElementById("level");
const bossHealthEl = document.getElementById("bossHealth");
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
let boss = null;
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
  updateHUD();
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

function createBoss() {
  boss = {
    x: gameWidth / 2 - 60,
    y: 70,
    width: 120,
    height: 44,
    alive: true,
    health: 12 + level * 6,
    maxHealth: 12 + level * 6,
    direction: 1,
  };
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
  boss = null;
  invaders = [];
  invaderDirection = 1;
  invaderSpeed = 0.2 + level * 0.05;
  if (level % 3 === 0) {
    createBoss();
    return;
  }
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
  if (boss && boss.alive) {
    bossHealthEl.textContent = `Boss: ${boss.health}`;
    bossHealthEl.classList.remove("hidden");
  } else {
    bossHealthEl.textContent = "";
    bossHealthEl.classList.add("hidden");
  }
}

function showMessage(text) {
  messageEl.textContent = text;
  messageEl.classList.remove("hidden");
}

function hideMessage() {
  messageEl.classList.add("hidden");
}

function fireBullet() {
  bullets.push({
    x: player.x + player.width / 2 - 3,
    y: player.y - 10,
    width: 6,
    height: 14,
  });
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
}

function updateBullets() {
  bullets.forEach((bullet) => {
    bullet.y -= 14;
  });

  bullets = bullets.filter((bullet) => bullet.y + bullet.height > 0);
}

function getBottomInvaders() {
  const bottomByColumn = {};
  invaders.forEach((invader) => {
    if (!invader.alive) return;
    const column = Math.round(invader.x / 60);
    if (!bottomByColumn[column] || invader.y > bottomByColumn[column].y) {
      bottomByColumn[column] = invader;
    }
  });
  const shooters = Object.values(bottomByColumn);
  if (boss && boss.alive) {
    shooters.push(boss);
  }
  return shooters;
}

function fireEnemyBullets() {
  const bottomInvaders = getBottomInvaders();
  if (bottomInvaders.length === 0) return;

  const shots = Math.min(2, Math.max(1, Math.floor(level / 3)));
  const availableInvaders = [...bottomInvaders];

  for (let i = 0; i < shots && availableInvaders.length > 0; i += 1) {
    const index = Math.floor(Math.random() * availableInvaders.length);
    const invader = availableInvaders.splice(index, 1)[0];
    enemyBullets.push({
      x: invader.x + invader.width / 2 - 3,
      y: invader.y + invader.height + 6,
      width: 6,
      height: 14,
    });
  }
}

function updateEnemyBullets() {
  enemyFireTimer -= 1;
  if (enemyFireTimer <= 0) {
    fireEnemyBullets();
    enemyFireTimer = Math.max(20, 45 - level * 3 + Math.random() * 20);
  }

  enemyBullets.forEach((bullet) => {
    bullet.y += 7 + level * 0.18;
  });

  enemyBullets = enemyBullets.filter((bullet) => bullet.y < gameHeight);
}

function updateInvaders(delta) {
  const moveDistance = invaderSpeed * delta;
  if (boss && boss.alive) {
    boss.x += boss.direction * moveDistance * 0.7;
    if (boss.x <= 10) {
      boss.x = 10;
      boss.direction = 1;
    }
    if (boss.x + boss.width >= gameWidth - 10) {
      boss.x = gameWidth - boss.width - 10;
      boss.direction = -1;
    }
    return;
  }

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
    if (boss && boss.alive &&
      bullet.x < boss.x + boss.width &&
      bullet.x + bullet.width > boss.x &&
      bullet.y < boss.y + boss.height &&
      bullet.y + bullet.height > boss.y
    ) {
      boss.health -= 1;
      bullet.y = -100;
      createExplosion(boss.x + boss.width / 2, boss.y + boss.height / 2, "#ff5555", 18);
      if (boss.health <= 0) {
        boss.alive = false;
        score += 200 + level * 10;
        createExplosion(boss.x + boss.width / 2, boss.y + boss.height / 2, "#ff3333", 28);
      }
      return;
    }

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
  const bossAlive = boss && boss.alive;

  aliveInvaders.forEach((invader) => {
    if (invader.y + invader.height >= player.y) {
      lives = 0;
      triggerGameOver();
    }
  });

  if (bossAlive && boss.y + boss.height >= player.y) {
    lives = 0;
    triggerGameOver();
  }

  if (!bossAlive && aliveInvaders.length === 0) {
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

function drawBoss() {
  if (!boss || !boss.alive) return;
  ctx.fillStyle = "#ff4f4f";
  ctx.fillRect(boss.x, boss.y, boss.width, boss.height);
  ctx.fillStyle = "#ffeb80";
  ctx.fillRect(boss.x + 12, boss.y + 12, boss.width - 24, 8);
  ctx.fillStyle = "#fff";
  ctx.fillRect(boss.x + 12, boss.y + boss.height - 14, (boss.width - 24) * (boss.health / boss.maxHealth), 8);
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
  drawBoss();
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

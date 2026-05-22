const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const scoreEl = document.getElementById("score");
const livesEl = document.getElementById("lives");
const levelEl = document.getElementById("level");
const bossHealthEl = document.getElementById("bossHealth");
const messageEl = document.getElementById("message");
const hudEl = document.querySelector(".hud");
const playerNameDisplay = document.getElementById("playerNameDisplay");
const rankEl = document.getElementById("rank");
const leaderboardEl = document.getElementById("leaderboard");
const nameScreenEl = document.getElementById("nameScreen");
const playerNameInput = document.getElementById("playerName");
const startBtn = document.getElementById("startBtn");

const gameWidth = canvas.width;
const gameHeight = canvas.height;
const keys = {};

let score = 0;
let lives = 3;
let level = 1;
let state = "name";
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
let playerName = "";
let currentRank = "--";

const player = {
  width: 40,
  height: 16,
  x: gameWidth / 2 - 20,
  y: gameHeight - 60,
  speed: 6,
};

function blankHighScores() {
  return Array.from({ length: 10 }, () => ({ name: "---", score: 0, level: 0 }));
}

function loadHighScores() {
  const stored = localStorage.getItem("spaceInvadersHighScores");
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) {
        highScores = parsed;
        return;
      }
    } catch (error) {
      // ignore invalid stored data and reset to defaults
    }
  }
  highScores = blankHighScores();
}

function saveHighScores() {
  localStorage.setItem("spaceInvadersHighScores", JSON.stringify(highScores));
}

function addHighScore(finalScore, finalLevel, name) {
  const entry = { name: name.toUpperCase() || "ANON", score: finalScore, level: finalLevel };
  highScores.push(entry);
  highScores.sort((a, b) => b.score - a.score);
  highScores = highScores.slice(0, 10);
  saveHighScores();
  
  // Find current player's rank
  const rankIndex = highScores.findIndex(hs => hs.name === entry.name && hs.score === finalScore && hs.level === finalLevel);
  currentRank = rankIndex >= 0 ? `#${rankIndex + 1}` : "--";
  
  return rankIndex >= 0;
}

function updateLeaderboard() {
  leaderboardEl.innerHTML = "";
  highScores.slice(0, 5).forEach((entry, i) => {
    const div = document.createElement("div");
    div.className = "leaderboard-entry";
    if (entry.name === playerName.toUpperCase()) {
      div.classList.add("current");
    } else if (i === 0) {
      div.classList.add("gold");
    }
    const displayName = entry.name.substring(0, 10);
    div.textContent = `${i + 1}. ${displayName} ${entry.score}`;
    leaderboardEl.appendChild(div);
  });
}

function formatHighScores() {
  let text = "╔════════════════════════╗\n";
  text += "║   ⭐ HONOR ROLL ⭐    ║\n";
  text += "╚════════════════════════╝\n\n";
  highScores.slice(0, 5).forEach((entry, i) => {
    if (entry.score > 0) {
      const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : "  ";
      text += `${medal} #${i + 1} ${entry.name.padEnd(12)} ${entry.score}\n`;
    } else {
      text += `    #${i + 1} ---\n`;
    }
  });
  return text;
}

function triggerGameOver() {
  if (state === "gameover") {
    return;
  }
  state = "gameover";
  setHUDHidden(true);
  addHighScore(score, level, playerName);
  updateLeaderboard();
  updateHUD();
  const hsText = formatHighScores();
  showMessage(`⚔ BATTLE ENDED ⚔\n\nWARRIOR RANK: ${currentRank}\nFINAL HONOR: ${score}\nSTAGE: ${level}\n\n${hsText}\nPress ENTER to fight again`);
}

function resetGame() {
  setHUDHidden(false);
  score = 0;
  lives = 3;
  level = 1;
  player.x = gameWidth / 2 - player.width / 2;
  bullets = [];
  enemyBullets = [];
  particles = [];
  screenShake = 0;
  animationFrame = 0;
  enemyFireTimer = 60;
  createInvaders();
  createBunkers();
  updateHUD();
  updateLeaderboard();
  showMessage("Press ENTER to begin battle");
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

function createExplosion(x, y, color = "#d4af37", count = 8) {
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
  scoreEl.textContent = `HONOR: ${score}`;
  livesEl.textContent = `LIVES: ${lives}`;
  levelEl.textContent = `STAGE: ${level}`;
  playerNameDisplay.textContent = `戦士: ${playerName.toUpperCase()}`;
  rankEl.textContent = `RANK: ${currentRank}`;
  if (boss && boss.alive) {
    bossHealthEl.textContent = `BOSS ALERT: ${boss.health}/${boss.maxHealth}`;
    bossHealthEl.classList.remove("hidden");
  } else {
    bossHealthEl.textContent = "";
    bossHealthEl.classList.add("hidden");
  }
}

function setHUDHidden(hidden) {
  hudEl.classList.toggle("hidden", hidden);
}

function showMessage(text) {
  messageEl.textContent = text;
  messageEl.classList.remove("hidden");
}

function hideMessage() {
  messageEl.classList.add("hidden");
  if (state !== "gameover") {
    setHUDHidden(false);
  }
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
      createExplosion(boss.x + boss.width / 2, boss.y + boss.height / 2, "#c41e3a", 18);
      if (boss.health <= 0) {
        boss.alive = false;
        score += 200 + level * 10;
        createExplosion(boss.x + boss.width / 2, boss.y + boss.height / 2, "#8b0000", 28);
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
        createExplosion(invader.x + invader.width / 2, invader.y + invader.height / 2, "#d4af37");
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
        createExplosion(block.x + block.width / 2, block.y + block.height / 2, "#8b7355", 4);
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
      createExplosion(player.x + player.width / 2, player.y + player.height / 2, "#c41e3a", 12);
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
        createExplosion(block.x + block.width / 2, block.y + block.height / 2, "#8b7355", 4);
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
    showMessage(`⚡ STAGE ${level} ⚡\nPress ENTER to continue`);
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

  if (lives <= 0 && state !== "gameover") {
    triggerGameOver();
  }

  updateHUD();
}

function drawPlayer() {
  ctx.fillStyle = "#d4af37";
  ctx.fillRect(player.x, player.y, player.width, player.height);
  ctx.fillStyle = "#e8b876";
  ctx.fillRect(player.x + 10, player.y - 6, 20, 6);
  // Glow effect
  ctx.shadowColor = "rgba(212, 175, 55, 0.6)";
  ctx.shadowBlur = 12;
  ctx.strokeStyle = "#e8b876";
  ctx.lineWidth = 1;
  ctx.strokeRect(player.x - 2, player.y - 2, player.width + 4, player.height + 4);
  ctx.shadowColor = "transparent";
}

function drawBullets() {
  ctx.fillStyle = "#e8b876";
  ctx.shadowColor = "rgba(232, 184, 118, 0.6)";
  ctx.shadowBlur = 8;
  bullets.forEach((bullet) => {
    ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
  });
  ctx.shadowColor = "transparent";
}

function drawEnemyBullets() {
  ctx.fillStyle = "#c41e3a";
  ctx.shadowColor = "rgba(196, 30, 58, 0.5)";
  ctx.shadowBlur = 8;
  enemyBullets.forEach((bullet) => {
    ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
  });
  ctx.shadowColor = "transparent";
}

function drawBunkers() {
  bunkers.forEach((block) => {
    ctx.fillStyle = block.health === 2 ? "#8b7355" : "#a0826d";
    ctx.shadowColor = "rgba(139, 115, 85, 0.3)";
    ctx.shadowBlur = 5;
    ctx.fillRect(block.x, block.y, block.width, block.height);
  });
  ctx.shadowColor = "transparent";
}

function drawInvaders() {
  invaders.forEach((invader) => {
    if (!invader.alive) return;
    const animPhase = Math.floor((animationFrame + invader.animOffset) / 8) % 2;
    const color = invader.row % 2 === 0 ? "#c41e3a" : "#8b4513";
    ctx.fillStyle = color;
    const offsetX = animPhase === 0 ? 0 : 2;
    ctx.shadowColor = invader.row % 2 === 0 ? "rgba(196, 30, 58, 0.3)" : "rgba(139, 69, 19, 0.3)";
    ctx.shadowBlur = 8;
    ctx.fillRect(invader.x + offsetX, invader.y, invader.width - (animPhase === 0 ? 0 : 4), invader.height);
    ctx.fillStyle = "rgba(232, 184, 118, 0.2)";
    ctx.fillRect(invader.x + 8 + offsetX, invader.y + 6, invader.width - 20, 6);
  });
  ctx.shadowColor = "transparent";
}

function drawBoss() {
  if (!boss || !boss.alive) return;
  ctx.fillStyle = "#c41e3a";
  ctx.shadowColor = "rgba(196, 30, 58, 0.5)";
  ctx.shadowBlur = 15;
  ctx.fillRect(boss.x, boss.y, boss.width, boss.height);
  
  ctx.fillStyle = "#d4af37";
  ctx.shadowColor = "rgba(212, 175, 55, 0.4)";
  ctx.shadowBlur = 8;
  ctx.fillRect(boss.x + 12, boss.y + 12, boss.width - 24, 8);
  
  ctx.fillStyle = "#e8b876";
  ctx.shadowColor = "rgba(232, 184, 118, 0.4)";
  ctx.shadowBlur = 10;
  ctx.fillRect(boss.x + 12, boss.y + boss.height - 14, (boss.width - 24) * (boss.health / boss.maxHealth), 8);
  
  ctx.shadowColor = "transparent";
}

function drawParticles() {
  particles.forEach((p) => {
    const alpha = p.life / p.maxLife;
    ctx.globalAlpha = alpha * 0.8;
    ctx.fillStyle = p.color;
    ctx.shadowColor = p.color;
    ctx.shadowBlur = 5;
    ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
    ctx.globalAlpha = 1;
  });
  ctx.shadowColor = "transparent";
}

function drawGrid() {
  ctx.strokeStyle = "rgba(212, 175, 55, 0.04)";
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

// Event Listeners
window.addEventListener("keydown", (event) => {
  const isEnter = event.key === "Enter" || event.code === "Enter" || event.code === "NumpadEnter" || event.keyCode === 13;
  const isSpace = event.key === " " || event.code === "Space" || event.keyCode === 32;

  if (isEnter) {
    console.log('[game] Enter pressed — state=', state);
    // If we're on the name screen, accept the name and go to ready
    if (state === "name") {
      if (playerNameInput.value.trim()) {
        playerName = playerNameInput.value.trim();
        nameScreenEl.classList.remove("active");
        updateHUD();
        resetGame();
      }
      event.preventDefault();
      return;
    }

    // If ready or after level up, start playing
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
      event.preventDefault();
      return;
    }

    // If game over, bring back name entry
    if (state === "gameover") {
      nameScreenEl.classList.add("active");
      playerNameInput.value = "";
      state = "name";
      playerNameInput.focus();
      event.preventDefault();
      return;
    }
  }

  if (isSpace) {
    event.preventDefault();
    keys.Space = true;
  }

  keys[event.code || event.key] = true;
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

// Start Button Handler
startBtn.addEventListener("click", () => {
  if (playerNameInput.value.trim()) {
    playerName = playerNameInput.value.trim();
    nameScreenEl.classList.remove("active");
    updateHUD();
    resetGame();
  }
});

// Focus input on load
playerNameInput.addEventListener("keydown", (event) => {
  const isEnter = event.key === "Enter" || event.code === "Enter" || event.code === "NumpadEnter" || event.keyCode === 13;
  if (isEnter && playerNameInput.value.trim()) {
    startBtn.click();
    event.preventDefault();
  }
});

loadHighScores();
updateLeaderboard();
requestAnimationFrame((timestamp) => {
  lastTime = timestamp;
  render();
  requestAnimationFrame(gameLoop);
});

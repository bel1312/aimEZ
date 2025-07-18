const gameArea = document.getElementById("game-area");
const scoreDisplay = document.getElementById("score");
const timerDisplay = document.getElementById("timer");
const accuracyDisplay = document.getElementById("accuracy");
const startBtn = document.getElementById("start-btn");
const stopBtn = document.getElementById("stop-btn");
const gameModeSelect = document.getElementById("game-mode");
const targetDurationSelect = document.getElementById("target-duration");

let score = 0;
let totalShots = 0;
let hits = 0;
let timeLeft = 30;
let gameActive = false;
let timerInterval = null;
let targetTimeout = null;
let currentGameMode = "standard";
let targetDuration = 1; // Default target duration in seconds
let isPointerLocked = false;
let customCursor = null;

function randomPosition() {
  const areaRect = gameArea.getBoundingClientRect();
  const size = 48; // target size
  const x = Math.random() * (areaRect.width - size);
  const y = Math.random() * (areaRect.height - size);
  return { x, y };
}

function spawnTarget() {
  removeTarget();
  const target = document.createElement("div");
  target.classList.add("target");
  const { x, y } = randomPosition();
  target.style.left = `${x}px`;
  target.style.top = `${y}px`;
  target.addEventListener("click", hitTarget);
  gameArea.appendChild(target);

  // Set timeout to remove target if not hit within the specified duration
  if (targetDuration > 0) {
    targetTimeout = setTimeout(() => {
      if (gameActive) {
        removeTarget();
        spawnTarget(); // Spawn a new target
        totalShots++; // Count as a miss
        updateHUD();
      }
    }, targetDuration * 1000);
  }
}

function removeTarget() {
  const existing = document.querySelector(".target");
  if (existing) existing.remove();

  // Clear any existing timeout
  if (targetTimeout) {
    clearTimeout(targetTimeout);
    targetTimeout = null;
  }
}

// Create custom cursor element
function createCustomCursor() {
  // Remove existing custom cursor if any
  if (customCursor) {
    customCursor.remove();
  }

  // Create new custom cursor
  customCursor = document.createElement("div");
  customCursor.id = "custom-cursor";
  customCursor.style.position = "absolute";
  customCursor.style.width = "32px";
  customCursor.style.height = "32px";
  customCursor.style.backgroundImage =
    'url(\'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"%3E%3Ccircle cx="16" cy="16" r="14" fill="none" stroke="green" stroke-width="1.5"/%3E%3Ccircle cx="16" cy="16" r="2" fill="green"/%3E%3Cline x1="16" y1="4" x2="16" y2="12" stroke="green" stroke-width="1.5"/%3E%3Cline x1="16" y1="20" x2="16" y2="28" stroke="green" stroke-width="1.5"/%3E%3Cline x1="4" y1="16" x2="12" y2="16" stroke="green" stroke-width="1.5"/%3E%3Cline x1="20" y1="16" x2="28" y2="16" stroke="green" stroke-width="1.5"/%3E%3C/svg%3E\')';
  customCursor.style.backgroundSize = "contain";
  customCursor.style.backgroundRepeat = "no-repeat";
  customCursor.style.pointerEvents = "none"; // Make sure it doesn't interfere with clicks
  customCursor.style.zIndex = "1000";
  customCursor.style.transform = "translate(-50%, -50%)"; // Center the cursor

  // Add to game area
  gameArea.appendChild(customCursor);

  return customCursor;
}

// Update custom cursor position
function updateCustomCursorPosition(x, y) {
  if (customCursor) {
    customCursor.style.left = `${x}px`;
    customCursor.style.top = `${y}px`;
  }
}

// Setup pointer lock
function setupPointerLock() {
  // Pointer lock object forking for cross browser
  gameArea.requestPointerLock =
    gameArea.requestPointerLock ||
    gameArea.mozRequestPointerLock ||
    gameArea.webkitRequestPointerLock;

  document.exitPointerLock =
    document.exitPointerLock ||
    document.mozExitPointerLock ||
    document.webkitExitPointerLock;

  // Hook pointer lock state change events
  document.addEventListener("pointerlockchange", lockChangeAlert, false);
  document.addEventListener("mozpointerlockchange", lockChangeAlert, false);
  document.addEventListener("webkitpointerlockchange", lockChangeAlert, false);

  // Create custom cursor
  createCustomCursor();

  // Set initial position to center of game area
  const areaRect = gameArea.getBoundingClientRect();
  const centerX = areaRect.width / 2;
  const centerY = areaRect.height / 2;
  updateCustomCursorPosition(centerX, centerY);

  // Add mouse movement listener
  document.addEventListener("mousemove", updateCursorOnMouseMove, false);
}

function lockChangeAlert() {
  if (
    document.pointerLockElement === gameArea ||
    document.mozPointerLockElement === gameArea ||
    document.webkitPointerLockElement === gameArea
  ) {
    // Pointer was just locked
    isPointerLocked = true;
    // Add mousemove listener for locked state
    document.addEventListener("mousemove", updateCursorOnPointerLock, false);
  } else {
    // Pointer was just unlocked
    isPointerLocked = false;
    // Remove mousemove listener for locked state
    document.removeEventListener("mousemove", updateCursorOnPointerLock, false);
  }
}

// Track cursor position when pointer is locked
let cursorX = 0;
let cursorY = 0;

function updateCursorOnPointerLock(e) {
  if (isPointerLocked && customCursor) {
    // Get movement - use raw movement values without any acceleration
    const movementX = e.movementX || e.mozMovementX || e.webkitMovementX || 0;
    const movementY = e.movementY || e.mozMovementY || e.webkitMovementY || 0;

    // Update cursor position with a fixed sensitivity (1:1 ratio)
    const areaRect = gameArea.getBoundingClientRect();
    cursorX += movementX;
    cursorY += movementY;

    // Clamp to game area bounds
    cursorX = Math.max(0, Math.min(areaRect.width, cursorX));
    cursorY = Math.max(0, Math.min(areaRect.height, cursorY));

    // Update custom cursor position
    updateCustomCursorPosition(cursorX, cursorY);
  }
}

function updateCursorOnMouseMove(e) {
  if (!isPointerLocked && customCursor) {
    const areaRect = gameArea.getBoundingClientRect();
    const x = e.clientX - areaRect.left;
    const y = e.clientY - areaRect.top;

    // Update cursor position directly to match actual mouse position
    cursorX = x;
    cursorY = y;

    // Update custom cursor position
    updateCustomCursorPosition(x, y);
  }
}

function resetCursorPosition() {
  if (currentGameMode === "quickscope" && gameActive) {
    // Get game area dimensions
    const areaRect = gameArea.getBoundingClientRect();
    const centerX = areaRect.width / 2;
    const centerY = areaRect.height / 2;

    // Reset cursor position variables
    cursorX = centerX;
    cursorY = centerY;

    // Update custom cursor position
    updateCustomCursorPosition(centerX, centerY);

    // If we're in quick scope mode, lock the pointer if not already locked
    if (!isPointerLocked) {
      gameArea.requestPointerLock();
    }
  }
}

function hitTarget(e) {
  if (!gameActive) return;
  score++;
  hits++;
  totalShots++;
  updateHUD();

  if (currentGameMode === "quickscope") {
    // Remove the current target
    removeTarget();

    // Reset cursor position to center
    resetCursorPosition();

    // Add a delay before spawning the next target
    setTimeout(() => {
      spawnTarget();
    }, 300);
  } else {
    spawnTarget();
  }

  e.stopPropagation();
}

gameArea.addEventListener("click", function (e) {
  if (!gameActive) return;

  // In quick scope mode, lock pointer on first click
  if (currentGameMode === "quickscope" && !isPointerLocked) {
    gameArea.requestPointerLock();
  }

  // Check if we clicked on a target
  const target = e.target.closest(".target");
  if (!target && isPointerLocked) {
    // Check if the custom cursor is over any target
    const targets = document.querySelectorAll(".target");
    let hit = false;

    targets.forEach((target) => {
      const rect = target.getBoundingClientRect();
      const targetX =
        rect.left - gameArea.getBoundingClientRect().left + rect.width / 2;
      const targetY =
        rect.top - gameArea.getBoundingClientRect().top + rect.height / 2;

      // Calculate distance between cursor and target center
      const distance = Math.sqrt(
        Math.pow(cursorX - targetX, 2) + Math.pow(cursorY - targetY, 2)
      );

      // If cursor is within target radius, count as hit
      if (distance <= rect.width / 2) {
        hit = true;
        hitTarget({ target, stopPropagation: () => {} });
        return;
      }
    });

    if (!hit) {
      totalShots++;
      updateHUD();
    }
  } else if (!target) {
    totalShots++;
    updateHUD();
  }
});

function updateHUD() {
  scoreDisplay.textContent = `Score: ${score}`;
  timerDisplay.textContent = `Time: ${timeLeft}`;
  const accuracy = totalShots > 0 ? Math.round((hits / totalShots) * 100) : 0;
  accuracyDisplay.textContent = `Accuracy: ${accuracy}%`;
}

function startGame() {
  score = 0;
  totalShots = 0;
  hits = 0;
  timeLeft = 30;
  gameActive = true;
  startBtn.disabled = true;
  stopBtn.disabled = false;
  currentGameMode = gameModeSelect.value;
  targetDuration = parseFloat(targetDurationSelect.value);

  // Setup pointer lock for quick scope mode
  if (currentGameMode === "quickscope") {
    setupPointerLock();
  } else {
    // For standard mode, remove custom cursor if exists
    if (customCursor) {
      customCursor.remove();
      customCursor = null;
    }
  }

  updateHUD();
  spawnTarget();
  timerInterval = setInterval(() => {
    timeLeft--;
    updateHUD();
    if (timeLeft <= 0) {
      endGame();
    }
  }, 1000);
}

function stopGame() {
  gameActive = false;
  clearInterval(timerInterval);
  removeTarget(); // This will also clear any target timeout
  startBtn.disabled = false;
  stopBtn.disabled = true;

  // Exit pointer lock if active
  if (isPointerLocked) {
    document.exitPointerLock();
  }

  // Remove custom cursor
  if (customCursor) {
    customCursor.remove();
    customCursor = null;
  }

  // Show game summary
  const accuracy = totalShots > 0 ? Math.round((hits / totalShots) * 100) : 0;
  alert(
    `Game stopped!\nGame Mode: ${
      currentGameMode === "standard" ? "Standard" : "Quick Scope"
    }\nScore: ${score}\nAccuracy: ${accuracy}%`
  );
}

function endGame() {
  gameActive = false;
  clearInterval(timerInterval);
  removeTarget(); // This will also clear any target timeout
  startBtn.disabled = false;
  stopBtn.disabled = true;

  // Exit pointer lock if active
  if (isPointerLocked) {
    document.exitPointerLock();
  }

  // Remove custom cursor
  if (customCursor) {
    customCursor.remove();
    customCursor = null;
  }

  alert(
    `Time's up!\nGame Mode: ${
      currentGameMode === "standard" ? "Standard" : "Quick Scope"
    }\nScore: ${score}\nAccuracy: ${
      totalShots > 0 ? Math.round((hits / totalShots) * 100) : 0
    }%`
  );
}

// Remove default cursor from game area when in quick scope mode
gameModeSelect.addEventListener("change", function () {
  if (this.value === "quickscope") {
    gameArea.style.cursor = "none";
  } else {
    gameArea.style.cursor =
      'url(\'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"%3E%3Ccircle cx="16" cy="16" r="14" fill="none" stroke="green" stroke-width="1.5"/%3E%3Ccircle cx="16" cy="16" r="2" fill="green"/%3E%3Cline x1="16" y1="4" x2="16" y2="12" stroke="green" stroke-width="1.5"/%3E%3Cline x1="16" y1="20" x2="16" y2="28" stroke="green" stroke-width="1.5"/%3E%3Cline x1="4" y1="16" x2="12" y2="16" stroke="green" stroke-width="1.5"/%3E%3Cline x1="20" y1="16" x2="28" y2="16" stroke="green" stroke-width="1.5"/%3E%3C/svg%3E\') 16 16, crosshair';
  }
});

startBtn.addEventListener("click", startGame);
stopBtn.addEventListener("click", stopGame);

// Handle window resize to ensure custom cursor stays within bounds
window.addEventListener("resize", function () {
  if (customCursor && gameActive) {
    const areaRect = gameArea.getBoundingClientRect();
    cursorX = Math.min(cursorX, areaRect.width);
    cursorY = Math.min(cursorY, areaRect.height);
    updateCustomCursorPosition(cursorX, cursorY);
  }
});

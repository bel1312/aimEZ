const gameArea = document.getElementById("game-area");
const scoreDisplay = document.getElementById("score");
const timerDisplay = document.getElementById("timer");
const accuracyDisplay = document.getElementById("accuracy");
const startBtn = document.getElementById("start-btn");
const stopBtn = document.getElementById("stop-btn");
const gameModeSelect = document.getElementById("game-mode");
const targetDurationSelect = document.getElementById("target-duration");
const targetSpeedSelect = document.getElementById("target-speed");
const speedControl = document.getElementById("speed-control");

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
let moveInterval = null;
let targetSpeed = 3; // Speed of moving target in pixels per frame

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

  // For moving target mode, start the movement
  if (currentGameMode === "moving" && gameActive) {
    startTargetMovement(target);
  }

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

// Improved target movement function for smoother animation
function startTargetMovement(target) {
  // Clear any existing movement interval
  if (moveInterval) {
    clearInterval(moveInterval);
  }

  // Generate random direction vector
  const angle = Math.random() * Math.PI * 2;
  const dx = Math.cos(angle) * targetSpeed;
  const dy = Math.sin(angle) * targetSpeed;

  // Store direction on target element
  target.dataset.dx = dx;
  target.dataset.dy = dy;

  // Add visual indicator for moving targets
  target.style.animation = "pulse 1.5s infinite";
  target.style.background = "#26de81"; // Different color for moving targets

  // Set initial position and enable hardware acceleration for smoother movement
  const initialX = parseFloat(target.style.left);
  const initialY = parseFloat(target.style.top);

  // Remove transition to avoid conflicts with requestAnimationFrame
  target.style.transition = "none";
  target.style.transform = "translate3d(0, 0, 0)";

  // Variables to track position
  let posX = initialX;
  let posY = initialY;

  // Use requestAnimationFrame for smoother animation
  let lastTimestamp = null;
  const animate = (timestamp) => {
    if (!gameActive) return;

    if (!lastTimestamp) lastTimestamp = timestamp;
    const deltaTime = timestamp - lastTimestamp;
    lastTimestamp = timestamp;

    // Calculate time-based movement (for consistent speed regardless of frame rate)
    const timeScale = deltaTime / 16; // Normalize to ~60fps

    const areaRect = gameArea.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    const targetWidth = targetRect.width;
    const targetHeight = targetRect.height;

    // Get current direction
    let dx = parseFloat(target.dataset.dx);
    let dy = parseFloat(target.dataset.dy);

    // Calculate new position with time scaling
    posX += dx * timeScale;
    posY += dy * timeScale;

    // Check for collisions with walls and bounce
    if (posX <= 0 || posX + targetWidth >= areaRect.width) {
      dx = -dx;
      target.dataset.dx = dx;
      posX = Math.max(0, Math.min(posX, areaRect.width - targetWidth));
    }

    if (posY <= 0 || posY + targetHeight >= areaRect.height) {
      dy = -dy;
      target.dataset.dy = dy;
      posY = Math.max(0, Math.min(posY, areaRect.height - targetHeight));
    }

    // Update position using transform for smoother rendering
    target.style.left = `${initialX}px`;
    target.style.top = `${initialY}px`;
    target.style.transform = `translate3d(${posX - initialX}px, ${
      posY - initialY
    }px, 0)`;

    // Continue animation loop
    if (gameActive && document.contains(target)) {
      requestAnimationFrame(animate);
    }
  };

  // Start the animation loop
  requestAnimationFrame(animate);
}

function removeTarget() {
  const existing = document.querySelector(".target");
  if (existing) existing.remove();

  // Clear any existing timeout
  if (targetTimeout) {
    clearTimeout(targetTimeout);
    targetTimeout = null;
  }

  // Clear movement interval if exists
  if (moveInterval) {
    clearInterval(moveInterval);
    moveInterval = null;
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

// Update resetCursorPosition to use a more reliable method
function resetCursorPosition() {
  // Get game area dimensions
  const areaRect = gameArea.getBoundingClientRect();
  const centerX = areaRect.width / 2;
  const centerY = areaRect.height / 2;

  // Reset cursor position variables
  cursorX = centerX;
  cursorY = centerY;

  // Update custom cursor position if it exists
  if (customCursor) {
    updateCustomCursorPosition(centerX, centerY);
  }

  // For quick scope mode, ensure pointer is locked
  if (currentGameMode === "quickscope" && !isPointerLocked) {
    gameArea.requestPointerLock();
  }

  // For other modes, we can't reliably move the actual cursor due to browser security
  // Instead, we'll use a visual indicator to show where the cursor should be
  if (currentGameMode === "moving" || currentGameMode === "standard") {
    // Remove any existing cursor indicators
    const existingIndicators = document.querySelectorAll(".cursor-indicator");
    existingIndicators.forEach((indicator) => {
      if (indicator.parentNode) {
        indicator.parentNode.removeChild(indicator);
      }
    });

    // Create a temporary cursor indicator
    const tempCursor = document.createElement("div");
    tempCursor.className = "cursor-indicator";
    tempCursor.style.position = "absolute";
    tempCursor.style.width = "30px";
    tempCursor.style.height = "30px";
    tempCursor.style.borderRadius = "50%";
    tempCursor.style.backgroundColor = "rgba(255, 255, 255, 0.5)";
    tempCursor.style.border = "2px solid white";
    tempCursor.style.zIndex = "1000";
    tempCursor.style.transform = "translate(-50%, -50%)";
    tempCursor.style.left = `${centerX}px`;
    tempCursor.style.top = `${centerY}px`;
    tempCursor.style.pointerEvents = "none";

    // Add crosshair lines
    const crosshairHTML = `
      <div style="position: absolute; width: 100%; height: 2px; background: white; top: 50%; left: 0;"></div>
      <div style="position: absolute; width: 2px; height: 100%; background: white; left: 50%; top: 0;"></div>
    `;
    tempCursor.innerHTML = crosshairHTML;

    // Add animation
    tempCursor.style.animation = "cursorPulse 0.8s ease-out";

    // Add to game area
    gameArea.appendChild(tempCursor);

    // Remove after animation completes
    setTimeout(() => {
      if (tempCursor.parentNode) {
        tempCursor.parentNode.removeChild(tempCursor);
      }
    }, 800);
  }
}

// Add a new function to handle cursor centering for all game modes
function handleCursorCentering() {
  // Only center cursor if game is active
  if (!gameActive) return;

  // Center cursor for all game modes
  resetCursorPosition();
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
  } else if (currentGameMode === "moving") {
    // Remove the current target
    removeTarget();

    // Reset cursor position to center for moving target mode too
    handleCursorCentering();

    // Spawn a new target
    spawnTarget();
  } else {
    // For standard mode
    removeTarget();
    handleCursorCentering();
    spawnTarget();
  }

  e.stopPropagation();
}

// Update the game area click handler
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

      // Center cursor after each miss in all game modes
      handleCursorCentering();
    }
  } else if (!target) {
    totalShots++;
    updateHUD();

    // Center cursor after each miss in all game modes
    handleCursorCentering();
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

  // Set target speed if in moving target mode
  if (currentGameMode === "moving") {
    targetSpeed = parseInt(targetSpeedSelect.value);
  }

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

  // Center cursor at the start of the game
  resetCursorPosition();

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
  let gameModeName = "Standard";
  if (currentGameMode === "quickscope") gameModeName = "Quick Scope";
  if (currentGameMode === "moving") gameModeName = "Moving Target";

  alert(
    `Game stopped!\nGame Mode: ${gameModeName}\nScore: ${score}\nAccuracy: ${accuracy}%`
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

  let gameModeName = "Standard";
  if (currentGameMode === "quickscope") gameModeName = "Quick Scope";
  if (currentGameMode === "moving") gameModeName = "Moving Target";

  alert(
    `Time's up!\nGame Mode: ${gameModeName}\nScore: ${score}\nAccuracy: ${
      totalShots > 0 ? Math.round((hits / totalShots) * 100) : 0
    }%`
  );
}

// Show/hide speed control based on game mode selection
gameModeSelect.addEventListener("change", function () {
  if (this.value === "moving") {
    speedControl.style.display = "flex";
  } else {
    speedControl.style.display = "none";
  }

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

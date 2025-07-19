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

// Quick reflex mode variables
let reflexRound = 0;
let reflexTimes = [];
let reflexStartTime = 0;
let reflexTimeout = null;
let reflexState = "idle"; // idle, wait, go, early, results

// Flick shot mode variables
let flickDifficulty = "medium"; // easy, medium, hard
let lastTargetPosition = null; // To ensure targets spawn far from each other
let flickTargetSize = 48; // Size of flick targets in pixels
let flickConsecutiveHits = 0; // Track consecutive hits for combo scoring

// Tracking mode variables
let trackingPattern = "circular"; // linear, circular, random, zigzag
let trackingTarget = null;
let trackingScoreInterval = null;
let trackingAnimationFrame = null;
let trackingScore = 0;
let trackingMultiplier = 1;
let trackingStreak = 0;
let trackingMaxStreak = 0;
let trackingLastPosition = { x: 0, y: 0 };
let trackingCurrentAngle = 0;
let trackingDirection = 1;
let trackingPathPoints = [];

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

  // For flick mode, count misses when clicking on the game area (not on a target)
  if (currentGameMode === "flick") {
    // Only count as a miss if not clicking on a target
    if (!e.target.closest(".target")) {
      totalShots++;
      flickConsecutiveHits = 0; // Reset combo on miss
      updateHUD();
    }
    return;
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

  // Set flick difficulty if in flick mode
  if (currentGameMode === "flick") {
    const flickDifficultySelect = document.getElementById("flick-difficulty");
    flickDifficulty = flickDifficultySelect.value;
  }

  // Set tracking pattern if in tracking mode
  if (currentGameMode === "tracking") {
    const trackingPatternSelect = document.getElementById("tracking-pattern");
    trackingPattern = trackingPatternSelect.value;
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

  // Start appropriate game mode
  if (currentGameMode === "reflex") {
    startReflexMode();
  } else if (currentGameMode === "flick") {
    startFlickMode();
    updateHUD();
    timerInterval = setInterval(() => {
      timeLeft--;
      updateHUD();
      if (timeLeft <= 0) {
        endGame();
      }
    }, 1000);
  } else if (currentGameMode === "tracking") {
    startTrackingMode();
    timerInterval = setInterval(() => {
      timeLeft--;
      updateTrackingHUD();
      if (timeLeft <= 0) {
        endGame();
      }
    }, 1000);
  } else {
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

  // Clean up reflex mode if active
  cleanupReflexMode();

  // Clean up any combo effects
  const comboEffects = document.querySelectorAll(".combo-effect");
  comboEffects.forEach((effect) => effect.remove());

  // Clean up tracking mode if active
  if (currentGameMode === "tracking") {
    cleanupTrackingMode();
  }

  // Show game summary
  const accuracy = totalShots > 0 ? Math.round((hits / totalShots) * 100) : 0;
  let gameModeName = "Standard";
  if (currentGameMode === "quickscope") gameModeName = "Quick Scope";
  if (currentGameMode === "moving") gameModeName = "Moving Target";
  if (currentGameMode === "reflex") gameModeName = "Quick Reflex";
  if (currentGameMode === "flick") gameModeName = "Flick Shot";
  if (currentGameMode === "tracking") gameModeName = "Tracking";

  if (currentGameMode !== "reflex") {
    let summaryMessage = `Game stopped!\nGame Mode: ${gameModeName}\nScore: ${score}`;

    if (currentGameMode === "tracking") {
      summaryMessage += `\nMax Streak: ${trackingMaxStreak}`;
    } else {
      summaryMessage += `\nAccuracy: ${accuracy}%`;
    }

    alert(summaryMessage);
  }
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

  // Clean up reflex mode if active
  cleanupReflexMode();

  // Clean up any combo effects
  const comboEffects = document.querySelectorAll(".combo-effect");
  comboEffects.forEach((effect) => effect.remove());

  // Clean up tracking mode if active
  if (currentGameMode === "tracking") {
    cleanupTrackingMode();
  }

  let gameModeName = "Standard";
  if (currentGameMode === "quickscope") gameModeName = "Quick Scope";
  if (currentGameMode === "moving") gameModeName = "Moving Target";
  if (currentGameMode === "reflex") gameModeName = "Quick Reflex";
  if (currentGameMode === "flick") gameModeName = "Flick Shot";
  if (currentGameMode === "tracking") gameModeName = "Tracking";

  if (currentGameMode !== "reflex") {
    let summaryMessage = `Time's up!\nGame Mode: ${gameModeName}\nScore: ${score}`;

    if (currentGameMode === "tracking") {
      summaryMessage += `\nMax Streak: ${trackingMaxStreak}`;
    } else {
      summaryMessage += `\nAccuracy: ${
        totalShots > 0 ? Math.round((hits / totalShots) * 100) : 0
      }%`;
    }

    alert(summaryMessage);
  }
}

// Quick Reflex Mode Functions
function startReflexMode() {
  // Reset reflex mode variables
  reflexRound = 0;
  reflexTimes = [];
  reflexState = "idle";

  // Hide HUD elements that aren't relevant
  scoreDisplay.textContent = "Quick Reflex Mode";
  timerDisplay.textContent = "";
  accuracyDisplay.textContent = "";

  // Perform a calibration test to measure system delay
  calibrateReflexSystem();
}

// System calibration to account for browser/system delays
let systemDelayOffset = 0;

function calibrateReflexSystem() {
  // Create a temporary invisible element for calibration
  const calibrationElement = document.createElement("div");
  calibrationElement.style.position = "absolute";
  calibrationElement.style.opacity = "0";
  calibrationElement.style.pointerEvents = "none";
  document.body.appendChild(calibrationElement);

  // Measure the time between requestAnimationFrame and setTimeout
  // This helps account for some system delays
  const startTime = performance.now();

  requestAnimationFrame(() => {
    const rafTime = performance.now();
    setTimeout(() => {
      const setTimeoutTime = performance.now();
      // Calculate average system delay
      systemDelayOffset = Math.min(30, (setTimeoutTime - rafTime) / 2);

      // Clean up
      document.body.removeChild(calibrationElement);

      // Start the first round
      startReflexRound();
    }, 0);
  });
}

function startReflexRound() {
  if (!gameActive) return;

  reflexRound++;

  // Create or update the reflex mode container
  let reflexContainer = document.querySelector(".reflex-mode");
  if (!reflexContainer) {
    reflexContainer = document.createElement("div");
    reflexContainer.className = "reflex-mode wait";
    gameArea.appendChild(reflexContainer);
  } else {
    reflexContainer.className = "reflex-mode wait";
  }

  // Add instruction text
  const textElement = document.createElement("div");
  textElement.className = "reflex-text";
  textElement.textContent = "WAIT FOR GREEN, THEN CLICK!";
  reflexContainer.innerHTML = "";
  reflexContainer.appendChild(textElement);

  // Set state to wait
  reflexState = "wait";

  // Set a random timeout between 1-7 seconds
  const randomDelay = Math.floor(Math.random() * 6000) + 1000; // 1000-7000ms

  // Use requestAnimationFrame for more precise timing
  let startWaitTime = performance.now();

  // Cancel any existing animation frame
  if (window.reflexAnimationFrameId) {
    cancelAnimationFrame(window.reflexAnimationFrameId);
  }

  const waitLoop = (timestamp) => {
    if (!gameActive || reflexState !== "wait") {
      cancelAnimationFrame(window.reflexAnimationFrameId);
      window.reflexAnimationFrameId = null;
      return;
    }

    const elapsedTime = performance.now() - startWaitTime;

    if (elapsedTime >= randomDelay) {
      // Change to green
      reflexContainer.className = "reflex-mode go";
      textElement.textContent = "CLICK NOW!";
      reflexState = "go";

      // Use high resolution timestamp and account for system delay
      reflexStartTime = performance.now();

      // Cancel the animation frame
      cancelAnimationFrame(window.reflexAnimationFrameId);
      window.reflexAnimationFrameId = null;
    } else {
      // Continue the loop
      window.reflexAnimationFrameId = requestAnimationFrame(waitLoop);
    }
  };

  // Start the animation frame loop
  window.reflexAnimationFrameId = requestAnimationFrame(waitLoop);

  // Add click handler with passive option for better performance
  reflexContainer.onclick = handleReflexClick;
}

function handleReflexClick(e) {
  if (!gameActive) return;

  // Capture click time immediately for maximum accuracy
  const clickTime = performance.now();

  const reflexContainer = document.querySelector(".reflex-mode");
  if (!reflexContainer) return;

  if (reflexState === "wait") {
    // Clicked too early
    reflexState = "early";
    reflexContainer.className = "reflex-mode early";
    const textElement = reflexContainer.querySelector(".reflex-text");
    if (textElement) {
      textElement.textContent = "Too early! Click to try again.";
    }
  } else if (reflexState === "go") {
    // Calculate reaction time, adjusting for system delay
    const reactionTime = Math.max(
      0,
      clickTime - reflexStartTime - systemDelayOffset
    );
    reflexTimes.push(reactionTime);

    // Update state
    reflexState = "idle";

    if (reflexRound < 5) {
      // Show reaction time briefly
      reflexContainer.className = "reflex-mode";
      reflexContainer.innerHTML = `<div class="reflex-text">Reaction Time: ${reactionTime.toFixed(
        1
      )} ms<br>Click for next round</div>`;
      reflexContainer.onclick = () => {
        if (gameActive) {
          startReflexRound();
        }
      };
    } else {
      // Show final results after 5 rounds
      showReflexResults();
    }
  } else if (reflexState === "early") {
    // Retry after clicking too early
    startReflexRound();
  }

  e.stopPropagation();
}

function showReflexResults() {
  if (!gameActive) return;

  // Calculate average reaction time
  const validTimes = reflexTimes.filter((time) => time > 0);
  const avgTime =
    validTimes.length > 0
      ? validTimes.reduce((sum, time) => sum + time, 0) / validTimes.length
      : 0;

  // Create results container
  const resultsContainer = document.createElement("div");
  resultsContainer.className = "reflex-results";

  // Create results content
  let resultsHTML = `
    <h2>Reaction Time Results</h2>
    <ul>
  `;

  // Add each round's time
  for (let i = 0; i < reflexTimes.length; i++) {
    resultsHTML += `<li><span>Round ${i + 1}:</span> <span>${reflexTimes[
      i
    ].toFixed(1)} ms</span></li>`;
  }

  resultsHTML += `
    </ul>
    <div class="average">Average: ${avgTime.toFixed(1)} ms</div>
    <p style="font-size: 0.9rem; opacity: 0.8;">System delay compensation: ${systemDelayOffset.toFixed(
      1
    )} ms</p>
    <button id="reflex-continue">Continue</button>
    <button id="reflex-restart">Restart</button>
  `;

  resultsContainer.innerHTML = resultsHTML;
  gameArea.appendChild(resultsContainer);

  // Add event listeners to buttons
  document.getElementById("reflex-continue").addEventListener("click", () => {
    cleanupReflexMode();
    endGame();
  });

  document.getElementById("reflex-restart").addEventListener("click", () => {
    cleanupReflexMode();
    startReflexMode();
  });
}

function cleanupReflexMode() {
  // Clear any pending timeouts
  if (reflexTimeout) {
    clearTimeout(reflexTimeout);
    reflexTimeout = null;
  }

  // Cancel any pending animation frames
  if (window.reflexAnimationFrameId) {
    cancelAnimationFrame(window.reflexAnimationFrameId);
    window.reflexAnimationFrameId = null;
  }

  // Remove reflex containers
  const reflexContainer = document.querySelector(".reflex-mode");
  if (reflexContainer) {
    reflexContainer.remove();
  }

  const resultsContainer = document.querySelector(".reflex-results");
  if (resultsContainer) {
    resultsContainer.remove();
  }

  // Reset state
  reflexState = "idle";
}

// Flick Shot Mode Functions
function startFlickMode() {
  // Reset flick mode variables
  flickConsecutiveHits = 0;
  lastTargetPosition = null;

  // Spawn first target
  spawnFlickTarget();
}

function spawnFlickTarget() {
  removeTarget(); // Remove any existing target

  const target = document.createElement("div");
  target.classList.add("target", "flick-target");

  // Get position based on difficulty
  const position = getFlickTargetPosition();

  target.style.left = `${position.x}px`;
  target.style.top = `${position.y}px`;

  // Adjust size based on difficulty
  if (flickDifficulty === "easy") {
    target.style.width = `${flickTargetSize}px`;
    target.style.height = `${flickTargetSize}px`;
  } else if (flickDifficulty === "medium") {
    target.style.width = `${flickTargetSize * 0.8}px`;
    target.style.height = `${flickTargetSize * 0.8}px`;
  } else if (flickDifficulty === "hard") {
    target.style.width = `${flickTargetSize * 0.6}px`;
    target.style.height = `${flickTargetSize * 0.6}px`;
  }

  // Add combo indicator for consecutive hits
  if (flickConsecutiveHits > 0) {
    const combo = document.createElement("div");
    combo.className = "flick-combo";
    combo.textContent = `${flickConsecutiveHits}x`;
    target.appendChild(combo);
  }

  target.addEventListener("click", hitFlickTarget);
  gameArea.appendChild(target);

  // Store last position for next spawn
  lastTargetPosition = position;

  // Set timeout to remove target if not hit within the specified duration
  if (targetDuration > 0) {
    targetTimeout = setTimeout(() => {
      if (gameActive) {
        // Reset combo on miss
        flickConsecutiveHits = 0;
        removeTarget();
        spawnFlickTarget(); // Spawn a new target
        totalShots++; // Count as a miss
        updateHUD();
      }
    }, targetDuration * 1000);
  }

  // Reset cursor to center after each target spawn
  resetCursorPosition();
}

function getFlickTargetPosition() {
  const areaRect = gameArea.getBoundingClientRect();
  const padding = 60; // Padding from edges
  const size = flickTargetSize;
  let x, y;

  // Determine position based on difficulty
  if (flickDifficulty === "easy") {
    // Easy: Targets only appear at the four corners
    const corner = Math.floor(Math.random() * 4);
    switch (corner) {
      case 0: // Top-left
        x = padding;
        y = padding;
        break;
      case 1: // Top-right
        x = areaRect.width - padding - size;
        y = padding;
        break;
      case 2: // Bottom-left
        x = padding;
        y = areaRect.height - padding - size;
        break;
      case 3: // Bottom-right
        x = areaRect.width - padding - size;
        y = areaRect.height - padding - size;
        break;
    }
  } else if (flickDifficulty === "medium") {
    // Medium: Targets appear along the edges
    const edge = Math.floor(Math.random() * 4);
    switch (edge) {
      case 0: // Top edge
        x = padding + Math.random() * (areaRect.width - 2 * padding - size);
        y = padding;
        break;
      case 1: // Right edge
        x = areaRect.width - padding - size;
        y = padding + Math.random() * (areaRect.height - 2 * padding - size);
        break;
      case 2: // Bottom edge
        x = padding + Math.random() * (areaRect.width - 2 * padding - size);
        y = areaRect.height - padding - size;
        break;
      case 3: // Left edge
        x = padding;
        y = padding + Math.random() * (areaRect.height - 2 * padding - size);
        break;
    }
  } else if (flickDifficulty === "hard") {
    // Hard: Targets appear anywhere, but far from the previous target
    let minDistance = Math.min(areaRect.width, areaRect.height) * 0.6;
    let attempts = 0;
    let validPosition = false;

    while (!validPosition && attempts < 20) {
      x = padding + Math.random() * (areaRect.width - 2 * padding - size);
      y = padding + Math.random() * (areaRect.height - 2 * padding - size);

      if (
        !lastTargetPosition ||
        calculateDistance(
          { x: x + size / 2, y: y + size / 2 },
          {
            x: lastTargetPosition.x + size / 2,
            y: lastTargetPosition.y + size / 2,
          }
        ) > minDistance
      ) {
        validPosition = true;
      }

      attempts++;
    }
  }

  return { x, y };
}

function calculateDistance(point1, point2) {
  return Math.sqrt(
    Math.pow(point2.x - point1.x, 2) + Math.pow(point2.y - point1.y, 2)
  );
}

function hitFlickTarget(e) {
  if (!gameActive) return;

  // Increase score and consecutive hits
  score++;
  hits++;
  totalShots++;
  flickConsecutiveHits++;

  // Add bonus points for combos
  if (flickConsecutiveHits > 1) {
    // Add bonus points based on combo multiplier
    const bonus = Math.min(flickConsecutiveHits - 1, 4); // Cap bonus at 4x
    score += bonus;

    // Show combo effect
    showComboEffect(e.target);
  }

  updateHUD();

  // Remove current target
  removeTarget();

  // Spawn new target
  spawnFlickTarget();

  e.stopPropagation();
}

function showComboEffect(target) {
  const rect = target.getBoundingClientRect();
  const x = rect.left + rect.width / 2;
  const y = rect.top + rect.height / 2;

  const comboEffect = document.createElement("div");
  comboEffect.className = "combo-effect";
  comboEffect.textContent = `+${Math.min(flickConsecutiveHits - 1, 4)}`;
  comboEffect.style.left = `${x - gameArea.getBoundingClientRect().left}px`;
  comboEffect.style.top = `${y - gameArea.getBoundingClientRect().top}px`;

  gameArea.appendChild(comboEffect);

  // Animate and remove
  setTimeout(() => {
    if (comboEffect.parentNode) {
      comboEffect.parentNode.removeChild(comboEffect);
    }
  }, 1000);
}

// Tracking Mode Functions
function startTrackingMode() {
  // Reset tracking mode variables
  trackingScore = 0;
  trackingMultiplier = 1;
  trackingStreak = 0;
  trackingMaxStreak = 0;
  trackingCurrentAngle = 0;
  trackingDirection = 1;
  trackingPathPoints = [];

  // Create tracking target
  createTrackingTarget();

  // Create cursor indicator for tracking
  createTrackingCursor();

  // Update HUD to show tracking-specific info
  updateTrackingHUD();

  // Add mouse move listener for tracking
  gameArea.addEventListener("mousemove", trackMouse);

  // Start tracking score interval
  trackingScoreInterval = setInterval(updateTrackingScore, 100); // Check every 100ms
}

function createTrackingCursor() {
  // Remove existing cursor indicator if any
  const existingCursor = document.querySelector(".tracking-cursor");
  if (existingCursor) {
    existingCursor.remove();
  }

  // Create cursor indicator
  const cursor = document.createElement("div");
  cursor.className = "tracking-cursor";
  gameArea.appendChild(cursor);

  // Update cursor position on mouse move
  gameArea.addEventListener("mousemove", (e) => {
    if (!gameActive) return;

    const areaRect = gameArea.getBoundingClientRect();
    const x = e.clientX - areaRect.left;
    const y = e.clientY - areaRect.top;

    cursor.style.left = `${x}px`;
    cursor.style.top = `${y}px`;
  });
}

// Track mouse position for tracking mode
let mouseX = 0;
let mouseY = 0;

function trackMouse(e) {
  if (!gameActive) return;

  const areaRect = gameArea.getBoundingClientRect();
  mouseX = e.clientX - areaRect.left;
  mouseY = e.clientY - areaRect.top;
}

function createTrackingTarget() {
  // Remove any existing target
  if (trackingTarget) {
    trackingTarget.remove();
  }

  // Create new tracking target
  trackingTarget = document.createElement("div");
  trackingTarget.classList.add("tracking-target");

  // Add inner circle for better visual tracking
  const innerCircle = document.createElement("div");
  innerCircle.classList.add("tracking-inner");
  trackingTarget.appendChild(innerCircle);

  // Add to game area
  gameArea.appendChild(trackingTarget);

  // Set initial position to center
  const areaRect = gameArea.getBoundingClientRect();
  const targetSize = 80; // Increased size for easier tracking (was 60)
  const x = areaRect.width / 2 - targetSize / 2;
  const y = areaRect.height / 2 - targetSize / 2;

  trackingTarget.style.width = `${targetSize}px`;
  trackingTarget.style.height = `${targetSize}px`;
  trackingTarget.style.left = `${x}px`;
  trackingTarget.style.top = `${y}px`;

  // Store initial position
  trackingLastPosition = { x, y };

  // Start movement animation
  startTrackingMovement();
}

function startTrackingMovement() {
  // Cancel any existing animation frame
  if (trackingAnimationFrame) {
    cancelAnimationFrame(trackingAnimationFrame);
  }

  const areaRect = gameArea.getBoundingClientRect();
  const targetRect = trackingTarget.getBoundingClientRect();
  const targetSize = targetRect.width;

  // Calculate boundaries
  const minX = 20;
  const maxX = areaRect.width - targetSize - 20;
  const minY = 20;
  const maxY = areaRect.height - targetSize - 20;

  // For circular and zigzag patterns
  const centerX = areaRect.width / 2 - targetSize / 2;
  const centerY = areaRect.height / 2 - targetSize / 2;
  const radius = Math.min(areaRect.width, areaRect.height) * 0.35;

  // For random pattern
  if (trackingPattern === "random") {
    generateRandomPath(minX, maxX, minY, maxY);
  }

  // For zigzag pattern
  if (trackingPattern === "zigzag") {
    generateZigzagPath(minX, maxX, minY, maxY);
  }

  // Animation variables
  let lastTimestamp = null;
  let speed = 2; // Base speed

  // Adjust speed based on pattern
  if (trackingPattern === "random") speed = 3;
  if (trackingPattern === "circular") speed = 1.5;
  if (trackingPattern === "zigzag") speed = 2.5;

  // Animation function
  const animate = (timestamp) => {
    if (!gameActive) return;

    if (!lastTimestamp) lastTimestamp = timestamp;
    const deltaTime = timestamp - lastTimestamp;
    lastTimestamp = timestamp;

    // Calculate time-based movement
    const timeScale = deltaTime / 16; // Normalize to ~60fps

    let newX = parseFloat(trackingTarget.style.left);
    let newY = parseFloat(trackingTarget.style.top);

    // Different movement patterns
    if (trackingPattern === "linear") {
      // Linear back and forth movement
      newX += speed * trackingDirection * timeScale;

      if (newX <= minX || newX >= maxX) {
        trackingDirection *= -1; // Reverse direction
        newX = Math.max(minX, Math.min(newX, maxX));
      }
    } else if (trackingPattern === "circular") {
      // Circular movement
      trackingCurrentAngle += speed * 0.02 * timeScale;
      newX = centerX + Math.cos(trackingCurrentAngle) * radius;
      newY = centerY + Math.sin(trackingCurrentAngle) * radius;
    } else if (trackingPattern === "random" || trackingPattern === "zigzag") {
      // Follow pre-generated path points
      if (trackingPathPoints.length > 0) {
        const targetPoint = trackingPathPoints[0];
        const dx = targetPoint.x - newX;
        const dy = targetPoint.y - newY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < 5) {
          // Reached point, move to next
          trackingPathPoints.shift();
          if (trackingPathPoints.length === 0) {
            // Regenerate path when all points are visited
            if (trackingPattern === "random") {
              generateRandomPath(minX, maxX, minY, maxY);
            } else {
              generateZigzagPath(minX, maxX, minY, maxY);
            }
          }
        } else {
          // Move towards point
          const moveX = (dx / distance) * speed * timeScale;
          const moveY = (dy / distance) * speed * timeScale;
          newX += moveX;
          newY += moveY;
        }
      }
    }

    // Update position
    trackingTarget.style.left = `${newX}px`;
    trackingTarget.style.top = `${newY}px`;

    // Store last position
    trackingLastPosition = { x: newX, y: newY };

    // Continue animation
    trackingAnimationFrame = requestAnimationFrame(animate);
  };

  // Start animation
  trackingAnimationFrame = requestAnimationFrame(animate);
}

function generateRandomPath(minX, maxX, minY, maxY) {
  trackingPathPoints = [];
  const pointCount = 5;

  for (let i = 0; i < pointCount; i++) {
    trackingPathPoints.push({
      x: minX + Math.random() * (maxX - minX),
      y: minY + Math.random() * (maxY - minY),
    });
  }
}

function generateZigzagPath(minX, maxX, minY, maxY) {
  trackingPathPoints = [];
  const pointCount = 6;

  // Create zigzag pattern
  for (let i = 0; i < pointCount; i++) {
    const x = minX + (i % 2 === 0 ? 0.2 : 0.8) * (maxX - minX);
    const y = minY + (i / pointCount) * (maxY - minY);
    trackingPathPoints.push({ x, y });
  }
}

function updateTrackingScore() {
  if (!gameActive || !trackingTarget) return;

  // Get cursor position
  let cursorX, cursorY;

  if (isPointerLocked) {
    // Use the stored cursor position for pointer lock mode
    cursorX = cursorX;
    cursorY = cursorY;
  } else {
    // Use tracked mouse position
    cursorX = mouseX;
    cursorY = mouseY;
  }

  // Get target position and size
  const targetRect = trackingTarget.getBoundingClientRect();
  const targetX =
    targetRect.left -
    gameArea.getBoundingClientRect().left +
    targetRect.width / 2;
  const targetY =
    targetRect.top -
    gameArea.getBoundingClientRect().top +
    targetRect.height / 2;
  const targetRadius = targetRect.width / 2;

  // Calculate distance between cursor and target center
  const distance = Math.sqrt(
    Math.pow(cursorX - targetX, 2) + Math.pow(cursorY - targetY, 2)
  );

  // Check if cursor is within target
  if (distance <= targetRadius) {
    // Increase streak and score
    trackingStreak++;
    trackingMaxStreak = Math.max(trackingMaxStreak, trackingStreak);

    // Calculate multiplier based on streak
    trackingMultiplier = 1 + Math.min(Math.floor(trackingStreak / 10), 4);

    // Add score based on multiplier
    trackingScore += trackingMultiplier;
    score = trackingScore;

    // Visual feedback - add "on-target" class
    trackingTarget.classList.add("on-target");

    // Show multiplier if > 1
    if (trackingMultiplier > 1 && trackingStreak % 10 === 0) {
      showTrackingMultiplier();
    }
  } else {
    // Reset streak if cursor moves away from target
    if (trackingStreak > 0) {
      trackingStreak = 0;
      trackingMultiplier = 1;
      trackingTarget.classList.remove("on-target");
    }
  }

  // Update HUD
  updateTrackingHUD();
}

function showTrackingMultiplier() {
  const multiplierEffect = document.createElement("div");
  multiplierEffect.className = "tracking-multiplier";
  multiplierEffect.textContent = `${trackingMultiplier}x`;

  // Position near target
  const targetRect = trackingTarget.getBoundingClientRect();
  const x =
    targetRect.left -
    gameArea.getBoundingClientRect().left +
    targetRect.width / 2;
  const y = targetRect.top - gameArea.getBoundingClientRect().top - 20;

  multiplierEffect.style.left = `${x}px`;
  multiplierEffect.style.top = `${y}px`;

  gameArea.appendChild(multiplierEffect);

  // Animate and remove
  setTimeout(() => {
    if (multiplierEffect.parentNode) {
      multiplierEffect.parentNode.removeChild(multiplierEffect);
    }
  }, 1000);
}

function updateTrackingHUD() {
  scoreDisplay.textContent = `Score: ${trackingScore}`;
  timerDisplay.textContent = `Time: ${timeLeft}`;
  accuracyDisplay.textContent = `Streak: ${trackingStreak} | Best: ${trackingMaxStreak}`;
}

function cleanupTrackingMode() {
  // Cancel animation frame
  if (trackingAnimationFrame) {
    cancelAnimationFrame(trackingAnimationFrame);
    trackingAnimationFrame = null;
  }

  // Clear score interval
  if (trackingScoreInterval) {
    clearInterval(trackingScoreInterval);
    trackingScoreInterval = null;
  }

  // Remove tracking target
  if (trackingTarget && trackingTarget.parentNode) {
    trackingTarget.remove();
    trackingTarget = null;
  }

  // Remove tracking cursor
  const cursor = document.querySelector(".tracking-cursor");
  if (cursor) {
    cursor.remove();
  }

  // Remove mouse move listener
  gameArea.removeEventListener("mousemove", trackMouse);

  // Remove any multiplier effects
  const multipliers = document.querySelectorAll(".tracking-multiplier");
  multipliers.forEach((el) => el.remove());
}

// Show/hide speed control based on game mode selection
gameModeSelect.addEventListener("change", function () {
  if (this.value === "moving") {
    speedControl.style.display = "flex";
    document.getElementById("flick-control").style.display = "none";
    document.getElementById("tracking-control").style.display = "none";
  } else if (this.value === "flick") {
    speedControl.style.display = "none";
    document.getElementById("flick-control").style.display = "flex";
    document.getElementById("tracking-control").style.display = "none";
  } else if (this.value === "tracking") {
    speedControl.style.display = "none";
    document.getElementById("flick-control").style.display = "none";
    document.getElementById("tracking-control").style.display = "flex";
  } else {
    speedControl.style.display = "none";
    document.getElementById("flick-control").style.display = "none";
    document.getElementById("tracking-control").style.display = "none";
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

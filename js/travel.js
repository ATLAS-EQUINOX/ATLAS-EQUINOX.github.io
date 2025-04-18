var system;
function getWarpPath(start, end) {
  if (start === end) return [start];

  const visited = new Set();
  const queue = [[start]];

  while (queue.length > 0) {
    const path = queue.shift();
    const node = path[path.length - 1];

    if (node === end) return path;

    if (!visited.has(node)) {
      visited.add(node);
      const neighbors = Object.keys(WARP_GRAPH[node] || {});
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          queue.push([...path, neighbor]);
        }
      }
    }
  }

  // If no path found, just hop randomly to get somewhere
  const systems = Object.keys(WARP_GRAPH);
  if (systems.length > 0) {
    const fallback = [start];
    let current = start;
    const visitedFallback = new Set([start]);

    // Try to find *any* path
    while (current !== end && visitedFallback.size < systems.length) {
      const nextOptions = Object.keys(WARP_GRAPH[current] || {}).filter(
        (n) => !visitedFallback.has(n)
      );
      const next =
        nextOptions[0] || systems.find((s) => !visitedFallback.has(s));
      if (!next) break;
      fallback.push(next);
      visitedFallback.add(next);
      current = next;
    }

    if (fallback[fallback.length - 1] !== end) fallback.push(end);
    return fallback;
  }

  return [start, end];
}

function getFuelCostForPath(path) {
  const perJumpCost = 10; // or 2.5, depending on desired balance
  return (path.length - 1) * perJumpCost;
}

function beginWarpStep(hopIndex) {
  if (!warpTargetPath || hopIndex >= warpTargetPath.length || warpAborted)
    return;

  const from = warpTargetPath[hopIndex - 1];
  const to = warpTargetPath[hopIndex];
  const variation = 2 + (Math.random() * 0.1 - 0.05); // 0.95 to 1.05
  const segmentFuelCost = TRAVEL_FUEL_COST;

  if (player.fuel < segmentFuelCost) {
    log(`Warp aborted due to insufficient fuel. Holding at ${from}.`);
    player.location = from; // stay at current
    document.getElementById("warp-overlay").classList.add("d-none");
    disableTradeControls(false);
    isWarping = false;
    updateUI();
    return;
  }

  const travelTime = Math.floor(Math.random() * 500) + 300;
  isWarping = true;

  if (hopIndex === 1) {
    document.getElementById("warp-overlay").classList.remove("d-none");
    disableTradeControls(true);
  }

  // UI progress
  const progressBar = document.getElementById("warp-progress-bar");
  const totalHops = warpTargetPath.length - 1;
  const percent = Math.floor(((hopIndex - 1) / totalHops) * 100);
  progressBar.style.width = `${percent}%`;
  progressBar.textContent = `${percent}%`;
  progressBar.setAttribute("aria-valuenow", percent.toString());
  document.getElementById(
    "warp-route"
  ).textContent = `Warping: ${from} → ${to} — Step ${hopIndex} of ${totalHops}`;

  setTimeout(() => {
    if (warpAborted) {
      log(`Warp aborted. Holding at ${player.location}.`);
      document.getElementById("warp-overlay").classList.add("d-none");
      disableTradeControls(false);
      isWarping = false;
      return;
    }

    player.location = to;
    player.fuel -= segmentFuelCost;
    flash("fuel");
    log(`Arrived at ${to}. Remaining fuel: ${player.fuel.toFixed(2)}ᶜ`);
    updateUI();

    if (to === warpFinalDest) {
      progressBar.style.width = "100%";
      progressBar.textContent = "100%";
      progressBar.setAttribute("aria-valuenow", "100");
      setTimeout(() => {
        document.getElementById("warp-overlay").classList.add("d-none");
        disableTradeControls(false);
        log("Warp complete.");
        toggleTravelButton();
        isWarping = false;
      }, 500);
    } else {
      beginWarpStep(hopIndex + 1);
    }
  }, travelTime);
}

function travel() {
  const selectedSystem = document.getElementById("travelSearch").value;
  if (!selectedSystem || selectedSystem === player.location) return;

  // ✅ Calculate the warp route here
  const route = getWarpPath(player.location, selectedSystem);
  if (!route || route.length === 0) {
    log("No valid warp path found.");
    return;
  }

  warpTargetPath = route;
  warpFinalDest = selectedSystem;

  const hops = route.length - 1;
  const fuelCost = getFuelCostForPath(route);

  document.getElementById(
    "warpRouteDisplay"
  ).textContent = `From: ${player.location} → ${selectedSystem}`;
  document.getElementById("warpFullPath").textContent = route.join(" ➜ ");
  document.getElementById("warpHopCount").textContent = hops;
  document.getElementById("warpFuelEstimate").textContent = fuelCost.toFixed(2);

  document.getElementById("warpModal").style.display = "block";
}

function confirmWarp() {
  if (!warpTargetPath || warpTargetPath.length === 0) return;
  warpAborted = false;
  warpAbortLogged = false;
  isWarping = true;

  document.getElementById("warpModal").style.display = "none";
  document.getElementById("warp-overlay").classList.remove("d-none");

  const progressBar = document.getElementById("warp-progress-bar");
  progressBar.style.width = "0%";
  progressBar.textContent = "0%";
  progressBar.setAttribute("aria-valuenow", "0");

  disableTradeControls(true);
  beginWarpStep(1);
}

function cancelWarp() {
  document.getElementById("warpModal").style.display = "none";
  log("Warp cancelled.");
}

function abortWarp() {
  warpAborted = true;
  warpAbortLogged = false; // Reset so `beginWarpStep` can log it once
}

function closeWarpModal() {
  document.getElementById("warpModal").style.display = "none";
}

(() => {
  "use strict";

  const W = 180, H = 240, PETAL_COUNT = 12;
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const soundButton = document.getElementById("soundButton");
  const fullscreenButton = document.getElementById("fullscreenButton");

  const palettes = [
    { base: "#da669c", light: "#ffb8d7", shine: "#ffdae5", center: "#ffd357" },
    { base: "#9c87eb", light: "#cfc2ff", shine: "#ebe4ff", center: "#ffbe5f" },
    { base: "#ef8b70", light: "#ffc19d", shine: "#ffe2c4", center: "#ffe787" },
    { base: "#e1be5b", light: "#ffe28f", shine: "#fff2c3", center: "#ffbe5f" },
    { base: "#70b2af", light: "#a5e0d7", shine: "#daf8eb", center: "#ffd357" }
  ];

  const topSky = [8, 12, 58], bottomSky = [110, 70, 150];
  const stars = Array.from({ length: 45 }, () => ({
    x: 2 + Math.random() * 176,
    y: 2 + Math.random() * 118,
    phase: Math.random() * Math.PI * 2,
    size: Math.random() < .18 ? 2 : 1
  }));
  const grass = Array.from({ length: 110 }, () => ({
    x: Math.random() * W,
    y: 201 + Math.random() * 37,
    h: 3 + Math.random() * 6,
    color: ["#3c963c", "#287832", "#5ab446"][Math.floor(Math.random() * 3)]
  }));
  const fireflies = Array.from({ length: 9 }, () => ({
    x: 5 + Math.random() * 170,
    y: 135 + Math.random() * 70,
    phase: Math.random() * Math.PI * 2
  }));

  let state = "title";
  let time = 0;
  let picked = 0;
  let petals = [];
  let falling = [];
  let palette = palettes[0];
  let lastResult = true;
  let currentMessage = "";
  let messageAlpha = 0;
  let endingTime = 0;
  let muted = false;
  let audioContext = null;
  let pointer = { x: -100, y: -100 };

  function lerp(a, b, t) { return a + (b - a) * t; }
  function rgb(a, b, t) {
    return `rgb(${Math.round(lerp(a[0], b[0], t))},${Math.round(lerp(a[1], b[1], t))},${Math.round(lerp(a[2], b[2], t))})`;
  }
  function text(str, x, y, color = "#fff", size = 9, align = "center") {
    ctx.textAlign = align;
    ctx.textBaseline = "middle";
    ctx.font = `bold ${size}px "Courier New", monospace`;
    ctx.fillStyle = "#1d1441";
    ctx.fillText(str, x + 1, y + 1);
    ctx.fillStyle = color;
    ctx.fillText(str, x, y);
  }
  function button(x, y, w, h, label, accent = "#ffb8d7") {
    const hover = pointer.x >= x && pointer.x <= x + w && pointer.y >= y && pointer.y <= y + h;
    ctx.fillStyle = "#131239";
    ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
    ctx.strokeStyle = accent;
    ctx.strokeRect(x + .5, y + .5, w - 1, h - 1);
    ctx.fillStyle = hover ? "#5b418b" : "#433170";
    ctx.fillRect(x + 2, y + 2, w - 4, h - 4);
    text(label, x + w / 2, y + h / 2, "#fff4fa", 8);
  }
  function background() {
    for (let y = 0; y < H; y++) {
      const t = Math.min(1, y / (H * .8));
      const bands = 7, v = t * bands, band = Math.floor(v);
      const frac = v - band;
      for (let x = 0; x < W; x++) {
        const threshold = [[0,8,2,10],[12,4,14,6],[3,11,1,9],[15,7,13,5]][y % 4][x % 4] / 16;
        const step = Math.min(bands, band + (frac > threshold ? 1 : 0));
        ctx.fillStyle = rgb(topSky, bottomSky, step / bands);
        ctx.fillRect(x, y, 1, 1);
      }
    }

    for (let x = 0; x < W; x++) {
      const y1 = Math.floor(172 + 9 * Math.sin(x * .035) + 5 * Math.sin(x * .09 + 1));
      const y2 = Math.floor(190 + 4 * Math.sin(x * .06 + 2));
      ctx.fillStyle = "#1c266e"; ctx.fillRect(x, y1, 1, H - y1);
      ctx.fillStyle = "#144632"; ctx.fillRect(x, y2, 1, H - y2);
    }
    ctx.fillStyle = "#1e5a28"; ctx.fillRect(0, 200, W, 40);

    stars.forEach(s => {
      const glow = .45 + .55 * (.5 + .5 * Math.sin(time * 2 + s.phase));
      ctx.fillStyle = `rgb(${Math.floor(110 + 100 * glow)},${Math.floor(120 + 100 * glow)},${Math.floor(190 + 65 * glow)})`;
      if (glow > .63) ctx.fillRect(Math.floor(s.x), Math.floor(s.y), s.size, s.size);
      if (glow > .88) {
        ctx.fillRect(Math.floor(s.x) - 1, Math.floor(s.y), 1, 1);
        ctx.fillRect(Math.floor(s.x) + 1, Math.floor(s.y), 1, 1);
        ctx.fillRect(Math.floor(s.x), Math.floor(s.y) - 1, 1, 1);
        ctx.fillRect(Math.floor(s.x), Math.floor(s.y) + 1, 1, 1);
      }
    });
    fireflies.forEach(f => {
      if (Math.sin(time * 2.8 + f.phase) > .05) {
        ctx.fillStyle = "#aadc69";
        ctx.fillRect(Math.floor(f.x), Math.floor(f.y), 2, 2);
      }
    });
    grass.forEach(g => {
      ctx.strokeStyle = g.color;
      ctx.beginPath(); ctx.moveTo(g.x, g.y); ctx.lineTo(g.x - 1, g.y - g.h); ctx.stroke();
    });
  }

  function stem() {
    ctx.strokeStyle = "#174b33"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(90, 122); ctx.lineTo(90, 208); ctx.stroke();
    ctx.strokeStyle = "#439145"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(89, 128); ctx.lineTo(89, 205); ctx.stroke();

    ctx.fillStyle = "#1f6f3b";
    ctx.beginPath(); ctx.ellipse(79, 165, 12, 5, -.15, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(102, 181, 12, 4.5, .15, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#5ba94d";
    ctx.beginPath(); ctx.moveTo(70, 166); ctx.lineTo(89, 168); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(93, 181); ctx.lineTo(111, 180); ctx.stroke();
  }

  function flower() {
    const sway = Math.sin(time * 1.4) * 1.5;
    stem();
    petals.forEach(p => {
      if (!p.alive) return;
      const x = 90 + Math.cos(p.angle) * 25 + sway;
      const y = 108 + Math.sin(p.angle) * 25;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(p.angle + Math.PI / 2);
      ctx.fillStyle = palette.base;
      ctx.beginPath(); ctx.ellipse(0, 0, 7.5, 14.5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = palette.light;
      ctx.beginPath(); ctx.ellipse(0, -1, 5.5, 12, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = palette.shine;
      ctx.fillRect(-2, -9, 3, 5);
      ctx.restore();
    });
    ctx.fillStyle = "#784425"; ctx.beginPath(); ctx.arc(90 + sway, 108, 10, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = palette.center; ctx.beginPath(); ctx.arc(90 + sway, 108, 8, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#fff2a5"; ctx.fillRect(88 + sway, 105, 2, 2);
    ctx.fillStyle = "#b97e35"; ctx.fillRect(89 + sway, 109, 2, 2);
  }

  function fallingPetals() {
    falling.forEach(p => {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation * Math.PI / 180);
      ctx.fillStyle = palette.base;
      ctx.beginPath(); ctx.ellipse(0, 0, 5, 10, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = palette.light;
      ctx.beginPath(); ctx.ellipse(0, -1, 3.5, 8, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    });
  }

  function playTone(freq = 650, duration = .08) {
    if (muted) return;
    try {
      audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
      if (audioContext.state === "suspended") audioContext.resume();
      const osc = audioContext.createOscillator();
      const gain = audioContext.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(.045, audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(.001, audioContext.currentTime + duration);
      osc.connect(gain); gain.connect(audioContext.destination);
      osc.start(); osc.stop(audioContext.currentTime + duration);
    } catch (_) { /* Audio is optional. */ }
  }

  function resetGame() {
    palette = palettes[Math.floor(Math.random() * palettes.length)];
    petals = Array.from({ length: PETAL_COUNT }, (_, i) => ({
      index: i, angle: Math.PI * 2 * i / PETAL_COUNT - Math.PI / 2, alive: true
    }));
    falling = [];
    picked = 0;
    lastResult = Math.random() < .5;
    currentMessage = "";
    messageAlpha = 0;
    endingTime = 0;
    state = "playing";
  }

  function pickPetal(p) {
    if (!p || !p.alive || state !== "playing") return;
    p.alive = false;
    const px = 90 + Math.cos(p.angle) * 25;
    const py = 108 + Math.sin(p.angle) * 25;
    falling.push({
      x: px, y: py,
      vx: (Math.random() - .5) * 44,
      vy: -22 - Math.random() * 18,
      rotation: Math.random() * 40 - 20,
      spin: Math.random() * 300 - 150,
      life: 2.2
    });
    picked++;
    lastResult = ((picked % 2 === 1) === lastResult);
    currentMessage = lastResult ? "LOVES ME" : "LOVES ME NOT";
    messageAlpha = 0;
    playTone(lastResult ? 740 : 430, .1);
    if (picked >= PETAL_COUNT) {
      state = "ending";
      endingTime = 0;
    }
  }

  function update(dt) {
    if (state === "playing" || state === "ending") {
      falling.forEach(p => {
        p.vy += 48 * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.rotation += p.spin * dt;
        p.life -= dt;
      });
      falling = falling.filter(p => p.life > 0 && p.y < H + 20);
    }
    if (state === "playing") messageAlpha = Math.min(1, messageAlpha + dt * 3.2);
    if (state === "ending") endingTime += dt;
  }

  function drawTitle() {
    background();
    const bob = Math.sin(time * 2) * 2;
    ctx.fillStyle = "#ff8fc0";
    ctx.fillRect(85, 51 + bob, 3, 3);
    ctx.fillRect(82, 54 + bob, 9, 3);
    ctx.fillRect(84, 57 + bob, 5, 3);
    text("LOVES ME,", 90, 82, "#ffd3e5", 13);
    text("LOVES ME NOT", 90, 97, "#cfcaff", 9);
    text("a tiny flower story", 90, 124, "#d7ccf0", 7);
    button(43, 145, 94, 23, "START GAME");
    text("pick a petal to find out", 90, 184, "#ded6f6", 7);
    text("SOUND: MUTE BUTTON BELOW", 90, 222, "#b7aed9", 6);
  }

  function drawPlaying() {
    background();
    flower();
    fallingPetals();
    text(`PETALS: ${String(PETAL_COUNT - picked).padStart(2, "0")}`, 39, 12, "#ebe1ff", 7);
    text("TAP A PETAL", 90, 226, "#e6dcfa", 7);
    if (currentMessage) {
      ctx.save();
      ctx.globalAlpha = messageAlpha;
      text(currentMessage, 90, 157, currentMessage === "LOVES ME" ? "#ff8fc0" : "#a9bcff", 9);
      ctx.restore();
    }
  }

  function drawEnding() {
    background();
    flower();
    fallingPetals();
    const isLove = lastResult;
    const title = isLove ? "SHE LOVES YOU!" : "NOT THIS TIME...";
    const subtitle = isLove ? "A little hope found you tonight." : "Even flowers need another spring.";
    const alpha = Math.min(1, endingTime * 1.8);
    ctx.save();
    ctx.globalAlpha = alpha;
    text(title, 90, 42, isLove ? "#ff8fc0" : "#a9bcff", 10);
    text(subtitle, 90, 61, "#f0e1ff", 6);
    button(48, 178, 84, 22, "PLAY AGAIN", isLove ? "#ff8fc0" : "#a9bcff");
    button(48, 205, 84, 18, "TITLE", "#beb4f5");
    ctx.restore();
  }

  function render() {
    if (state === "title") drawTitle();
    else if (state === "playing") drawPlaying();
    else drawEnding();
  }

  function canvasPoint(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) * W / rect.width,
      y: (event.clientY - rect.top) * H / rect.height
    };
  }

  function handlePointer(event) {
    event.preventDefault();
    const pos = canvasPoint(event);
    pointer = pos;

    if (state === "title") {
      if (pos.x >= 43 && pos.x <= 137 && pos.y >= 145 && pos.y <= 168) {
        resetGame(); playTone(620, .08);
      }
    } else if (state === "playing") {
      let nearest = null, best = 14;
      petals.forEach(p => {
        if (!p.alive) return;
        const x = 90 + Math.cos(p.angle) * 25;
        const y = 108 + Math.sin(p.angle) * 25;
        const d = Math.hypot(pos.x - x, pos.y - y);
        if (d < best) { best = d; nearest = p; }
      });
      pickPetal(nearest);
    } else if (state === "ending") {
      if (pos.x >= 48 && pos.x <= 132 && pos.y >= 178 && pos.y <= 200) {
        resetGame(); playTone(620, .08);
      } else if (pos.x >= 48 && pos.x <= 132 && pos.y >= 205 && pos.y <= 223) {
        state = "title";
      }
    }
  }

  canvas.addEventListener("pointerdown", handlePointer);
  canvas.addEventListener("pointermove", event => { pointer = canvasPoint(event); });

  soundButton.addEventListener("click", () => {
    muted = !muted;
    soundButton.textContent = muted ? "♪ Sound: OFF" : "♪ Sound: ON";
    soundButton.setAttribute("aria-pressed", String(muted));
    if (!muted) playTone(700, .06);
  });

  fullscreenButton.addEventListener("click", async () => {
    try {
      if (!document.fullscreenElement) await document.querySelector(".game-shell").requestFullscreen();
      else await document.exitFullscreen();
    } catch (_) {
      fullscreenButton.textContent = "Fullscreen unavailable";
    }
  });
  document.addEventListener("keydown", event => {
    if (event.key === "m" || event.key === "M") soundButton.click();
    if (event.key === "r" || event.key === "R") resetGame();
    if (event.key === "F11") {
      event.preventDefault();
      fullscreenButton.click();
    }
    if (event.key === "Escape" && state !== "title") state = "title";
  });

  let previous = performance.now();
  function frame(now) {
    const dt = Math.min((now - previous) / 1000, .05);
    previous = now;
    time += dt;
    update(dt);
    render();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();

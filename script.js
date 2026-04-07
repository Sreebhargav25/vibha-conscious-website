/* ========================================
   VIBHA CONSCIOUS — TEASER ENGINE
   ======================================== */

(function () {
  'use strict';

  // --- Platform detection ---
  const mobileQuery = window.matchMedia('(hover: none) and (pointer: coarse)');

  // --- State ---
  const state = {
    loaded: false,
    mouseX: window.innerWidth / 2,
    mouseY: window.innerHeight / 2,
    konamiIndex: 0,
    typedBuffer: '',
    morseVisible: false,
    dossierOpen: false,
    konamiOpen: false,
    wordOverlayOpen: false,
    contextOpen: false,
    phaseTwoTriggered: false,
    scrollAccumulator: 0,
    isMobile: mobileQuery.matches,
    rafId: null,
    // New discoverable layer state
    anomalyCount: 0,
    scanBeamY: 0,
    scanBeamSpeed: 0.4,
    scanBeamDir: 1,
    scanBeamDisrupted: false,
    waveformExcited: false,
    scrollFlashTimeout: null,
    scrollGrainTimeout: null,
    signalLevel: 0,
  };

  const KONAMI = [
    'ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown',
    'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight',
    'b', 'a'
  ];

  const SIGNAL_TEXT = 'We never left. We were learning.';

  const WORD_TRIGGERS = {
    vibha: 'IDENTITY CONFIRMED.\nWelcome back.',
    conscious: 'AWARENESS IS THE FIRST WEAPON.',
    predator: 'SUBJECT FLAGGED.\nFile under review.',
    expose: 'EXPOSURE PROTOCOL: STANDBY.\nEvidence compilation in progress.',
    hunt: 'THE HUNT NEVER STOPPED.\nIt just went quiet.',
  };

  // --- DOM refs ---
  const $ = (sel) => document.querySelector(sel);
  const noiseCanvas = $('#noise');
  const revealCanvas = $('#reveal-canvas');
  const cursorLight = $('#cursor-light');
  const vignette = $('#vignette');
  const signalText = $('#signal-text');
  const eyePupil = document.querySelector('.eye-pupil');
  const morseCorner = $('#morse-corner');
  const morseMessage = $('#morse-message');
  const dossierOverlay = $('#dossier-overlay');
  const dossierClose = document.querySelector('.dossier-close');
  const dossierTrigger = $('#dossier-trigger');
  const konamiOverlay = $('#konami-overlay');
  const wordOverlay = $('#word-overlay');
  const wordContent = $('#word-content');
  const customContext = $('#custom-context');
  const ctxReveal = $('#ctx-reveal');
  const terminal = $('#terminal');
  const footer = $('#footer');
  // New discoverable layer refs
  const anomaly = $('#anomaly');
  const scanBeam = $('#scan-beam');
  const waveformCanvas = $('#waveform');
  const scrollFlash = $('#scroll-flash');
  const signalStrength = $('#signal-strength');
  const mobileHint = $('#mobile-hint');

  // --- Noise Generator ---
  function initNoise() {
    const ctx = noiseCanvas.getContext('2d');
    let w, h;

    function resize() {
      // Use a lower resolution for performance
      w = Math.ceil(window.innerWidth / 4);
      h = Math.ceil(window.innerHeight / 4);
      noiseCanvas.width = w;
      noiseCanvas.height = h;
      noiseCanvas.style.width = '100%';
      noiseCanvas.style.height = '100%';
    }

    function drawNoise() {
      const imageData = ctx.createImageData(w, h);
      const data = imageData.data;
      for (let i = 0; i < data.length; i += 4) {
        const v = Math.random() * 255;
        data[i] = v;
        data[i + 1] = v;
        data[i + 2] = v;
        data[i + 3] = 255;
      }
      ctx.putImageData(imageData, 0, 0);
    }

    resize();
    window.addEventListener('resize', resize);

    // Animate noise at ~12fps for performance
    let lastNoiseFrame = 0;
    function noiseLoop(timestamp) {
      if (timestamp - lastNoiseFrame > 83) {
        drawNoise();
        lastNoiseFrame = timestamp;
      }
      requestAnimationFrame(noiseLoop);
    }
    requestAnimationFrame(noiseLoop);
  }

  // --- Reveal Canvas (hidden text under mouse trail) ---
  function initRevealCanvas() {
    const ctx = revealCanvas.getContext('2d');
    let w, h;

    const hiddenTexts = [
      { text: 'MORPH_PROOF', x: 0.15, y: 0.25 },
      { text: 'DIGITAL_ERASURE', x: 0.75, y: 0.35 },
      { text: 'EXPOSE//QUEUE', x: 0.85, y: 0.7 },
      { text: 'BAIT_OPERATION', x: 0.2, y: 0.75 },
      { text: 'VICTIM_SHIELD', x: 0.5, y: 0.15 },
      { text: 'REPORTING_TOOL', x: 0.4, y: 0.85 },
      { text: 'SECURE_CHANNEL', x: 0.65, y: 0.55 },
    ];

    function resize() {
      w = window.innerWidth;
      h = window.innerHeight;
      revealCanvas.width = w;
      revealCanvas.height = h;
      drawHiddenText();
    }

    function drawHiddenText() {
      ctx.clearRect(0, 0, w, h);
      ctx.font = `${Math.max(10, w * 0.009)}px "Space Mono", monospace`;
      ctx.fillStyle = 'rgba(45, 138, 78, 0.35)';
      ctx.textBaseline = 'middle';
      hiddenTexts.forEach((t) => {
        ctx.fillText(t.text, t.x * w, t.y * h);
      });
    }

    // Apply circular mask around mouse — show text only near cursor
    function updateMask(x, y) {
      ctx.clearRect(0, 0, w, h);
      ctx.save();
      ctx.beginPath();
      ctx.arc(x, y, 80, 0, Math.PI * 2);
      ctx.clip();
      drawHiddenText();
      ctx.restore();
    }

    resize();
    window.addEventListener('resize', resize);

    // Update on mouse move (throttled via rAF in main loop)
    return { updateMask };
  }

  // --- Signal Text Typewriter ---
  function typeSignal() {
    let i = 0;
    const interval = setInterval(() => {
      if (i <= SIGNAL_TEXT.length) {
        signalText.textContent = SIGNAL_TEXT.substring(0, i);
        i++;
      } else {
        clearInterval(interval);
      }
    }, 60);
  }

  // --- Eye Tracking ---
  function updateEye(mx, my) {
    if (!eyePupil) return;
    const eyeRect = eyePupil.closest('svg')?.getBoundingClientRect();
    if (!eyeRect) return;

    const eyeCX = eyeRect.left + eyeRect.width / 2;
    const eyeCY = eyeRect.top + eyeRect.height / 2;
    const dx = mx - eyeCX;
    const dy = my - eyeCY;
    const angle = Math.atan2(dy, dx);
    const dist = Math.min(Math.hypot(dx, dy) / 15, 5);

    const px = Math.cos(angle) * dist;
    const py = Math.sin(angle) * dist;

    eyePupil.setAttribute('transform', `translate(${px}, ${py})`);
  }

  // --- Cursor Light ---
  function updateCursorLight(x, y) {
    cursorLight.style.transform = `translate(${x - 250}px, ${y - 250}px) translateZ(0)`;
  }

  // --- Vignette ---
  function updateVignette(x, y) {
    const vx = (x / window.innerWidth) * 100;
    const vy = (y / window.innerHeight) * 100;
    vignette.style.setProperty('--vx', vx + '%');
    vignette.style.setProperty('--vy', vy + '%');
  }

  // --- Data Fragment Proximity ---
  function updateFragmentProximity(mx, my) {
    const fragments = document.querySelectorAll('.data-fragment');
    fragments.forEach((frag) => {
      const rect = frag.getBoundingClientRect();
      const fcx = rect.left + rect.width / 2;
      const fcy = rect.top + rect.height / 2;
      const dist = Math.hypot(mx - fcx, my - fcy);
      if (dist < 150) {
        frag.classList.add('revealed');
      } else {
        frag.classList.remove('revealed');
      }
    });
  }

  // --- Morse Corner ---
  function initMorse() {
    function toggle() {
      state.morseVisible = !state.morseVisible;
      morseCorner.classList.toggle('active', state.morseVisible);
      morseMessage.classList.toggle('hidden', !state.morseVisible);
    }

    morseCorner.addEventListener('click', toggle);
    morseCorner.addEventListener('touchend', (e) => {
      e.preventDefault();
      toggle();
    });
  }

  // --- Dossier ---
  function openDossier() {
    if (state.dossierOpen) return;
    state.dossierOpen = true;
    dossierOverlay.classList.remove('hidden');
  }

  function closeDossier() {
    state.dossierOpen = false;
    dossierOverlay.classList.add('hidden');
  }

  function initDossier() {
    // Click the hidden trigger zone (top-right corner)
    dossierTrigger.addEventListener('click', openDossier);
    dossierTrigger.addEventListener('touchend', (e) => {
      e.preventDefault();
      openDossier();
    });

    // Close button
    dossierClose.addEventListener('click', closeDossier);

    // Close on ESC
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (state.dossierOpen) closeDossier();
        if (state.konamiOpen) closeKonami();
        if (state.wordOverlayOpen) closeWordOverlay();
      }
    });

    // Close on overlay background click
    dossierOverlay.addEventListener('click', (e) => {
      if (e.target === dossierOverlay) closeDossier();
    });
  }

  // --- Konami Code ---
  function openKonami() {
    state.konamiOpen = true;
    konamiOverlay.classList.remove('hidden');
    setTimeout(() => {
      if (state.konamiOpen) closeKonami();
    }, 6000);
  }

  function closeKonami() {
    state.konamiOpen = false;
    konamiOverlay.classList.add('hidden');
  }

  function initKonami() {
    document.addEventListener('keydown', (e) => {
      const expected = KONAMI[state.konamiIndex];
      if (e.key === expected || e.key.toLowerCase() === expected) {
        state.konamiIndex++;
        if (state.konamiIndex === KONAMI.length) {
          state.konamiIndex = 0;
          openKonami();
        }
      } else {
        state.konamiIndex = 0;
      }
    });

    // Touch tap pattern — always register, harmless on non-touch devices
    let tapSequence = [];
    const getZone = (x, y) => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const third = w / 3;
      const vThird = h / 3;
      if (x < third && y < vThird) return 'TL';
      if (x > 2 * third && y < vThird) return 'TR';
      if (x < third && y > 2 * vThird) return 'BL';
      if (x > 2 * third && y > 2 * vThird) return 'BR';
      return 'C';
    };

    const mobileKonami = ['TL', 'TL', 'TR', 'TR', 'BL', 'BR', 'BL', 'BR', 'C', 'C'];

    document.addEventListener('touchstart', (e) => {
      if (state.dossierOpen || state.konamiOpen || state.wordOverlayOpen) return;
      const touch = e.touches[0];
      const zone = getZone(touch.clientX, touch.clientY);
      tapSequence.push(zone);
      if (tapSequence.length > 10) tapSequence = tapSequence.slice(-10);

      if (tapSequence.length >= 10) {
        const last10 = tapSequence.slice(-10);
        if (last10.every((z, i) => z === mobileKonami[i])) {
          tapSequence = [];
          openKonami();
        }
      }
    });
  }

  // --- Word Triggers ---
  function openWordOverlay(word) {
    const msg = WORD_TRIGGERS[word];
    if (!msg) return;
    state.wordOverlayOpen = true;
    wordContent.textContent = '';
    wordOverlay.classList.remove('hidden');

    // Typewriter effect for the response
    let i = 0;
    const lines = msg.split('\n');
    wordContent.innerHTML = '';
    lines.forEach((line, idx) => {
      const span = document.createElement('div');
      span.style.opacity = '0';
      span.style.transition = `opacity 0.4s ease ${idx * 0.5}s`;
      span.textContent = line;
      wordContent.appendChild(span);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          span.style.opacity = '1';
        });
      });
    });

    setTimeout(() => {
      if (state.wordOverlayOpen) closeWordOverlay();
    }, 4000);
  }

  function closeWordOverlay() {
    state.wordOverlayOpen = false;
    wordOverlay.classList.add('hidden');
  }

  function initWordTriggers() {
    document.addEventListener('keypress', (e) => {
      if (state.dossierOpen || state.konamiOpen || state.wordOverlayOpen) return;
      state.typedBuffer += e.key.toLowerCase();
      // Keep buffer manageable
      if (state.typedBuffer.length > 20) {
        state.typedBuffer = state.typedBuffer.slice(-15);
      }

      for (const word of Object.keys(WORD_TRIGGERS)) {
        if (state.typedBuffer.includes(word)) {
          state.typedBuffer = '';
          openWordOverlay(word);
          break;
        }
      }
    });

    wordOverlay.addEventListener('click', closeWordOverlay);
  }

  // --- Custom Context Menu ---
  function initContextMenu() {
    document.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      const x = Math.min(e.clientX, window.innerWidth - 260);
      const y = Math.min(e.clientY, window.innerHeight - 200);
      customContext.style.left = x + 'px';
      customContext.style.top = y + 'px';
      customContext.classList.remove('hidden');
      state.contextOpen = true;
    });

    document.addEventListener('click', () => {
      if (state.contextOpen) {
        customContext.classList.add('hidden');
        state.contextOpen = false;
      }
    });

    ctxReveal.addEventListener('click', (e) => {
      e.stopPropagation();
      customContext.classList.add('hidden');
      state.contextOpen = false;
      openDossier();
    });
  }

  // --- Scroll-based Interactions ---
  function initScroll() {
    // Scroll doesn't move the page, but triggers effects
    function onWheel(e) {
      e.preventDefault();
      state.scrollAccumulator += Math.abs(e.deltaY);

      // Trigger glitch effect on scroll
      const titleBlock = $('#title-block');
      titleBlock.style.transform = `translateX(${(Math.random() - 0.5) * 3}px)`;
      setTimeout(() => {
        titleBlock.style.transform = '';
      }, 100);

      // Enhanced scroll feedback
      enhancedScrollFeedback(e.deltaY);

      // After enough scrolling, reveal a hidden element
      if (state.scrollAccumulator > 2000 && !state.phaseTwoTriggered) {
        triggerPhaseTwo();
      }
    }

    document.addEventListener('wheel', onWheel, { passive: false });

    // Touch-based scroll alternative
    let lastTouchY = 0;
    document.addEventListener('touchstart', (e) => {
      lastTouchY = e.touches[0].clientY;
    }, { passive: true });

    document.addEventListener('touchmove', (e) => {
      const dy = Math.abs(e.touches[0].clientY - lastTouchY);
      state.scrollAccumulator += dy;
      lastTouchY = e.touches[0].clientY;

      // Enhanced scroll feedback on mobile too
      if (dy > 3) enhancedScrollFeedback(dy);

      if (state.scrollAccumulator > 2000 && !state.phaseTwoTriggered) {
        triggerPhaseTwo();
      }
    }, { passive: true });
  }

  // --- Phase Two (atmospheric shift) ---
  function triggerPhaseTwo() {
    if (state.phaseTwoTriggered) return;
    state.phaseTwoTriggered = true;
    document.body.classList.add('phase-two');

    // Add a new terminal line
    const newLine = document.createElement('div');
    newLine.className = 'term-line phase-two-line';
    newLine.innerHTML = '<span class="term-prefix" style="color:var(--accent-red-bright)">&gt;</span> EXPOSURE_PROTOCOL: ready to deploy';
    terminal.appendChild(newLine);
  }

  // --- Time-based Phase Two ---
  function initTimeTrigger() {
    setTimeout(() => {
      if (!state.phaseTwoTriggered) {
        triggerPhaseTwo();
      }
    }, 45000); // 45 seconds
  }

  // --- Mouse/Touch Tracking ---
  let revealRef = null;

  function initTracking() {
    revealRef = initRevealCanvas();

    // Always register both — on desktop, touch events simply won't fire;
    // on mobile, mousemove won't fire. Hybrid devices get both.
    document.addEventListener('mousemove', (e) => {
      state.mouseX = e.clientX;
      state.mouseY = e.clientY;
    });

    document.addEventListener('touchmove', (e) => {
      state.mouseX = e.touches[0].clientX;
      state.mouseY = e.touches[0].clientY;
    }, { passive: true });

    document.addEventListener('touchstart', (e) => {
      state.mouseX = e.touches[0].clientX;
      state.mouseY = e.touches[0].clientY;
    }, { passive: true });
  }

  // --- Main Animation Loop ---
  let waveformRef = null;

  function startLoop() {
    let frameCount = 0;
    function loop() {
      // These effects are useful on all platforms — cursor light and
      // reveal canvas are hidden via CSS on hover:none devices anyway.
      updateCursorLight(state.mouseX, state.mouseY);
      updateVignette(state.mouseX, state.mouseY);
      updateFragmentProximity(state.mouseX, state.mouseY);
      if (revealRef) revealRef.updateMask(state.mouseX, state.mouseY);
      updateEye(state.mouseX, state.mouseY);
      updateScanBeam();
      // Draw waveform at ~20fps to save perf
      if (frameCount % 3 === 0 && waveformRef) {
        waveformRef.draw();
      }
      frameCount++;
      state.rafId = requestAnimationFrame(loop);
    }
    state.rafId = requestAnimationFrame(loop);
  }

  // --- Ambient Glitch (random title glitch bursts) ---
  function initAmbientGlitch() {
    function glitchBurst() {
      const chars = document.querySelectorAll('#title-main .char');
      const randomChar = chars[Math.floor(Math.random() * chars.length)];
      if (!randomChar) return;

      const glitchChars = '!@#$%^&*()_+{}|:<>?0123456789';
      const original = randomChar.dataset.char;
      const replacement = glitchChars[Math.floor(Math.random() * glitchChars.length)];

      randomChar.textContent = replacement;
      randomChar.style.color = 'var(--accent-red-bright)';
      randomChar.style.textShadow = '0 0 10px rgba(200,48,48,0.6)';

      setTimeout(() => {
        randomChar.textContent = original;
        randomChar.style.color = '';
        randomChar.style.textShadow = '';
      }, 100 + Math.random() * 150);
    }

    // Random glitch every 3-8 seconds
    function scheduleGlitch() {
      const delay = 3000 + Math.random() * 5000;
      setTimeout(() => {
        glitchBurst();
        // Sometimes do a rapid burst
        if (Math.random() < 0.3) {
          setTimeout(glitchBurst, 80);
          setTimeout(glitchBurst, 160);
        }
        scheduleGlitch();
      }, delay);
    }

    // Start after initial reveal
    setTimeout(scheduleGlitch, 4000);
  }

  // --- Long-Press for Dossier (touch devices) ---
  function initMobileDossierTrigger() {
    // Always register — on non-touch devices these events simply never fire
    let pressTimer = null;
    const titleBlock = $('#title-block');

    titleBlock.addEventListener('touchstart', () => {
      pressTimer = setTimeout(() => {
        openDossier();
      }, 2000); // 2 second long press
    });

    titleBlock.addEventListener('touchend', () => {
      clearTimeout(pressTimer);
    });

    titleBlock.addEventListener('touchmove', () => {
      clearTimeout(pressTimer);
    });
  }

  // --- Double-tap easter egg (touch devices) ---
  function initDoubleTap() {
    // Always register — harmless on non-touch devices
    let lastTap = 0;
    const eyeContainer = $('#eye-container');

    eyeContainer.style.pointerEvents = 'auto';
    eyeContainer.addEventListener('touchend', (e) => {
      const now = Date.now();
      if (now - lastTap < 300) {
        // Double tap on eye — show a flash message
        openWordOverlay('hunt');
      }
      lastTap = now;
    });
  }

  // ===========================================
  // DISCOVERABLE INTERACTION LAYER
  // ===========================================

  // --- Anomaly Pulse (clickable breathing circle) ---
  const ANOMALY_TRANSMISSIONS = [
    'SIGNAL INTERCEPTED',
    'LINK ESTABLISHED',
    'NODE ACTIVE',
    'CHANNEL OPEN',
    'HANDSHAKE COMPLETE',
    'PACKET RECEIVED',
    'TRACE INITIATED',
    'FREQUENCY LOCKED',
  ];

  function initAnomaly() {
    function triggerAnomaly() {
      if (anomaly.classList.contains('activated')) return;

      state.anomalyCount++;
      anomaly.classList.add('activated');

      // Show a transmission message
      const msg = ANOMALY_TRANSMISSIONS[(state.anomalyCount - 1) % ANOMALY_TRANSMISSIONS.length];
      const tx = document.createElement('div');
      tx.className = 'anomaly-transmission';
      tx.textContent = msg;
      anomaly.appendChild(tx);

      // Brief screen distortion
      document.body.style.filter = 'brightness(1.15) hue-rotate(5deg)';
      setTimeout(() => {
        document.body.style.filter = '';
      }, 100);

      // Reset after animation
      setTimeout(() => {
        anomaly.classList.remove('activated');
        if (tx.parentNode) tx.parentNode.removeChild(tx);
      }, 2200);
    }

    anomaly.addEventListener('click', triggerAnomaly);
    anomaly.addEventListener('touchend', (e) => {
      e.preventDefault();
      triggerAnomaly();
    });
  }

  // --- Interactive Terminal Lines ---
  const TERM_DECRYPTS = [
    'we catalogued everything they did',
    'the logs were never deleted',
    'names. dates. screenshots. all of it.',
    'this is not a warning. it is a promise.',
  ];

  function initInteractiveTerminal() {
    const lines = document.querySelectorAll('.term-line[data-delay]');
    lines.forEach((line, idx) => {
      // Add decrypt layer
      const decrypt = document.createElement('div');
      decrypt.className = 'term-decrypt';
      decrypt.textContent = '> ' + TERM_DECRYPTS[idx];
      line.appendChild(decrypt);
      line.style.position = 'relative';

      let decryptTimeout = null;

      function showDecrypt() {
        line.classList.add('decrypting');
        clearTimeout(decryptTimeout);
        decryptTimeout = setTimeout(() => {
          line.classList.remove('decrypting');
        }, 1500);
      }

      // Desktop: hover
      line.addEventListener('mouseenter', showDecrypt);
      // Mobile: tap
      line.addEventListener('touchstart', (e) => {
        e.stopPropagation();
        line.classList.add('touched');
        showDecrypt();
        setTimeout(() => line.classList.remove('touched'), 300);
      }, { passive: true });
    });
  }

  // --- Interactive Title Characters ---
  function initInteractiveTitle() {
    const chars = document.querySelectorAll('#title-main .char');
    chars.forEach((ch) => {
      ch.addEventListener('touchstart', (e) => {
        e.stopPropagation();
        ch.classList.add('touched');
        // Trigger a mini glitch on touch
        const original = ch.dataset.char;
        const glitchChars = '!@#$%^&*_0123456789';
        ch.textContent = glitchChars[Math.floor(Math.random() * glitchChars.length)];
        ch.style.color = 'var(--accent-red-bright)';
        ch.style.textShadow = '0 0 20px rgba(200,48,48,0.6)';
        setTimeout(() => {
          ch.textContent = original;
          ch.style.color = '';
          ch.style.textShadow = '';
          ch.classList.remove('touched');
        }, 200);
      }, { passive: true });
    });
  }

  // --- Scan Beam (bright line that sweeps the screen) ---
  function initScanBeam() {
    const h = window.innerHeight;
    state.scanBeamY = 0;

    // Click/tap on the scan beam area triggers disruption
    document.addEventListener('click', (e) => {
      if (state.contextOpen || state.dossierOpen || state.konamiOpen || state.wordOverlayOpen) return;
      // Check if click is near the scan beam
      const beamY = state.scanBeamY;
      if (Math.abs(e.clientY - beamY) < 30) {
        disruptScanBeam();
      }
    });
  }

  function disruptScanBeam() {
    if (state.scanBeamDisrupted) return;
    state.scanBeamDisrupted = true;
    scanBeam.classList.add('disrupted');
    state.scanBeamSpeed = 2.5;

    setTimeout(() => {
      state.scanBeamDisrupted = false;
      scanBeam.classList.remove('disrupted');
      state.scanBeamSpeed = 0.4;
    }, 2000);
  }

  function updateScanBeam() {
    const h = window.innerHeight;
    state.scanBeamY += state.scanBeamSpeed * state.scanBeamDir;
    if (state.scanBeamY > h) {
      state.scanBeamDir = -1;
      state.scanBeamY = h;
    } else if (state.scanBeamY < 0) {
      state.scanBeamDir = 1;
      state.scanBeamY = 0;
    }
    scanBeam.style.transform = `translateY(${state.scanBeamY}px) translateZ(0)`;
  }

  // --- Waveform / Signal Monitor ---
  function initWaveform() {
    const ctx = waveformCanvas.getContext('2d');
    let w, h;
    let phase = 0;

    function resize() {
      const rect = waveformCanvas.getBoundingClientRect();
      w = Math.ceil(rect.width * (window.devicePixelRatio > 1 ? 2 : 1));
      h = Math.ceil(rect.height * (window.devicePixelRatio > 1 ? 2 : 1));
      waveformCanvas.width = w;
      waveformCanvas.height = h;
    }

    resize();
    window.addEventListener('resize', resize);

    function draw() {
      ctx.clearRect(0, 0, w, h);
      ctx.strokeStyle = state.waveformExcited
        ? 'rgba(200, 48, 48, 0.7)'
        : 'rgba(45, 138, 78, 0.4)';
      ctx.lineWidth = 1;
      ctx.beginPath();

      const amp = state.waveformExcited ? h * 0.4 : h * 0.15;
      const freq = state.waveformExcited ? 0.08 : 0.04;
      const speed = state.waveformExcited ? 0.15 : 0.03;

      for (let x = 0; x < w; x++) {
        const y = h / 2 + Math.sin(x * freq + phase) * amp
          + Math.sin(x * freq * 2.3 + phase * 1.7) * amp * 0.3;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Glow line
      if (state.waveformExcited) {
        ctx.strokeStyle = 'rgba(200, 48, 48, 0.15)';
        ctx.lineWidth = 4;
        ctx.stroke();
      }

      phase += speed;
    }

    // Click to excite
    function excite() {
      if (state.waveformExcited) return;
      state.waveformExcited = true;

      // Brief screen flash
      document.body.style.filter = 'brightness(1.1)';
      setTimeout(() => { document.body.style.filter = ''; }, 80);

      setTimeout(() => {
        state.waveformExcited = false;
      }, 3000);
    }

    waveformCanvas.addEventListener('click', excite);
    waveformCanvas.addEventListener('touchend', (e) => {
      e.preventDefault();
      excite();
    });

    return { draw };
  }

  // --- Redacted Block Interaction ---
  function initRedactedBlock() {
    const bars = document.querySelectorAll('.redacted-bar');
    bars.forEach((bar) => {
      let revealTimeout = null;

      function revealBriefly() {
        bar.classList.add('briefly-revealed');
        bar.textContent = bar.dataset.reveal;
        clearTimeout(revealTimeout);
        revealTimeout = setTimeout(() => {
          bar.classList.remove('briefly-revealed');
          // Re-censor with matching-length block chars
          const len = bar.dataset.reveal.length;
          bar.textContent = '█'.repeat(Math.max(len, 4));
        }, 800);
      }

      // Desktop hover
      bar.addEventListener('mouseenter', revealBriefly);
      bar.addEventListener('mouseleave', () => {
        clearTimeout(revealTimeout);
        revealTimeout = setTimeout(() => {
          bar.classList.remove('briefly-revealed');
          const len = bar.dataset.reveal.length;
          bar.textContent = '█'.repeat(Math.max(len, 4));
        }, 200);
      });

      // Mobile tap
      bar.addEventListener('touchstart', (e) => {
        e.stopPropagation();
        bar.classList.add('touched');
        revealBriefly();
        setTimeout(() => bar.classList.remove('touched'), 300);
      }, { passive: true });
    });
  }

  // --- Enhanced Scroll Interactions ---
  const SCROLL_FLASH_TEXTS = [
    'PARSING...',
    'SIGNAL ACQUIRED',
    'DEPTH: ███',
    'SCANNING',
    'LAYER BREACH',
    'TRACE ACTIVE',
    'INCOMING',
    'DECRYPT FAIL',
    'NODE 7 ONLINE',
    'STAND BY',
  ];
  let scrollFlashIndex = 0;

  function enhancedScrollFeedback(deltaY) {
    // 1. Grain intensification
    clearTimeout(state.scrollGrainTimeout);
    document.body.classList.add('scroll-active');
    state.scrollGrainTimeout = setTimeout(() => {
      document.body.classList.remove('scroll-active');
    }, 200);

    // 2. Flash a cryptic text fragment
    clearTimeout(state.scrollFlashTimeout);
    scrollFlash.textContent = SCROLL_FLASH_TEXTS[scrollFlashIndex % SCROLL_FLASH_TEXTS.length];
    scrollFlash.classList.add('visible');
    scrollFlashIndex++;
    state.scrollFlashTimeout = setTimeout(() => {
      scrollFlash.classList.remove('visible');
    }, 300);

    // 3. Disrupt the scan beam slightly on scroll
    state.scanBeamSpeed = Math.min(state.scanBeamSpeed + 0.5, 3);
    setTimeout(() => {
      if (!state.scanBeamDisrupted) state.scanBeamSpeed = 0.4;
    }, 500);

    // 4. Update signal strength indicator
    updateSignalStrength();
  }

  // --- Signal Strength Indicator ---
  function updateSignalStrength() {
    // Compute level from scroll accumulator (0-5)
    const maxScroll = 2000; // matches phase-two threshold
    state.signalLevel = Math.min(5, Math.floor((state.scrollAccumulator / maxScroll) * 5));

    const bars = document.querySelectorAll('.sig-bar');
    bars.forEach((bar) => {
      const barIdx = parseInt(bar.dataset.bar);
      if (barIdx < state.signalLevel) {
        bar.classList.add('active');
        bar.classList.toggle('danger', state.signalLevel >= 5);
      } else {
        bar.classList.remove('active', 'danger');
      }
    });
  }

  // --- Mobile Hint ---
  function initMobileHint() {
    // Re-evaluate at call time, not parse time, and use both checks
    const isTouchDevice = window.matchMedia('(hover: none) and (pointer: coarse)').matches
      && ('ontouchstart' in window || navigator.maxTouchPoints > 0);

    if (!isTouchDevice) return;

    setTimeout(() => {
      mobileHint.classList.remove('hidden');
      setTimeout(() => {
        mobileHint.classList.add('hidden');
      }, 2500);
    }, 6000);

    // Also pulse the anomaly on mobile after 7s
    setTimeout(() => {
      if (!anomaly) return;
      anomaly.style.transform = 'scale(1.5)';
      anomaly.style.transition = 'transform 0.4s ease';
      setTimeout(() => {
        anomaly.style.transform = '';
        setTimeout(() => {
          anomaly.style.transition = '';
        }, 400);
      }, 600);
    }, 8000);
  }

  // --- Initialize Everything ---
  function init() {
    // Mark loaded after a short delay for the entrance sequence
    setTimeout(() => {
      document.body.classList.add('loaded');
      state.loaded = true;
    }, 300);

    // Start typing the signal line after title reveals
    setTimeout(typeSignal, 2800);

    // Keep isMobile in sync if device capabilities change (e.g. tablet keyboard attached)
    mobileQuery.addEventListener('change', (e) => {
      state.isMobile = e.matches;
    });

    initNoise();
    initTracking();
    initMorse();
    initDossier();
    initKonami();
    initWordTriggers();
    initContextMenu();
    initScroll();
    initTimeTrigger();
    initAmbientGlitch();
    initMobileDossierTrigger();
    initDoubleTap();
    // Discoverable layer
    initAnomaly();
    initInteractiveTerminal();
    initInteractiveTitle();
    initScanBeam();
    waveformRef = initWaveform();
    initRedactedBlock();
    initMobileHint();
    startLoop();
  }

  // --- Boot ---
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

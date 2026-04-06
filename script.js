/* ========================================
   VIBHA CONSCIOUS — TEASER ENGINE
   ======================================== */

(function () {
  'use strict';

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
    isMobile: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
    rafId: null,
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

    // Mobile: tap pattern (corners: TL, TL, TR, TR, BL, BR, BL, BR, center, center)
    if (state.isMobile) {
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

    if (!state.isMobile) {
      document.addEventListener('mousemove', (e) => {
        state.mouseX = e.clientX;
        state.mouseY = e.clientY;
      });
    } else {
      document.addEventListener('touchmove', (e) => {
        state.mouseX = e.touches[0].clientX;
        state.mouseY = e.touches[0].clientY;
      }, { passive: true });

      document.addEventListener('touchstart', (e) => {
        state.mouseX = e.touches[0].clientX;
        state.mouseY = e.touches[0].clientY;
      }, { passive: true });
    }
  }

  // --- Main Animation Loop ---
  function startLoop() {
    function loop() {
      if (!state.isMobile) {
        updateCursorLight(state.mouseX, state.mouseY);
        updateVignette(state.mouseX, state.mouseY);
        updateFragmentProximity(state.mouseX, state.mouseY);
        if (revealRef) revealRef.updateMask(state.mouseX, state.mouseY);
      }
      updateEye(state.mouseX, state.mouseY);
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

  // --- Mobile Long-Press for Dossier ---
  function initMobileDossierTrigger() {
    if (!state.isMobile) return;

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

  // --- Double-tap easter egg for mobile ---
  function initDoubleTap() {
    if (!state.isMobile) return;

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

  // --- Initialize Everything ---
  function init() {
    // Mark loaded after a short delay for the entrance sequence
    setTimeout(() => {
      document.body.classList.add('loaded');
      state.loaded = true;
    }, 300);

    // Start typing the signal line after title reveals
    setTimeout(typeSignal, 2800);

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
    startLoop();
  }

  // --- Boot ---
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

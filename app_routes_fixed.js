/* =========================================================
   APP — Mini Tolerance + Short phrases that grow
   - SpeechRecognition warm-up + retry on "no-speech"
   - Interim results + maxAlternatives
   - Phrases start short and add 1 chunk per level
   - 100 verbs + 100 words
   ========================================================= */

(() => {
  "use strict";

  // -------------------------
  // 0) DOM helpers
  // -------------------------
  const $ = (id) => document.getElementById(id);

  // REQUIRED ids (match your HTML)
  const elTarget   = $("targetText");
  const elHeard    = $("heardText");
  const elStatus   = $("statusText");
  const elLevel    = $("levelVal");
  const elScore    = $("scoreVal");
  const elStreak   = $("streakVal");

  const btnMic     = $("btnMic");
  const btnCheck   = $("btnCheck");
  const btnNext    = $("btnNext");
  const btnSpeak   = $("btnSpeak");

  const selRecLang = $("recLang");      // select
  const chkAntiEcho= $("antiEcho");     // checkbox

  // Optional modal (if you have it)
  const modal      = $("modal");
  const modalText  = $("modalText");
  const modalClose = $("modalClose");

  function setStatus(msg, tone = "muted") {
    if (!elStatus) return;
    elStatus.textContent = msg;
    elStatus.dataset.tone = tone;
  }

  function setText(el, txt) {
    if (el) el.textContent = txt;
  }

  // -------------------------
  // 1) Content: 100 verbs + 100 words
  // -------------------------
  const VERBS_100 = [
    "be","have","do","say","go","get","make","know","think","take",
    "see","come","want","use","find","give","tell","work","call",
    "try","ask","need","feel","become","leave","put","mean","keep",
    "let","begin","seem","help","talk","turn","start","show","hear","play",
    "run","move","live","believe","bring","happen","write","provide","sit","stand",
    "lose","pay","meet","include","continue","set","learn","change","lead","understand",
    "watch","follow","stop","create","speak","read","allow","add","spend","grow",
    "open","walk","win","offer","remember","love","study","practice","build","draw",
    "cook","clean","listen","travel","drive","dance","sing","laugh","share","choose",
    "carry","cut","fix","join","plan","record","upload","download","focus","improve"
  ];

  const WORDS_100 = [
    "coffee","water","tea","music","a book","a movie","a game","a song","a podcast","a lesson",
    "a plan","a sketch","a drawing","a story","a joke","a video","a project","a schedule","a note","a message",
    "my phone","my laptop","my keys","my bag","my shoes","my jacket","my room","my desk","the window","the door",
    "a chair","a table","a lamp","a mirror","a plant","a picture","a poster","a toy","a dinosaur","a camera",
    "a microphone","a notebook","a pen","a pencil","a brush","a palette","a color","a shape","a line","a frame",
    "a scene","a character","a background","an idea","a dream","a goal","a habit","a break","a snack","a sandwich",
    "a salad","a pizza","a burger","a fruit","an apple","a banana","a cookie","a cake","a ticket","a map",
    "a bus","a train","a car","a bike","a street","a park","a café","a store","a school","a studio",
    "a meeting","a friend","my team","my teacher","a client","a fan","a comment","a like","a playlist","a timer",
    "a calendar","an email","a call","a test","a quiz","a challenge","a point","a level","a win","a smile"
  ];

  // Short chunks that can be appended progressively
  const CHUNKS = [
    "today",
    "right now",
    "at home",
    "in the studio",
    "after class",
    "before lunch",
    "with my friend",
    "with my team",
    "for a minute",
    "for practice",
    "because I can",
    "and I feel good",
    "and I stay calm",
    "and I keep going",
    "but it's okay",
    "so I try again",
    "to get better",
    "to learn fast",
    "to save time",
    "to have fun"
  ];

  // Very short starters (keep it simple)
  const SUBJECTS = ["I", "We", "They", "You"];
  const OPENERS  = ["I", "I", "I", "We"]; // bias to "I" for learning

  // -------------------------
  // 2) Phrase builder (short -> longer)
  // -------------------------
  function pickRand(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function buildPhrase(level) {
    // base: 3 words-ish
    const subj = pickRand(OPENERS);
    const verb = pickRand(VERBS_100);
    const obj  = pickRand(WORDS_100);

    // keep base short
    let parts = [subj, verb, obj];

    // add 1 chunk every 2 levels, capped
    const addCount = Math.min(CHUNKS.length, Math.floor((level - 1) / 2));
    for (let i = 0; i < addCount; i++) {
      parts.push(CHUNKS[i]);
    }

    return parts.join(" ").replace(/\s+/g, " ").trim();
  }

  // -------------------------
  // 3) Mini tolerance (not too strict)
  // -------------------------
  function norm(s) {
    return (s || "")
      .toLowerCase()
      .replace(/’/g, "'")
      .replace(/[^a-z0-9'\s]/g, " ")
      .replace(/\b(uh|um|like|you know)\b/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  // Word overlap score (simple, stable)
  function wordOverlapScore(a, b) {
    const A = norm(a).split(" ").filter(Boolean);
    const B = norm(b).split(" ").filter(Boolean);
    if (!A.length || !B.length) return 0;

    const setB = new Set(B);
    let hit = 0;
    for (const w of A) if (setB.has(w)) hit++;

    return hit / Math.max(1, A.length);
  }

  // Tiny edit distance (only for short strings)
  function levenshtein(a, b) {
    a = norm(a);
    b = norm(b);
    const m = a.length, n = b.length;
    if (!m) return n;
    if (!n) return m;

    const dp = new Array(n + 1);
    for (let j = 0; j <= n; j++) dp[j] = j;

    for (let i = 1; i <= m; i++) {
      let prev = dp[0];
      dp[0] = i;
      for (let j = 1; j <= n; j++) {
        const temp = dp[j];
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        dp[j] = Math.min(
          dp[j] + 1,      // delete
          dp[j - 1] + 1,  // insert
          prev + cost     // substitute
        );
        prev = temp;
      }
    }
    return dp[n];
  }

  function similarity(a, b) {
    // Combine overlap + (small) edit similarity
    const overlap = wordOverlapScore(a, b);

    const na = norm(a), nb = norm(b);
    const maxLen = Math.max(1, Math.max(na.length, nb.length));
    const dist = levenshtein(na, nb);
    const editSim = 1 - (dist / maxLen);

    // Weighted
    return 0.7 * overlap + 0.3 * editSim;
  }

  // Pass threshold: start forgiving, get slightly stricter later
  function passThreshold(level) {
    // level 1..10 forgiving, later a bit stricter
    if (level < 10) return 0.68;
    if (level < 30) return 0.72;
    return 0.76;
  }

  // -------------------------
  // 4) Speech recognition + warm up
  // -------------------------
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  let recognizer = null;
  let listening = false;
  let retryNoSpeech = 0;
  let lastHeard = "";

  // TTS
  let ttsSpeaking = false;
  function speak(text) {
    if (!("speechSynthesis" in window)) return;
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = (selRecLang && selRecLang.value) ? selRecLang.value : "en-US";
      u.rate = 1.0;
      u.onstart = () => { ttsSpeaking = true; };
      u.onend = () => { ttsSpeaking = false; };
      u.onerror = () => { ttsSpeaking = false; };
      window.speechSynthesis.speak(u);
    } catch {}
  }

  async function primeMic() {
    // Warm up audio permission channel → reduces "no-speech"
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return true;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(t => t.stop());
      return true;
    } catch {
      return false;
    }
  }

  function ensureRecognizer() {
    if (!SR) {
      setStatus("SpeechRecognition not supported in this browser.", "warn");
      return false;
    }
    if (recognizer) return true;

    recognizer = new SR();
    recognizer.continuous = false;
    recognizer.interimResults = true;
    recognizer.maxAlternatives = 5;

    recognizer.onstart = () => {
      listening = true;
      retryNoSpeech = 0;
      setStatus("Listening… speak now.", "muted");
      if (btnMic) btnMic.textContent = "🛑 Stop mic";
    };

    recognizer.onresult = (e) => {
      const res = e.results[e.resultIndex];
      if (!res || !res.length) return;

      // pick best by confidence
      let best = res[0];
      for (let i = 1; i < res.length; i++) {
        const c = res[i].confidence || 0;
        const cb = best.confidence || 0;
        if (c > cb) best = res[i];
      }

      const text = (best.transcript || "").trim();
      if (text) {
        lastHeard = text;
        setText(elHeard, text);
      }

      // If final result arrives, stop status
      if (res.isFinal) {
        setStatus("Heard. Press CHECK.", "ok");
      }
    };

    recognizer.onerror = (e) => {
      const err = e?.error || "unknown";
      listening = false;
      if (btnMic) btnMic.textContent = "🎙️ Start mic";

      if (err === "no-speech") {
        // auto retry a couple times
        if (retryNoSpeech < 2) {
          retryNoSpeech++;
          setStatus("No speech… retrying.", "warn");
          setTimeout(() => {
            try { recognizer.start(); } catch {}
          }, 350);
          return;
        }
        setStatus("No speech detected. Speak closer / louder.", "warn");
        return;
      }

      if (err === "not-allowed" || err === "service-not-allowed") {
        setStatus("Mic blocked. Allow microphone in browser settings.", "warn");
        return;
      }

      setStatus(`Mic error: ${err}`, "warn");
    };

    recognizer.onend = () => {
      listening = false;
      if (btnMic) btnMic.textContent = "🎙️ Start mic";
      // Do not override status if already ok/warn
    };

    return true;
  }

  async function startMic() {
    if (!ensureRecognizer()) return;

    if (chkAntiEcho && chkAntiEcho.checked && ttsSpeaking) {
      setStatus("Wait… voice is speaking.", "warn");
      return;
    }

    const ok = await primeMic();
    if (!ok) {
      setStatus("Mic blocked by system/browser. Check permissions.", "warn");
      return;
    }

    recognizer.lang = (selRecLang && selRecLang.value) ? selRecLang.value : "en-US";

    try {
      recognizer.start();
    } catch {
      setStatus("Mic start failed. Try again.", "warn");
    }
  }

  function stopMic() {
    if (!recognizer) return;
    try { recognizer.stop(); } catch {}
  }

  // -------------------------
  // 5) Game state
  // -------------------------
  let level = 1;
  let score = 0;
  let streak = 0;
  let target = "";

  function render() {
    setText(elLevel, String(level));
    setText(elScore, String(score));
    setText(elStreak, String(streak));
    setText(elTarget, target);
  }

  function newRound() {
    target = buildPhrase(level);
    setText(elHeard, "");
    lastHeard = "";
    render();
    setStatus("Press 🎙️ and say the sentence.", "muted");
  }

  function checkAnswer() {
    if (!target) return;

    const mic = lastHeard || (elHeard ? elHeard.textContent : "");
    if (!mic || !mic.trim()) {
      setStatus("I heard nothing. Press 🎙️ and speak.", "warn");
      return;
    }

    const sim = similarity(mic, target);
    const thr = passThreshold(level);

    if (sim >= thr) {
      streak++;
      score += 10 + Math.min(10, streak); // small bonus
      setStatus(`Nice! ✅ (match ${(sim*100).toFixed(0)}%)`, "ok");

      // Optional: tiny celebratory modal
      if (modal && modalText) {
        modalText.textContent = `Good! Keep going. (+${10 + Math.min(10, streak)} pts)`;
        modal.hidden = false;
      }
    } else {
      streak = 0;
      setStatus(`Almost. Try again. (match ${(sim*100).toFixed(0)}%)`, "warn");
    }

    render();
  }

  function nextLevel() {
    level++;
    newRound();
  }

  // -------------------------
  // 6) Wire UI
  // -------------------------
  function requireEl(name, el) {
    if (!el) console.warn(`Missing element id="${name}" in HTML.`);
  }
  requireEl("targetText", elTarget);
  requireEl("heardText", elHeard);
  requireEl("statusText", elStatus);
  requireEl("btnMic", btnMic);
  requireEl("btnCheck", btnCheck);
  requireEl("btnNext", btnNext);

  if (btnMic) {
    btnMic.addEventListener("click", () => {
      if (listening) stopMic();
      else startMic();
    });
  }

  if (btnCheck) btnCheck.addEventListener("click", checkAnswer);
  if (btnNext)  btnNext.addEventListener("click", nextLevel);

  if (btnSpeak) {
    btnSpeak.addEventListener("click", () => {
      if (!target) return;
      speak(target);
    });
  }

  if (modalClose && modal) {
    modalClose.addEventListener("click", () => { modal.hidden = true; });
  }
  // click outside closes modal
  if (modal) {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) modal.hidden = true;
    });
  }

  // -------------------------
  // 7) Init
  // -------------------------
  // Default language: US English
  if (selRecLang && !selRecLang.value) selRecLang.value = "en-US";

  newRound();
})();

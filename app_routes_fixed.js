(() => {
  // =========================================================
  // TENSE BUILDER — v1 (short phrases that grow)
  // - frases cortas
  // - cada nivel agrega 1 chunk corto
  // - 100 verbos + 100 palabras/objetos
  // - mic "warm-up" + retry para evitar no-speech
  // =========================================================

  if (window.__TB_INITED__) return;
  window.__TB_INITED__ = true;

  // -------------------------
  // DOM
  // -------------------------
  const $ = (id) => document.getElementById(id);

  const btnNew       = $("btnNew");
  const btnSpeak     = $("btnSpeak");
  const btnMic       = $("btnMic");
  const btnTranslate = $("btnTranslate");
  const btnShow      = $("btnShow");
  const btnCheck     = $("btnCheck");
  const btnSkip      = $("btnSkip");
  const btnModalOk   = $("btnModalOk");

  const targetText = $("targetText");
  const heardText  = $("heardText");
  const feedback   = $("feedback");
  const glossary   = $("glossary");
  const statusEl   = $("status");

  const statLevel  = $("statLevel");
  const statScore  = $("statScore");
  const statStreak = $("statStreak");

  const selMode    = $("selMode");
  const selQType   = $("selQType");
  const selTense   = $("selTense");
  const selVoice   = $("selVoice");
  const selRecLang = $("selRecLang");
  const chkAntiEcho = $("chkAntiEcho");

  const medalsEl   = $("medals");
  const medalCount = $("medalCount");

  const modal     = $("modal");
  const modalImg  = $("modalImg");
  const modalText = $("modalText");

  // -------------------------
  // STATE
  // -------------------------
  const MAX_LEVEL = 100;

  let level = 1;
  let score = 0;
  let streak = 0;

  let currentTarget = "";
  let unitCompleted = false;

  // TTS
  let ttsVoice = null;
  let ttsSpeaking = false;

  // Speech Recognition
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  let recognizer = null;
  let sessionActive = false;

  // -------------------------
  // MEDALS
  // -------------------------
  const MEDAL_ROSTER = [
    { id:"zibra", name:"ZIBRA", img:"assets/medals/zibra.png" },
    { id:"patapim", name:"PATAPIM", img:"assets/medals/patapim.png" },
    { id:"gangster", name:"GANGSTER", img:"assets/medals/gangster.png" },
    { id:"shimpanzinni", name:"SHIMPANZINNI", img:"assets/medals/shimpanzinni.png" },
    { id:"lirili_larila", name:"LIRILI LARILA", img:"assets/medals/lirili_larila.png" },
    { id:"frigo_camelo", name:"FRIGO CAMELO", img:"assets/medals/frigo_camelo.png" },
    { id:"bulbito", name:"BULBITO", img:"assets/medals/bulbito.png" },
    { id:"bombardino", name:"BOMBARDINO", img:"assets/medals/bombardino.png" },
    { id:"balerina", name:"BALLERINA", img:"assets/medals/balerina.png" },
    { id:"burbaloni", name:"BURBALONI", img:"assets/medals/burbaloni.png" },
    { id:"trulimero", name:"TRULIMERO", img:"assets/medals/trulimero.png" },
    { id:"tralalero", name:"TRALALERO", img:"assets/medals/tralalero.png" },
    { id:"bananita", name:"BANANITA", img:"assets/medals/bananita.png" },
    { id:"havana", name:"HAVANA", img:"assets/medals/havana.png" },
    { id:"tung_tung", name:"TUNG-TUNG", img:"assets/medals/tung_tung.png" },
  ];

  const LS_UNLOCK = "tb_unlocked_v1";
  const unlocked = new Set(JSON.parse(localStorage.getItem(LS_UNLOCK) || "[]"));

  function renderMedals(){
    medalCount.textContent = `${unlocked.size}/${MEDAL_ROSTER.length}`;
    medalsEl.innerHTML = "";
    for (const m of MEDAL_ROSTER){
      const div = document.createElement("div");
      div.className = "medal " + (unlocked.has(m.id) ? "unlocked" : "locked");
      div.dataset.medalId = m.id;

      const img = document.createElement("img");
      img.src = m.img;
      img.alt = m.name;
      img.onerror = () => { img.src = "assets/medals/frigo_camelo.png"; };
      div.appendChild(img);

      medalsEl.appendChild(div);
    }
  }

  function openUnlockModal(medal){
    if (!medal) return;
    modalImg.alt = medal.name || "character";
    modalImg.src = medal.img || "";
    modalImg.onerror = () => {
      modalImg.onerror = null;
      modalImg.src = "assets/medals/frigo_camelo.png";
    };
    modalText.textContent = `Awesome! You rescued: ${medal.name}.`;
    modal.hidden = false;
    speak(`You rescued ${medal.name}.`);
  }

  function closeModal(){ modal.hidden = true; }

  function tryUnlockAtUnitEnd(){
    if (!unitCompleted || level !== MAX_LEVEL) return;
    if (unlocked.size >= MEDAL_ROSTER.length) return;

    const medal = MEDAL_ROSTER[unlocked.size];
    unlocked.add(medal.id);
    localStorage.setItem(LS_UNLOCK, JSON.stringify([...unlocked]));
    renderMedals();
    openUnlockModal(medal);
  }

  // -------------------------
  // DATA (100 verbs + 100 words/objects)
  // -------------------------
  const SUBJECTS = ["I","you","we","they","he","she"];

  const VERBS = ["work","study","practice","learn","build","make","write","read","watch","listen","speak","think","plan","create","design","draw","animate","edit","record","share","post","upload","download","save","open","close","start","stop","check","fix","improve","change","choose","use","try","repeat","remember","forget","focus","rest","help","meet","call","text","ask","answer","explain","compare","review","test","run","walk","move","carry","bring","send","receive","buy","sell","pay","cook","eat","drink","sleep","wake","clean","wash","drive","ride","travel","arrive","leave","enter","exit","sit","stand","smile","laugh","cry","wait","hope","need","want","like","love","hate","prefer","know","understand","believe","feel","play","win","lose","join","lead","follow","teach","finish","continue"];
  const WORDS = ["my project","this lesson","English","a plan","the task","my schedule","the meeting","my voice","a sentence","a question","the answer","a new unit","my notes","the timeline","a short phrase","a new idea","my goal","a checklist","the game","the mic","my pronunciation","my grammar","my vocabulary","a verb","a word","a rule","a sample","a draft","the file","the app","the code","the UI","the design","the story","a character","a scene","the animation","a sketch","a storyboard","the script","my team","a client","a friend","my teacher","my class","my phone","my laptop","the browser","the server","the page","the button","the level","the score","the streak","my progress","a result","a mistake","a fix","a new version","a test","today","this week","right now","in the morning","at night","after class","before work","at home","at work","online","with focus","with calm","with energy","with my team","for practice","for fun","for my future","for my job","for my goal","again","slowly","quickly","clearly","loudly","softly","better","again and again","step by step","one more time","every day","because it helps","because it matters","because I can","because I want","so I improve","so I learn","so I finish","so I win","and I smile","and I continue"];

  // mini glossary ES (solo para pistas)
  const ES = {
    i:"yo", you:"tú", we:"nosotros", they:"ellos", he:"él", she:"ella",
    work:"trabajo", study:"estudio", practice:"practico", learn:"aprendo", build:"construyo",
    make:"hago", write:"escribo", read:"leo", speak:"hablo", listen:"escucho",
    check:"reviso", improve:"mejoro", fix:"arreglo", plan:"plan", project:"proyecto",
    today:"hoy", week:"semana", now:"ahora", online:"en línea", home:"casa", mic:"micrófono"
  };

  function pick(arr){ return arr[Math.floor(Math.random()*arr.length)]; }
  function chance(p){ return Math.random() < p; }

  function clean(s){
    return String(s)
      .replace(/\s+/g," ")
      .replace(/\s+,/g,",")
      .trim();
  }

  function tokenize(s){
    return clean(s)
      .replace(/[\.,!?]/g,"")
      .toLowerCase()
      .split(" ")
      .filter(Boolean);
  }

  // -------------------------
  // SHORT PHRASE ENGINE (grow by chunks)
  // -------------------------
  // Chunks cortos. Máximo ~18 palabras para que siga liviano.
  const CHUNKS_TIME  = ["today","now","this week","tonight","later","again"];
  const CHUNKS_PLACE = ["at home","at work","online","in class","with my team"];
  const CHUNKS_MOOD  = ["calmly","clearly","slowly","quickly","confidently"];
  const CHUNKS_LINK  = ["because it helps","so I improve","and I continue","but it's ok","for real"];
  const CHUNKS_EXTRA = ["one more time","step by step","no cap","with focus","with energy"];

  function buildBase(mode, qType, tense){
    const s = pick(SUBJECTS);
    const v = pick(VERBS);
    const w = pick(WORDS);

    if (mode === "questions") {
      if (qType === "wh") {
        const wh = pick(["What","Where","When","Why","How"]);
        return clean(`${wh} do ${s.toLowerCase()} ${v}?`);
      }
      return clean(`Do ${s.toLowerCase()} ${v} ${w}?`);
    }

    if (tense === "present_cont") {
      const be = (s==="I") ? "am" : (s==="he"||s==="she") ? "is" : "are";
      const ing = v.endsWith("e") ? (v.slice(0,-1)+"ing") : (v+"ing");
      return clean(`${s} ${be} ${ing} ${w}.`);
    }
    if (tense === "future_will") {
      return clean(`${s} will ${v} ${w}.`);
    }
    if (tense === "present_perf") {
      const have = (s==="he"||s==="she") ? "has" : "have";
      return clean(`${s} ${have} ${v} ${w} already.`);
    }

    // default present simple
    return clean(`${s} ${v} ${w}.`);
  }

  function addChunk(sentence, mode, chunk){
    if (!chunk) return sentence;

    if (mode === "questions") {
      if (sentence.endsWith("?")) {
        const core = sentence.slice(0,-1);
        return clean(`${core} ${chunk}?`);
      }
      return clean(`${sentence} ${chunk}?`);
    }

    if (sentence.endsWith(".")) {
      const core = sentence.slice(0,-1);
      return clean(`${core} ${chunk}.`);
    }
    return clean(`${sentence} ${chunk}.`);
  }

  function tooLong(sentence){
    return tokenize(sentence).length > 18;
  }

  function buildLevels(base, mode){
    const lvls = [clean(base)];
    const pools = [CHUNKS_TIME, CHUNKS_PLACE, CHUNKS_MOOD, CHUNKS_LINK, CHUNKS_EXTRA];

    let s = lvls[0];
    let poolIndex = 0;

    while (lvls.length < MAX_LEVEL) {
      const chunk = pick(pools[poolIndex % pools.length]);
      let next = addChunk(s, mode, chunk);

      // keep it short: if it gets too long, restart from base and grow again
      if (tooLong(next)) {
        s = lvls[0];
        next = addChunk(s, mode, chunk);
      } else {
        s = next;
      }

      // tiny spice (rare) but still short
      if (mode !== "questions" && chance(0.10)) {
        next = next.replace(/^I\b/, "Today, I").replace(/^You\b/, "Today, you");
        next = clean(next);
      }

      lvls.push(next);
      poolIndex++;
    }

    return lvls;
  }

  // -------------------------
  // UI helpers
  // -------------------------
  function setStatus(msg, tone="muted"){
    statusEl.textContent = msg;
    statusEl.style.color =
      (tone==="ok") ? "var(--ok)" :
      (tone==="warn") ? "var(--warn)" :
      "var(--muted)";
  }

  function renderStats(){
    statLevel.textContent = String(level);
    statScore.textContent = String(score);
    statStreak.textContent = String(streak);
  }

  function renderTarget(){
    targetText.textContent = currentTarget || "—";
  }

  // -------------------------
  // TTS
  // -------------------------
  function loadVoices(){
    if (!window.speechSynthesis) return;

    const voices = speechSynthesis.getVoices();
    selVoice.innerHTML = "";

    voices
      .filter(v => /en/i.test(v.lang))
      .forEach(v => {
        const opt = document.createElement("option");
        opt.value = v.name;
        opt.textContent = `${v.name} — ${v.lang}`;
        selVoice.appendChild(opt);
      });

    if (selVoice.options.length) {
      selVoice.value = selVoice.options[0].value;
      selectVoice();
    }
  }

  function selectVoice(){
    if (!window.speechSynthesis) return;
    const voices = speechSynthesis.getVoices();
    ttsVoice = voices.find(v => v.name === selVoice.value) || null;
  }

  function speak(text){
    if (!window.speechSynthesis || !text) return;
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = selRecLang.value || "en-US";
      if (ttsVoice) u.voice = ttsVoice;

      ttsSpeaking = true;
      u.onend = () => { ttsSpeaking = false; };
      u.onerror = () => { ttsSpeaking = false; };

      speechSynthesis.speak(u);
    } catch(e) {}
  }

  // -------------------------
  // MIC — warm-up + retry
  // -------------------------
  async function primeMic(){
    if (!navigator.mediaDevices?.getUserMedia) return true;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio:true });
      stream.getTracks().forEach(t => t.stop());
      return true;
    } catch(e) {
      return false;
    }
  }

  let __micRetry = 0;
  const __MIC_RETRY_MAX = 2;

  function ensureRecognizer(){
    if (!SR) {
      setStatus("Speech recognition is not supported in this browser.", "warn");
      return false;
    }
    if (recognizer) return true;

    recognizer = new SR();
    recognizer.interimResults = false;
    recognizer.continuous = false;

    recognizer.onresult = (e) => {
      const t = (e.results && e.results[0] && e.results[0][0]) ? e.results[0][0].transcript : "";
      heardText.value = t;
      setStatus("Heard. Press Check.", "ok");
    };

    recognizer.onerror = async (e) => {
      const err = e?.error ? String(e.error) : "unknown";

      if (err === "not-allowed" || err === "service-not-allowed" || err === "permission-denied") {
        sessionActive = false;
        btnMic.textContent = "🎙️ Start mic";
        setStatus("Mic blocked. Allow microphone permission for this site.", "warn");
        return;
      }

      if (err === "no-speech") {
        if (__micRetry < __MIC_RETRY_MAX && sessionActive) {
          __micRetry++;
          setStatus(`Mic: no speech — try again (${__micRetry}/${__MIC_RETRY_MAX}).`, "warn");
          try { recognizer.abort(); } catch(_){}
          await new Promise(r => setTimeout(r, 350));
          try { recognizer.start(); return; } catch(_){}
        }
      }

      sessionActive = false;
      btnMic.textContent = "🎙️ Start mic";
      setStatus(`Mic error: ${err}`, "warn");
    };

    recognizer.onend = () => {
      if (sessionActive) {
        sessionActive = false;
        btnMic.textContent = "🎙️ Start mic";
      }
    };

    return true;
  }

  async function startMic(){
    if (!ensureRecognizer()) return;

    if (chkAntiEcho.checked && ttsSpeaking) {
      setStatus("Wait—voice is speaking.", "warn");
      return;
    }

    recognizer.lang = selRecLang.value || "en-US";

    const ok = await primeMic();
    if (!ok) {
      setStatus("Mic blocked at OS/browser level. Check permissions.", "warn");
      return;
    }

    __micRetry = 0;
    sessionActive = true;
    btnMic.textContent = "🛑 Stop mic";
    setStatus("Listening… speak now.", "muted");

    try {
      recognizer.start();
    } catch (err) {
      sessionActive = false;
      btnMic.textContent = "🎙️ Start mic";
      setStatus("Mic start failed. Try again.", "warn");
    }
  }

  function stopMic(){
    sessionActive = false;
    btnMic.textContent = "🎙️ Start mic";
    try { recognizer?.stop(); } catch(e) {}
    setStatus("Stopped.", "muted");
  }

  // -------------------------
  // Glossary (mini)
  // -------------------------
  function showGlossary(){
    const words = tokenize(currentTarget);
    const uniq = [...new Set(words)].slice(0, 18);
    const lines = uniq.map(w => `${w} = ${ES[w] || "—"}`);
    glossary.innerHTML = `<b>ES glossary:</b><br>` + lines.join("<br>");
    glossary.hidden = false;
  }

  // -------------------------
  // Check (feedback)
  // -------------------------
  function diffWords(expected, got){
    const e = tokenize(expected);
    const g = tokenize(got);
    const bad = new Set();
    const n = Math.max(e.length, g.length);
    for (let i=0;i<n;i++) {
      if ((e[i]||"") !== (g[i]||"")) {
        if (e[i]) bad.add(e[i]);
      }
    }
    return { bad:[...bad] };
  }

  function renderFeedback(expected, heard){
    const { bad } = diffWords(expected, heard);

    if (!heard.trim()) {
      feedback.innerHTML = "—";
      return;
    }

    if (bad.length === 0) {
      feedback.innerHTML = `<span style="color:var(--ok); font-weight:900;">Perfect!</span> ✅`;
      return;
    }

    const html = bad.map(w => `<span style="color:var(--warn); font-weight:900;">${w}</span>`).join(", ");
    feedback.innerHTML = `Practice: ${html}`;
  }

  // -------------------------
  // Unit / Levels
  // -------------------------
  let levels = [];

  function newUnit(){
    unitCompleted = false;
    modal.hidden = true;

    level = 1;
    score = 0;
    streak = 0;

    heardText.value = "";
    feedback.innerHTML = "—";
    glossary.hidden = true;

    const mode = selMode.value;
    const qType = selQType.value;
    const tense = selTense.value;

    const base = buildBase(mode, qType, tense);
    levels = buildLevels(base, mode);

    currentTarget = levels[0];
    renderTarget();
    renderStats();
    setStatus("New unit ready.", "ok");
  }

  function nextLevel(){
    level = Math.min(MAX_LEVEL, level + 1);

    if (level === MAX_LEVEL && score >= MAX_LEVEL && !unitCompleted) {
      unitCompleted = true;
      tryUnlockAtUnitEnd();
    }

    currentTarget = levels[level-1];
    renderTarget();
    renderStats();
  }

  // -------------------------
  // Events
  // -------------------------
  btnNew.addEventListener("click", newUnit);

  btnSpeak.addEventListener("click", () => speak(currentTarget));

  btnMic.addEventListener("click", () => {
    if (sessionActive) stopMic();
    else startMic();
  });

  btnTranslate.addEventListener("click", showGlossary);

  btnShow.addEventListener("click", () => {
    heardText.value = currentTarget;
    setStatus("Answer shown.", "muted");
  });

  btnCheck.addEventListener("click", () => {
    const heard = heardText.value || "";
    renderFeedback(currentTarget, heard);

    const { bad } = diffWords(currentTarget, heard);

    if (heard.trim() && bad.length === 0) {
      streak++;
      score += 1;
      setStatus("Nice! Next level.", "ok");
      nextLevel();
    } else {
      streak = 0;
      setStatus("Not yet—fix the red words and try again.", "warn");
    }
    renderStats();
  });

  btnSkip.addEventListener("click", () => {
    streak = 0;
    setStatus("Skipped.", "muted");
    nextLevel();
  });

  btnModalOk.addEventListener("click", () => {
    closeModal();
    setStatus("Unit complete! Press New unit.", "ok");
  });

  selVoice.addEventListener("change", selectVoice);
  selRecLang.addEventListener("change", () => {
    if (recognizer) recognizer.lang = selRecLang.value;
  });

  // -------------------------
  // Init
  // -------------------------
  renderMedals();

  if (window.speechSynthesis) {
    speechSynthesis.onvoiceschanged = loadVoices;
    loadVoices();
  }

  newUnit();
})();

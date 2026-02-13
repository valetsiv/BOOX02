/* Tense Builder — stable web version (offline)
   - No auto-mic requests
   - Accurate ES shown (because we generate bilingual chunks)
   - Unlock character at 100 score (per unit)
*/

(function(){
  'use strict';

  // ---------------------------
  // DOM helpers
  // ---------------------------
  const $ = (id) => document.getElementById(id);
  const ui = {
    unit: $('uiUnit'),
    score: $('uiScore'),
    streak: $('uiStreak'),
    rescued: $('uiRescued'),

    targetText: $('targetText'),
    targetEs: $('targetEs'),
    heardText: $('heardText'),
    wordFeedback: $('wordFeedback'),
    status: $('status'),

    btnSpeak: $('btnSpeak'),
    btnMic: $('btnMic'),
    btnTranslate: $('btnTranslate'),
    btnShow: $('btnShow'),
    btnCheck: $('btnCheck'),
    btnSkip: $('btnSkip'),
    btnNewUnit: $('btnNewUnit'),

    modeSel: $('modeSel'),
    qTypeSel: $('qTypeSel'),
    whSel: $('whSel'),
    tenseSel: $('tenseSel'),

    ttsVoice: $('ttsVoice'),
    sttLang: $('sttLang'),
    antiEcho: $('antiEcho'),

    medalGrid: $('medalGrid'),

    modal: $('modal'),
    modalTitle: $('modalTitle'),
    modalImg: $('modalImg'),
    modalMsg: $('modalMsg'),
    modalOk: $('modalOk'),
    questionFields: $('questionFields'),
  };

  // ---------------------------
  // Storage keys
  // ---------------------------
  const LS = {
    UNIT: 'tb_unit',
    SCORE: 'tb_score',
    STREAK: 'tb_streak',
    UNLOCKED: 'tb_unlocked', // array of ids
    LAST_SETTINGS: 'tb_settings'
  };

  function loadJSON(key, fallback){
    try{
      const v = localStorage.getItem(key);
      if (!v) return fallback;
      return JSON.parse(v);
    }catch(_){ return fallback; }
  }
  function saveJSON(key, value){
    try{ localStorage.setItem(key, JSON.stringify(value)); }catch(_){}
  }

  // ---------------------------
  // Characters (15)
  // ---------------------------
  const characters = [
    { id:'bombardino',  name:'Bombardiro Crocodilo', file:'bombardino.png' },
    { id:'lirili_larila', name:'Lirili Larila', file:'lirili_larila.png' },
    { id:'frigo_camelo', name:'Frigo Camelo', file:'frigo_camelo.png' },
    { id:'balerina', name:'Ballerina Capuchina', file:'balerina.png' },
    { id:'tung_tung', name:'Tung Tung Tung Sahur', file:'tung_tung.png' },

    { id:'tralalero', name:'Tralalero', file:'tralalero.png' },
    { id:'patapim', name:'Patapim', file:'patapim.png' },
    { id:'gangster', name:'Gangster', file:'gangster.png' },
    { id:'trulimero', name:'Trulimero', file:'trulimero.png' },
    { id:'havana', name:'Havana', file:'havana.png' },
    { id:'burbaloni', name:'Burbaloni', file:'burbaloni.png' },
    { id:'bulbito', name:'Bulbito', file:'bulbito.png' },
    { id:'zibra', name:'Zibra', file:'zibra.png' },
    { id:'bananita', name:'Bananita', file:'bananita.png' },
    { id:'shimpanzinni', name:'Shimpanzinni', file:'shimpanzinni.png' },
  ];

  function assetUrl(rel){
    // rel like "assets/medals/file.png" OR "medals/file.png"
    const clean = rel.startsWith('assets/') ? rel : ('assets/' + rel);
    return new URL(clean, document.baseURI).href;
  }

  // ---------------------------
  // Vocabulary (bilingual)
  // We generate bilingual chunks -> translation stays coherent.
  // ---------------------------
  const subjects = [
    { en:'I', es:'Yo', p:'1s' },
    { en:'You', es:'Tú', p:'2s' },
    { en:'We', es:'Nosotros', p:'1p' },
    { en:'They', es:'Ellos', p:'3p' },
    { en:'He', es:'Él', p:'3s' },
    { en:'She', es:'Ella', p:'3s' },
    { en:'It', es:'Eso', p:'3s' },
  ];

  // Verb: base, past, pp, ing, es (infinitive meaning)
  const verbs = [
    { base:'work', past:'worked', pp:'worked', ing:'working', es:'trabajar' },
    { base:'study', past:'studied', pp:'studied', ing:'studying', es:'estudiar' },
    { base:'learn', past:'learned', pp:'learned', ing:'learning', es:'aprender' },
    { base:'join', past:'joined', pp:'joined', ing:'joining', es:'unirse' },
    { base:'plan', past:'planned', pp:'planned', ing:'planning', es:'planear' },
    { base:'build', past:'built', pp:'built', ing:'building', es:'construir' },
    { base:'create', past:'created', pp:'created', ing:'creating', es:'crear' },
    { base:'make', past:'made', pp:'made', ing:'making', es:'hacer' },
    { base:'fix', past:'fixed', pp:'fixed', ing:'fixing', es:'arreglar' },
    { base:'help', past:'helped', pp:'helped', ing:'helping', es:'ayudar' },
    { base:'watch', past:'watched', pp:'watched', ing:'watching', es:'ver' },
    { base:'listen', past:'listened', pp:'listened', ing:'listening', es:'escuchar' },
    { base:'talk', past:'talked', pp:'talked', ing:'talking', es:'hablar' },
    { base:'finish', past:'finished', pp:'finished', ing:'finishing', es:'terminar' },
    { base:'improve', past:'improved', pp:'improved', ing:'improving', es:'mejorar' },
    { base:'use', past:'used', pp:'used', ing:'using', es:'usar' },
    { base:'need', past:'needed', pp:'needed', ing:'needing', es:'necesitar' },
    { base:'want', past:'wanted', pp:'wanted', ing:'wanting', es:'querer' },
    { base:'like', past:'liked', pp:'liked', ing:'liking', es:'gustar' },
    { base:'love', past:'loved', pp:'loved', ing:'loving', es:'amar' },
    { base:'feel', past:'felt', pp:'felt', ing:'feeling', es:'sentir' },
    { base:'keep', past:'kept', pp:'kept', ing:'keeping', es:'seguir' },
    { base:'go', past:'went', pp:'gone', ing:'going', es:'ir' },
    { base:'come', past:'came', pp:'come', ing:'coming', es:'venir' },
    { base:'sleep', past:'slept', pp:'slept', ing:'sleeping', es:'dormir' },
    { base:'rest', past:'rested', pp:'rested', ing:'resting', es:'descansar' },
    { base:'get', past:'got', pp:'gotten', ing:'getting', es:'obtener' },
    { base:'start', past:'started', pp:'started', ing:'starting', es:'empezar' },
    { base:'stop', past:'stopped', pp:'stopped', ing:'stopping', es:'parar' },
  ];

  const objects = [
    { en:'a new lesson', es:'una lección nueva' },
    { en:'my English', es:'mi inglés' },
    { en:'a short story', es:'un cuento corto' },
    { en:'a new unit', es:'una unidad nueva' },
    { en:'a simple plan', es:'un plan simple' },
    { en:'the schedule', es:'el cronograma' },
    { en:'the pipeline', es:'el pipeline' },
    { en:'a video', es:'un video' },
    { en:'a game', es:'un juego' },
    { en:'this project', es:'este proyecto' },
  ];

  const places = [
    { en:'at home', es:'en casa' },
    { en:'in Bogotá', es:'en Bogotá' },
    { en:'at work', es:'en el trabajo' },
    { en:'in the morning', es:'en la mañana' },
    { en:'after class', es:'después de clase' },
    { en:'with my team', es:'con mi equipo' },
  ];

  const connectors = [
    { en:'because', es:'porque' },
    { en:'although', es:'aunque' },
    { en:'so', es:'así que' },
    { en:'therefore', es:'por lo tanto' },
    { en:'however', es:'sin embargo' },
    { en:'already', es:'ya' },
    { en:'just', es:'solo' },
    { en:'the same', es:'lo mismo' },
    { en:'both', es:'ambos' },
    { en:'then', es:'luego' },
    { en:'after that', es:'después de eso' },
    { en:'suddenly', es:'de repente' },
    { en:'in the end', es:'al final' },
    { en:'from my perspective', es:'desde mi perspectiva' },
    { en:'the issue is', es:'el problema es' },
    { en:'on the one hand', es:'por un lado' },
    { en:'on the other hand', es:'por el otro lado' },
    { en:'I agree', es:'estoy de acuerdo' },
    { en:'I disagree', es:'no estoy de acuerdo' },
  ];

  const modals = [
    { en:'can', es:'puede' },
    { en:'should', es:'debería' },
    { en:'must', es:'debe' },
    { en:'might', es:'podría' },
  ];

  // ---------------------------
  // Grammar helpers
  // ---------------------------
  function pick(arr){ return arr[Math.floor(Math.random()*arr.length)]; }
  function cap(s){ return s.charAt(0).toUpperCase() + s.slice(1); }

  function present3s(base){
    // ultra-simple 3rd person singular rule
    if (base === 'have') return 'has';
    if (base.endsWith('y') && !/[aeiou]y$/.test(base)) return base.slice(0,-1)+'ies';
    if (/(s|sh|ch|x|z|o)$/.test(base)) return base + 'es';
    return base + 's';
  }

  function bePresent(p){
    if (p === '1s') return 'am';
    if (p === '3s') return 'is';
    return 'are';
  }
  function bePast(p){
    if (p === '1s' || p === '3s') return 'was';
    return 'were';
  }

  function normalize(s){
    return (s||'')
      .toLowerCase()
      .replace(/’/g,"'")
      .replace(/[^a-z0-9\s']/g,' ')
      .replace(/\b(gonna)\b/g,'going to')
      .replace(/\b(wanna)\b/g,'want to')
      .replace(/\s+/g,' ')
      .trim();
  }

  function levenshtein(a,b){
    a = a || ''; b = b || '';
    const m = a.length, n = b.length;
    if (m === 0) return n;
    if (n === 0) return m;
    const dp = new Array(n+1);
    for (let j=0;j<=n;j++) dp[j]=j;
    for (let i=1;i<=m;i++){
      let prev = dp[0];
      dp[0]=i;
      for (let j=1;j<=n;j++){
        const tmp = dp[j];
        const cost = a[i-1]===b[j-1] ? 0 : 1;
        dp[j] = Math.min(
          dp[j] + 1,
          dp[j-1] + 1,
          prev + cost
        );
        prev = tmp;
      }
    }
    return dp[n];
  }

  function similarity(a,b){
    const A = normalize(a), B = normalize(b);
    const maxLen = Math.max(A.length, B.length) || 1;
    const dist = levenshtein(A,B);
    return 1 - (dist / maxLen);
  }

  function renderWordDiff(target, heard){
    const t = normalize(target).split(' ').filter(Boolean);
    const h = normalize(heard).split(' ').filter(Boolean);

    // compare by position (simple + readable)
    const spans = t.map((w,i)=>{
      const ok = (h[i] === w);
      return `<span class="w ${ok?'ok':'bad'}">${escapeHtml(w)}</span>`;
    });
    ui.targetText.innerHTML = spans.join(' ');
  }

  function escapeHtml(s){
    return (s||'')
      .replace(/&/g,'&amp;')
      .replace(/</g,'&lt;')
      .replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;')
      .replace(/'/g,'&#039;');
  }

  // ---------------------------
  // Sentence generator (bilingual)
  // Returns: { en, es }
  // ---------------------------
  function genStatement(tenseKey){
    const S = pick(subjects);
    const V = pick(verbs);
    const O = pick(objects);
    const P = pick(places);

    // optional connector chunk
    const useConn = Math.random() < 0.45;
    const C = useConn ? pick(connectors) : null;
    const V2 = useConn ? pick(verbs) : null;
    const O2 = useConn ? pick(objects) : null;

    const partsEn = [];
    const partsEs = [];

    function push(en, es){
      partsEn.push(en);
      partsEs.push(es);
    }

    if (tenseKey === 'present_simple'){
      const verb = (S.p === '3s') ? present3s(V.base) : V.base;
      push(S.en, S.es);
      push(verb, V.es);
      push(O.en, O.es);
      if (Math.random()<0.65) push(P.en, P.es);
    }
    else if (tenseKey === 'present_cont'){
      push(S.en, S.es);
      push(bePresent(S.p), 'está');
      push(V.ing, V.es);
      push(O.en, O.es);
      if (Math.random()<0.65) push(P.en, P.es);
    }
    else if (tenseKey === 'past_simple'){
      push(S.en, S.es);
      push(V.past, V.es);
      push(O.en, O.es);
      if (Math.random()<0.65) push(P.en, P.es);
    }
    else if (tenseKey === 'past_cont'){
      push(S.en, S.es);
      push(bePast(S.p), 'estaba');
      push(V.ing, V.es);
      push(O.en, O.es);
      if (Math.random()<0.65) push(P.en, P.es);
    }
    else if (tenseKey === 'present_perf'){
      const aux = (S.p === '3s') ? 'has' : 'have';
      push(S.en, S.es);
      push(aux, 'ha');
      push(V.pp, V.es);
      push(O.en, O.es);
      if (Math.random()<0.55) push(P.en, P.es);
      if (Math.random()<0.35) push('already', 'ya');
      if (Math.random()<0.25) push('just', 'acaba de');
    }
    else if (tenseKey === 'future_will'){
      push(S.en, S.es);
      push('will', 'va a');
      push(V.base, V.es);
      push(O.en, O.es);
      if (Math.random()<0.55) push(P.en, P.es);
    }
    else if (tenseKey === 'modals'){
      const M = pick(modals);
      push(S.en, S.es);
      push(M.en, M.es);
      push(V.base, V.es);
      push(O.en, O.es);
      if (Math.random()<0.55) push(P.en, P.es);
    }
    else if (tenseKey === 'cond0' || tenseKey === 'cond1' || tenseKey === 'cond2'){
      // If ... , ...
      // We'll keep subjects simple
      const S2 = pick(subjects);
      const Vif = pick(verbs);
      const Vmain = pick(verbs);
      const Oif = pick(objects);
      const Omain = pick(objects);

      if (tenseKey === 'cond0'){
        // If + present, present
        push('If', 'Si');
        push(S.en.toLowerCase(), S.es.toLowerCase());
        push((S.p === '3s') ? present3s(Vif.base) : Vif.base, Vif.es);
        push(Oif.en, Oif.es);
        push(',', ',');
        push(S2.en, S2.es);
        push((S2.p === '3s') ? present3s(Vmain.base) : Vmain.base, Vmain.es);
        push(Omain.en, Omain.es);
      } else if (tenseKey === 'cond1'){
        // If + present, will + base
        push('If', 'Si');
        push(S.en.toLowerCase(), S.es.toLowerCase());
        push((S.p === '3s') ? present3s(Vif.base) : Vif.base, Vif.es);
        push(Oif.en, Oif.es);
        push(',', ',');
        push(S2.en, S2.es);
        push('will', 'va a');
        push(Vmain.base, Vmain.es);
        push(Omain.en, Omain.es);
      } else {
        // If + past, would + base
        push('If', 'Si');
        push(S.en.toLowerCase(), S.es.toLowerCase());
        push(Vif.past, Vif.es);
        push(Oif.en, Oif.es);
        push(',', ',');
        push(S2.en, S2.es);
        push('would', 'podría');
        push(Vmain.base, Vmain.es);
        push(Omain.en, Omain.es);
      }
    }

    if (useConn && C && V2 && O2 && !tenseKey.startsWith('cond')){
      // add: , connector + clause
      push(',', ',');
      push(C.en, C.es);
      // simple clause in present
      const s3 = pick(subjects);
      const verb3 = (s3.p === '3s') ? present3s(V2.base) : V2.base;
      push(s3.en.toLowerCase(), s3.es.toLowerCase());
      push(verb3, V2.es);
      push(O2.en, O2.es);
    }

    // tidy spaces
    const en = tidyEn(partsEn.join(' '));
    const es = tidyEs(partsEs.join(' '));
    return { en, es };
  }

  function genQuestion(tenseKey, qType, whKey){
    // keep questions stable + common
    const S = pick(subjects);
    const V = pick(verbs);
    const O = pick(objects);
    const P = Math.random()<0.6 ? pick(places) : null;

    function enQ(str){ return cap(tidyEn(str)) + '?'; }
    function esQ(str){ return '¿' + cap(tidyEs(str)) + '?'; }

    if (tenseKey === 'present_simple'){
      const aux = (S.p === '3s') ? 'does' : 'do';
      if (qType === 'wh'){
        const wh = whKey || 'what';
        // What do you ... ?
        if (wh === 'where'){
          return {
            en: enQ(`Where ${aux} ${S.en.toLowerCase()} ${V.base} ${O.en}${P?` ${P.en}`:''}`),
            es: esQ(`Dónde ${auxEs(aux)} ${S.es.toLowerCase()} ${V.es} ${O.es}${P?` ${P.es}`:''}`)
          };
        }
        if (wh === 'when'){
          return {
            en: enQ(`When ${aux} ${S.en.toLowerCase()} ${V.base} ${O.en}`),
            es: esQ(`Cuándo ${auxEs(aux)} ${S.es.toLowerCase()} ${V.es} ${O.es}`)
          };
        }
        if (wh === 'why'){
          return {
            en: enQ(`Why ${aux} ${S.en.toLowerCase()} ${V.base} ${O.en}`),
            es: esQ(`Por qué ${auxEs(aux)} ${S.es.toLowerCase()} ${V.es} ${O.es}`)
          };
        }
        if (wh === 'how'){
          return {
            en: enQ(`How ${aux} ${S.en.toLowerCase()} ${V.base} ${O.en}`),
            es: esQ(`Cómo ${auxEs(aux)} ${S.es.toLowerCase()} ${V.es} ${O.es}`)
          };
        }
        // what default
        return {
          en: enQ(`What ${aux} ${S.en.toLowerCase()} ${V.base}`),
          es: esQ(`Qué ${auxEs(aux)} ${S.es.toLowerCase()} ${V.es}`)
        };
      }
      // yes/no
      return {
        en: enQ(`${aux} ${S.en.toLowerCase()} ${V.base} ${O.en}${P?` ${P.en}`:''}`),
        es: esQ(`${auxEs(aux)} ${S.es.toLowerCase()} ${V.es} ${O.es}${P?` ${P.es}`:''}`)
      };
    }

    if (tenseKey === 'past_simple'){
      const aux = 'did';
      if (qType === 'wh'){
        const wh = whKey || 'what';
        if (wh === 'where'){
          return { en: enQ(`Where ${aux} ${S.en.toLowerCase()} ${V.base} ${O.en}`),
                   es: esQ(`Dónde ${auxEs(aux)} ${S.es.toLowerCase()} ${V.es} ${O.es}`) };
        }
        if (wh === 'when'){
          return { en: enQ(`When ${aux} ${S.en.toLowerCase()} ${V.base} ${O.en}`),
                   es: esQ(`Cuándo ${auxEs(aux)} ${S.es.toLowerCase()} ${V.es} ${O.es}`) };
        }
        if (wh === 'why'){
          return { en: enQ(`Why ${aux} ${S.en.toLowerCase()} ${V.base} ${O.en}`),
                   es: esQ(`Por qué ${auxEs(aux)} ${S.es.toLowerCase()} ${V.es} ${O.es}`) };
        }
        if (wh === 'how'){
          return { en: enQ(`How ${aux} ${S.en.toLowerCase()} ${V.base} ${O.en}`),
                   es: esQ(`Cómo ${auxEs(aux)} ${S.es.toLowerCase()} ${V.es} ${O.es}`) };
        }
        return { en: enQ(`What ${aux} ${S.en.toLowerCase()} ${V.base}`),
                 es: esQ(`Qué ${auxEs(aux)} ${S.es.toLowerCase()} ${V.es}`) };
      }
      return { en: enQ(`${aux} ${S.en.toLowerCase()} ${V.base} ${O.en}${P?` ${P.en}`:''}`),
               es: esQ(`${auxEs(aux)} ${S.es.toLowerCase()} ${V.es} ${O.es}${P?` ${P.es}`:''}`) };
    }

    if (tenseKey === 'present_cont'){
      const aux = bePresent(S.p);
      if (qType === 'wh'){
        const wh = whKey || 'what';
        return { en: enQ(`${cap(wh)} ${aux} ${S.en.toLowerCase()} ${V.ing} ${O.en}`),
                 es: esQ(`${whEs(wh)} ${auxEsBe(aux)} ${S.es.toLowerCase()} ${V.es} ${O.es}`) };
      }
      return { en: enQ(`${aux} ${S.en.toLowerCase()} ${V.ing} ${O.en}${P?` ${P.en}`:''}`),
               es: esQ(`${auxEsBe(aux)} ${S.es.toLowerCase()} ${V.es} ${O.es}${P?` ${P.es}`:''}`) };
    }

    if (tenseKey === 'present_perf'){
      const aux = (S.p === '3s') ? 'has' : 'have';
      if (qType === 'wh'){
        const wh = whKey || 'what';
        return { en: enQ(`${cap(wh)} ${aux} ${S.en.toLowerCase()} ${V.pp}`),
                 es: esQ(`${whEs(wh)} ${auxEs(aux)} ${S.es.toLowerCase()} ${V.es}`) };
      }
      return { en: enQ(`${aux} ${S.en.toLowerCase()} ${V.pp} ${O.en}${P?` ${P.en}`:''}`),
               es: esQ(`${auxEs(aux)} ${S.es.toLowerCase()} ${V.es} ${O.es}${P?` ${P.es}`:''}`) };
    }

    if (tenseKey === 'future_will'){
      const aux = 'will';
      if (qType === 'wh'){
        const wh = whKey || 'what';
        return { en: enQ(`${cap(wh)} ${aux} ${S.en.toLowerCase()} ${V.base}`),
                 es: esQ(`${whEs(wh)} ${auxEs(aux)} ${S.es.toLowerCase()} ${V.es}`) };
      }
      return { en: enQ(`${aux} ${S.en.toLowerCase()} ${V.base} ${O.en}${P?` ${P.en}`:''}`),
               es: esQ(`${auxEs(aux)} ${S.es.toLowerCase()} ${V.es} ${O.es}${P?` ${P.es}`:''}`) };
    }

    // fallback
    return genQuestion('present_simple', qType, whKey);
  }

  function auxEs(aux){
    // helper: Spanish question aux is not literal, we keep "¿... ?" with verb meaning
    // We'll just return empty string-ish in Spanish: BUT to keep sentence readable,
    // we use "¿" + verb. We'll map do/does/did/have/has/will to "" for now.
    return '';
  }
  function auxEsBe(aux){ return ''; }
  function whEs(wh){
    const m = {what:'Qué', where:'Dónde', when:'Cuándo', why:'Por qué', how:'Cómo'};
    return m[(wh||'what').toLowerCase()] || 'Qué';
  }

  function tidyEn(s){
    return s
      .replace(/\s+,/g, ',')
      .replace(/\s+\?/g, '?')
      .replace(/\s+\./g, '.')
      .replace(/\s+/g, ' ')
      .replace(/ ,/g, ',')
      .trim()
      .replace(/^if\b/i,'If')
      .replace(/\bi\b/g,'I');
  }
  function tidyEs(s){
    return s
      .replace(/\s+,/g, ',')
      .replace(/\s+/g, ' ')
      .replace(/ ,/g, ',')
      .trim()
      .replace(/^si\b/i,'Si');
  }

  // ---------------------------
  // State
  // ---------------------------
  const state = {
    unit: Number(localStorage.getItem(LS.UNIT) || 1),
    score: Number(localStorage.getItem(LS.SCORE) || 0), // 0..100 within unit
    streak: Number(localStorage.getItem(LS.STREAK) || 0),
    unlocked: loadJSON(LS.UNLOCKED, []),

    current: { en:'—', es:'—' },

    micOn: false,
    recognition: null,
    speaking: false,

    settings: loadJSON(LS.LAST_SETTINGS, {
      mode: 'statements',
      qType: 'yesno',
      wh: 'what',
      tense: 'present_simple',
      sttLang: 'en-US',
      antiEcho: true,
      ttsVoice: ''
    }),
  };

  // ---------------------------
  // UI init
  // ---------------------------
  function applySettingsToUI(){
    ui.modeSel.value = state.settings.mode;
    ui.qTypeSel.value = state.settings.qType;
    ui.whSel.value = state.settings.wh;
    ui.tenseSel.value = state.settings.tense;
    ui.sttLang.value = state.settings.sttLang;
    ui.antiEcho.checked = !!state.settings.antiEcho;

    ui.questionFields.classList.toggle('hidden', state.settings.mode !== 'questions');
    ui.whSel.parentElement.classList.toggle('hidden', state.settings.qType !== 'wh');
  }

  function syncUI(){
    ui.unit.textContent = String(state.unit);
    ui.score.textContent = String(state.score);
    ui.streak.textContent = String(state.streak);
    ui.rescued.textContent = `${state.unlocked.length}/${characters.length}`;
    renderMedals();
  }

  function renderMedals(){
    const unlockedSet = new Set(state.unlocked);
    ui.medalGrid.innerHTML = '';
    characters.forEach((c)=>{
      const tile = document.createElement('div');
      tile.className = 'medal' + (unlockedSet.has(c.id) ? '' : ' locked');

      const img = document.createElement('img');
      img.alt = c.name;
      img.src = assetUrl('medals/' + c.file);
      img.loading = 'lazy';

      const lock = document.createElement('div');
      lock.className = 'lock';
      lock.textContent = unlockedSet.has(c.id) ? '✓' : '🔒';

      tile.appendChild(img);
      tile.appendChild(lock);
      ui.medalGrid.appendChild(tile);
    });
  }

  // ---------------------------
  // Exercise flow
  // ---------------------------
  function newExercise(){
    ui.heardText.value = '';
    ui.wordFeedback.textContent = '—';
    ui.status.textContent = 'Ready.';
    ui.targetEs.classList.add('hidden');
    ui.btnShow.textContent = '👁️ Show answer';

    const tense = state.settings.tense;
    const mode = state.settings.mode;

    let ex;
    if (mode === 'questions'){
      ex = genQuestion(tense, state.settings.qType, state.settings.wh);
    } else {
      ex = genStatement(tense);
      // Statements end with period
      if (!/[\?\.!]$/.test(ex.en)) ex.en += '.';
      if (!/[\?\.!]$/.test(ex.es)) ex.es += '.';
      ex.en = cap(ex.en);
      ex.es = cap(ex.es);
    }

    state.current = ex;
    ui.targetText.textContent = ex.en;
    ui.targetText.innerHTML = ex.en.split(' ').map(w=>`<span class="w ok">${escapeHtml(w)}</span>`).join(' ');
    ui.targetEs.textContent = 'ES: ' + ex.es;
  }

  // ---------------------------
  // Check answer
  // ---------------------------
  function doCheck(){
    const target = state.current.en;
    const heard = ui.heardText.value || '';
    if (!normalize(heard)){
      ui.status.textContent = 'Type or speak first.';
      return;
    }

    const tol = 0.82; // stable default
    const sim = similarity(target, heard);

    renderWordDiff(target, heard);

    if (sim >= tol){
      state.streak += 1;
      state.score += 1;
      ui.status.textContent = `Correct! (${sim.toFixed(2)})`;

      // Unlock at 100
      if (state.score >= 100){
        unlockCharacter();
        // reset unit score
        state.unit += 1;
        state.score = 0;
        state.streak = 0;
      }

      persistState();
      syncUI();
      newExercise();
    } else {
      state.streak = 0;
      ui.status.textContent = `Try again. (${sim.toFixed(2)})`;
      persistState();
      syncUI();

      // Extra feedback
      ui.wordFeedback.innerHTML = `Focus on the <b style="color:var(--bad)">red</b> words.`;
    }
  }

  function unlockCharacter(){
    const unlockedSet = new Set(state.unlocked);
    const next = characters.find(c => !unlockedSet.has(c.id));
    if (!next){
      showModal('Legend!', assetUrl('medals/bombardino.png'), 'You already rescued everyone. You’re unstoppable!');
      return;
    }

    state.unlocked.push(next.id);

    persistState();
    syncUI();

    const title = 'You rescued a character!';
    const msg = `Amazing! You finished Unit ${state.unit} and rescued ${next.name}. Keep going!`;
    showModal(title, assetUrl('medals/' + next.file), msg);
    speakText(msg);
  }

  // ---------------------------
  // Modal
  // ---------------------------
  function showModal(title, imgUrl, msg){
    ui.modalTitle.textContent = title;
    ui.modalMsg.textContent = msg;
    ui.modalImg.src = imgUrl;
    ui.modal.classList.remove('hidden');
  }
  function hideModal(){
    ui.modal.classList.add('hidden');
  }

  // ---------------------------
  // TTS
  // ---------------------------
  let voiceList = [];
  function loadVoices(){
    voiceList = window.speechSynthesis ? speechSynthesis.getVoices() : [];
    ui.ttsVoice.innerHTML = '';
    if (!voiceList.length){
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = 'No voices available';
      ui.ttsVoice.appendChild(opt);
      return;
    }
    voiceList.forEach((v, idx)=>{
      const opt = document.createElement('option');
      opt.value = String(idx);
      opt.textContent = `${v.name} — ${v.lang}`;
      ui.ttsVoice.appendChild(opt);
    });

    // restore selection
    if (state.settings.ttsVoice !== '' && ui.ttsVoice.options[state.settings.ttsVoice]){
      ui.ttsVoice.value = state.settings.ttsVoice;
    } else {
      // best-match english
      const best = voiceList.findIndex(v => /en-/i.test(v.lang));
      ui.ttsVoice.value = best >= 0 ? String(best) : '0';
      state.settings.ttsVoice = ui.ttsVoice.value;
      saveJSON(LS.LAST_SETTINGS, state.settings);
    }
  }

  function speakText(text){
    if (!window.speechSynthesis) return;
    try{
      speechSynthesis.cancel();
    }catch(_){}

    const u = new SpeechSynthesisUtterance(text);
    const idx = Number(ui.ttsVoice.value || 0);
    const v = voiceList[idx];
    if (v) u.voice = v;
    u.rate = 0.95;
    u.pitch = 1.0;

    state.speaking = true;

    // anti-echo: stop mic while speaking
    if (ui.antiEcho.checked && state.micOn){
      stopMic();
      // we do NOT auto-restart, to avoid “double mic” issues
      ui.status.textContent = 'Paused mic (anti-echo). Tap Start mic again after TTS.';
    }

    u.onend = ()=>{ state.speaking = false; };
    u.onerror = ()=>{ state.speaking = false; };

    speechSynthesis.speak(u);
  }

  // ---------------------------
  // Speech Recognition (STT)
  // ---------------------------
  function hasSTT(){
    return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  }

  function startMic(){
    if (!hasSTT()){
      ui.status.textContent = 'Speech recognition not supported here. Type your answer instead.';
      return;
    }
    if (state.micOn) return;

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new SR();
    rec.lang = ui.sttLang.value || 'en-US';
    rec.continuous = false;
    rec.interimResults = false;
    rec.maxAlternatives = 1;

    rec.onresult = (ev)=>{
      const t = ev.results && ev.results[0] && ev.results[0][0] ? ev.results[0][0].transcript : '';
      ui.heardText.value = t;
      ui.status.textContent = 'Heard. Press Check.';
    };
    rec.onerror = (e)=>{
      ui.status.textContent = 'Mic error: ' + (e && e.error ? e.error : 'unknown');
      stopMic(true);
    };
    rec.onend = ()=>{
      // mic ends after one phrase
      stopMic(true);
    };

    state.recognition = rec;
    state.micOn = true;
    ui.btnMic.textContent = '🛑 Stop mic';

    ui.status.textContent = 'Listening… speak now.';
    try{ rec.start(); }catch(_){
      ui.status.textContent = 'Could not start mic.';
      stopMic(true);
    }
  }

  function stopMic(silent){
    if (!state.micOn) return;
    state.micOn = false;
    ui.btnMic.textContent = '🎙️ Start mic';
    try{ state.recognition && state.recognition.stop(); }catch(_){}
    state.recognition = null;
    if (!silent) ui.status.textContent = 'Mic stopped.';
  }

  // ---------------------------
  // Persistence
  // ---------------------------
  function persistState(){
    localStorage.setItem(LS.UNIT, String(state.unit));
    localStorage.setItem(LS.SCORE, String(state.score));
    localStorage.setItem(LS.STREAK, String(state.streak));
    saveJSON(LS.UNLOCKED, state.unlocked);
    saveJSON(LS.LAST_SETTINGS, state.settings);
  }

  // ---------------------------
  // Events
  // ---------------------------
  ui.btnSpeak.addEventListener('click', ()=> speakText(state.current.en));
  ui.btnMic.addEventListener('click', ()=> state.micOn ? stopMic() : startMic());

  ui.btnTranslate.addEventListener('click', ()=>{
    ui.targetEs.classList.toggle('hidden');
    ui.btnTranslate.textContent = ui.targetEs.classList.contains('hidden') ? '🌐 Translate' : '🌐 Hide';
  });

  ui.btnShow.addEventListener('click', ()=>{
    ui.targetEs.classList.remove('hidden');
    ui.btnShow.textContent = '👁️ Showing';
  });

  ui.btnCheck.addEventListener('click', doCheck);
  ui.btnSkip.addEventListener('click', ()=>{
    ui.status.textContent = 'Skipped.';
    newExercise();
  });

  ui.btnNewUnit.addEventListener('click', ()=>{
    // Hard reset current unit progress (not rescued list)
    state.unit += 1;
    state.score = 0;
    state.streak = 0;
    persistState();
    syncUI();
    newExercise();
    ui.status.textContent = 'New unit started.';
  });

  ui.modalOk.addEventListener('click', hideModal);
  ui.modal.addEventListener('click', (e)=>{
    if (e.target === ui.modal) hideModal();
  });

  ui.modeSel.addEventListener('change', ()=>{
    state.settings.mode = ui.modeSel.value;
    ui.questionFields.classList.toggle('hidden', state.settings.mode !== 'questions');
    persistState();
    newExercise();
  });
  ui.qTypeSel.addEventListener('change', ()=>{
    state.settings.qType = ui.qTypeSel.value;
    ui.whSel.parentElement.classList.toggle('hidden', state.settings.qType !== 'wh');
    persistState();
    newExercise();
  });
  ui.whSel.addEventListener('change', ()=>{
    state.settings.wh = ui.whSel.value;
    persistState();
    newExercise();
  });
  ui.tenseSel.addEventListener('change', ()=>{
    state.settings.tense = ui.tenseSel.value;
    persistState();
    newExercise();
  });
  ui.sttLang.addEventListener('change', ()=>{
    state.settings.sttLang = ui.sttLang.value;
    persistState();
  });
  ui.antiEcho.addEventListener('change', ()=>{
    state.settings.antiEcho = ui.antiEcho.checked;
    persistState();
  });
  ui.ttsVoice.addEventListener('change', ()=>{
    state.settings.ttsVoice = ui.ttsVoice.value;
    persistState();
  });

  // ---------------------------
  // Boot
  // ---------------------------
  applySettingsToUI();
  syncUI();
  newExercise();

  if ('speechSynthesis' in window){
    loadVoices();
    // some browsers load voices async
    speechSynthesis.onvoiceschanged = loadVoices;
  } else {
    ui.ttsVoice.innerHTML = '<option value="">No TTS available</option>';
  }
})(); 

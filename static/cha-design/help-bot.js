/* help-bot.js — floating chat widget, bottom-left corner.
   Self-mounting. Includes its own styles. No dependencies.

   How it answers:
   - Tries keyword intent matching against the local knowledge base first.
   - Falls back to a "I'll have someone follow up" message with phone + contact.
   - To upgrade to a real LLM: replace `localResponder(text)` body with a
     `fetch('/api/help-bot', { method:'POST', body: JSON.stringify({ text }) })`
     call. The UI is already async-friendly.
*/

(function () {
  'use strict';

  // -----------------------------
  // Knowledge base + intent rules
  // -----------------------------
  var KB = {
    // --- Value-led answers (conversion-focused) ---
    why_different: 'Care here is built around how your body actually recovers. Every session is sixty minutes, one-on-one, with hands-on manual therapy that the tissue and nervous system respond to physiologically. Most patients feel meaningful change within the first three to six sessions. <a href="/v2/method">How the care works</a>.',
    will_it_work: 'The ninety-minute evaluation is designed to answer that. We identify what is actually driving your pain, give you an honest read on whether physical therapy can resolve it, and tell you what success looks like. If we are not the right fit, you will hear that too. <a href="/v2/book">Book the evaluation</a>.',
    why_pt_vs_medication: 'Patients who see a physical therapist first are <strong>87 percent less likely</strong> to receive an opioid prescription for low back pain. Across major clinical guidelines, PT is the Grade A first-line treatment. Medication masks the pain signal. PT addresses what is producing it. <a href="/v2/research">Read the research</a>.',
    why_pt_vs_surgery: 'For many of the most common reasons surgery is recommended, including spinal stenosis, meniscal tears, shoulder impingement, and hip arthritis, peer-reviewed research shows PT produces equivalent or better long-term outcomes than surgery with far fewer complications. <a href="/v2/research">See the studies</a>.',
    how_fast: 'Most patients feel meaningful change within three to six sessions when the diagnosis is correct. A typical course is six to twelve sessions over six to ten weeks. The first evaluation produces a clear estimate based on your specific case.',
    benefit_long_term: 'Patients leave their course of care with the pattern resolved, an understanding of how their body works, and a small home program that prevents recurrence. The goal is recovery, not maintenance.',
    why_tried_pt_already: 'Prior PT that did not work usually means the wrong diagnosis or the wrong dose. The evaluation here re-investigates the pattern from scratch. Hands-on manual therapy makes up the majority of every visit, which is often the piece a previous course of care did not include.',
    natural: 'Physical therapy treats pain by addressing what is producing it, the joint that stopped moving, the muscle that has been compensating, the tissue that needs to recover. No drugs. No surgery. Just the body, hands, breath, and the work it actually responds to.',

    // --- Practical answers ---
    hours: 'We are open <strong>Monday through Friday, 9am to 7pm</strong>. Closed on weekends.',
    location: 'We are at <strong>16 W 32nd St, Suite 1007</strong>, in NoMad, New York 10001. A few blocks from Herald Square and Penn Station.',
    phone: 'Reach us at <a href="tel:+12126439326"><strong>(212) 643-9326</strong></a>. You can also text us if that is easier.',
    pricing: 'The initial evaluation is <strong>$300</strong> (90 minutes). Follow-up sessions are <strong>$250</strong> (60 minutes). Full breakdown on the <a href="/v2/pricing">pricing page</a>.',
    insurance: 'We are an out-of-network provider, which means we do not bill insurance directly. We provide a superbill you can submit to your insurance for reimbursement. Many of our patients are reimbursed at 60 to 80 percent depending on their plan.',
    booking: 'You can book online on the <a href="/v2/book">booking page</a>, or call us at <a href="tel:+12126439326">(212) 643-9326</a>.',
    treatments: 'Specialties include <a href="/v2/schroth">Schroth Method</a> for scoliosis, <a href="/v2/pelvic-floor">pelvic floor</a> therapy, <a href="/v2/acupuncture">acupuncture</a>, <a href="/v2/manual-therapy">manual therapy</a>, <a href="/v2/postural-restoration">postural restoration</a>, <a href="/v2/tmj">TMJ care</a>, <a href="/v2/hypermobility">hypermobility</a>, and the full range of <a href="/v2/pain">orthopedic pain treatment</a>.',
    pelvic: 'Pelvic floor therapy is led by Dr. Joy Jang, a board-certified Women&rsquo;s Clinical Specialist with a PhD. Treats incontinence, pelvic pain, postpartum recovery, and painful intercourse. <a href="/v2/pelvic-floor">Learn more</a>.',
    schroth: 'The Schroth Method is a three-dimensional scoliosis treatment using breath, posture, and targeted movement. Dr. Cha is Schroth-certified through the Hunter College program. <a href="/v2/schroth">Learn more</a>.',
    acupuncture: 'Acupuncture is led by Dr. Mansoo Kim, who is both a licensed acupuncturist and a doctor of physical therapy. Classical and Western frameworks, integrated. <a href="/v2/acupuncture">Learn more</a>.',
    pain: 'We treat the full range of orthopedic pain: <a href="/v2/low-back-pain">back pain</a>, <a href="/v2/sciatica">sciatica</a>, <a href="/v2/knee-pain">knee pain</a>, <a href="/v2/hip-pain">hip pain</a>, <a href="/v2/plantar-fasciitis">plantar fasciitis</a>, <a href="/v2/shoulder-pain">shoulder pain</a>, <a href="/v2/elbow-pain">tennis elbow</a>, <a href="/v2/post-surgical">post-surgical recovery</a>. See the <a href="/v2/pain">full list</a>.',
    team: 'Dr. Deukyoung Cha is the founder, with 28 years of orthopedic manual therapy. Dr. Joy Jang leads pelvic floor and women&rsquo;s health. Dr. Mansoo Kim leads acupuncture and integrative care. <a href="/v2/about">Meet the team</a>.',
    parking: 'There is metered street parking on 32nd Street and nearby. The closest paid garages are on 32nd between 5th and 6th Avenues. The clinic is also one block from the 34th Street-Herald Square subway station (B, D, F, M, N, Q, R, W trains).',
    firstvisit: 'Plan for 90 minutes. We take a detailed history, assess movement and any specific complaints, and start treatment. You will leave with a clear plan and usually a small home program. Wear comfortable clothes you can move in.',
    cancel: 'You can cancel or reschedule up to 24 hours before your appointment without a fee. After that, the full session fee applies. Call or text (212) 643-9326 to change a booking.'
  };

  var INTENTS = [
    // Value/conversion intents go first so they win over generic phrasing
    { kws: ['what makes you different', 'what makes your treatment', 'what makes this different', 'unique', 'why choose', 'why come here', 'what sets you apart', 'how is this different'], ans: 'why_different' },
    { kws: ['will this work', 'will it work for me', 'how do i know if', 'is this right for me', 'will i get better', 'does this actually work', 'how effective', 'how successful', 'success rate'], ans: 'will_it_work' },
    { kws: ['instead of medication', 'instead of meds', 'instead of drugs', 'instead of pills', 'instead of opioid', 'vs medication', 'vs drugs', 'vs opioid', 'pain killer', 'painkiller'], ans: 'why_pt_vs_medication' },
    { kws: ['instead of surgery', 'avoid surgery', 'vs surgery', 'without surgery', 'do i need surgery'], ans: 'why_pt_vs_surgery' },
    { kws: ['how fast', 'how long', 'how many sessions', 'how soon', 'when will i', 'how quick', 'time to recover', 'recovery time'], ans: 'how_fast' },
    { kws: ['long term', 'long-term', 'long lasting', 'last forever', 'come back', 'prevent', 'maintenance', 'benefit me', 'how does this benefit'], ans: 'benefit_long_term' },
    { kws: ['already tried', 'did pt before', 'had physical therapy', 'didn\'t work', 'didnt work', 'did not work', 'tried before', 'tried everything'], ans: 'why_tried_pt_already' },
    { kws: ['natural', 'naturally', 'drug free', 'drug-free', 'no drugs', 'no surgery', 'without drugs'], ans: 'natural' },

    // Practical intents
    { kws: ['hour', 'open', 'close', 'weekend', 'saturday', 'sunday'], ans: 'hours' },
    { kws: ['location', 'address', 'where are you', 'where is', 'directions', 'nomad', 'midtown'], ans: 'location' },
    { kws: ['phone', 'call you', 'number', 'text you'], ans: 'phone' },
    { kws: ['price', 'cost', 'how much', 'fee', 'pricing', 'rate'], ans: 'pricing' },
    { kws: ['insurance', 'reimburse', 'aetna', 'blue cross', 'united', 'cigna', 'oxford', 'in-network', 'in network', 'superbill', 'fsa', 'hsa'], ans: 'insurance' },
    { kws: ['book', 'appointment', 'schedul', 'reserv', 'sign up', 'make an appt'], ans: 'booking' },
    { kws: ['treat', 'service', 'offer', 'specialt', 'what do you do'], ans: 'treatments' },
    { kws: ['pelvic', 'kegel', 'incontinen', 'postpartum', 'painful sex', 'leak'], ans: 'pelvic' },
    { kws: ['scoliosis', 'schroth', 'curve', 'spine curve'], ans: 'schroth' },
    { kws: ['acupunctur', 'needle', 'dry needl'], ans: 'acupuncture' },
    { kws: ['back pain', 'sciatica', 'knee', 'hip pain', 'plantar', 'shoulder', 'tennis elbow', 'foot pain', 'frozen shoulder', 'rotator cuff', 'post-surg', 'post surg'], ans: 'pain' },
    { kws: ['who is', 'team', 'doctor', 'staff', 'therapist', 'dr. cha', 'dr cha', 'dr. jang', 'dr jang', 'dr. kim', 'dr kim'], ans: 'team' },
    { kws: ['parking', 'subway', 'train', 'transit', 'get there', 'getting there'], ans: 'parking' },
    { kws: ['first visit', 'first appointment', 'first time', 'what to expect', 'what should i bring', 'what to wear'], ans: 'firstvisit' },
    { kws: ['cancel', 'reschedule', 'change my appointment', 'change appointment'], ans: 'cancel' }
  ];

  function localResponder(text) {
    var lower = text.toLowerCase();
    for (var i = 0; i < INTENTS.length; i++) {
      for (var j = 0; j < INTENTS[i].kws.length; j++) {
        if (lower.indexOf(INTENTS[i].kws[j]) !== -1) {
          return Promise.resolve(KB[INTENTS[i].ans]);
        }
      }
    }
    return Promise.resolve(
      'I am not sure about that one. The best path is to call <a href="tel:+12126439326"><strong>(212) 643-9326</strong></a> or send a note through the <a href="/v2/book">contact form</a>, and one of us will follow up directly.'
    );
  }

  var SUGGESTED = [
    'What makes your treatment different?',
    'Will this actually work for me?',
    'How fast will I feel better?',
    'Why see a PT instead of taking medication?',
    'I have already tried PT. Why is this different?',
    'How does this benefit me long-term?'
  ];

  // -----------------------------
  // Styles (injected once)
  // -----------------------------
  var STYLE = '\
  #cha-bot-fab {\
    position: fixed; bottom: 24px; left: 24px; z-index: 9998;\
    width: 56px; height: 56px; border-radius: 50%; border: none;\
    background: #1E1B18; color: #F4F1EC; cursor: pointer;\
    display: flex; align-items: center; justify-content: center;\
    box-shadow: 0 4px 20px rgba(0,0,0,0.18);\
    transition: transform 220ms cubic-bezier(0.16,1,0.3,1), background 220ms;\
    font-family: system-ui, -apple-system, sans-serif;\
  }\
  #cha-bot-fab:hover { transform: scale(1.06); background: #4A4440; }\
  #cha-bot-fab svg { width: 22px; height: 22px; stroke: #BFA160; fill: none; stroke-width: 1.8; }\
  #cha-bot-panel {\
    position: fixed; bottom: 24px; left: 24px; z-index: 9999;\
    width: 360px; max-width: calc(100vw - 32px);\
    height: 540px; max-height: calc(100vh - 48px);\
    background: #F4F1EC; color: #1E1B18;\
    border-radius: 14px; box-shadow: 0 12px 48px rgba(0,0,0,0.22);\
    display: none; flex-direction: column; overflow: hidden;\
    font-family: system-ui, -apple-system, "Helvetica Neue", sans-serif;\
    animation: chaBotIn 280ms cubic-bezier(0.16,1,0.3,1);\
  }\
  @keyframes chaBotIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }\
  .cha-bot-header {\
    padding: 16px 18px; background: #1E1B18; color: #F4F1EC;\
    display: flex; align-items: center; justify-content: space-between; gap: 12px;\
  }\
  .cha-bot-title { display: flex; flex-direction: column; gap: 2px; }\
  .cha-bot-title .name { font-family: Georgia, "Times New Roman", serif; font-size: 17px; letter-spacing: -0.005em; }\
  .cha-bot-title .sub { font-size: 11px; opacity: 0.6; letter-spacing: 0.06em; text-transform: uppercase; }\
  .cha-bot-close {\
    background: transparent; border: none; color: #F4F1EC; cursor: pointer;\
    width: 28px; height: 28px; border-radius: 6px;\
    display: flex; align-items: center; justify-content: center; opacity: 0.7;\
    transition: opacity 200ms, background 200ms;\
  }\
  .cha-bot-close:hover { opacity: 1; background: rgba(255,255,255,0.08); }\
  .cha-bot-close svg { width: 14px; height: 14px; stroke: currentColor; fill: none; stroke-width: 2; }\
  .cha-bot-messages {\
    flex: 1; overflow-y: auto; padding: 18px;\
    display: flex; flex-direction: column; gap: 12px;\
    background: #F4F1EC;\
  }\
  .cha-bot-msg {\
    max-width: 88%; padding: 11px 14px; border-radius: 12px;\
    font-size: 14px; line-height: 1.55; font-weight: 300;\
  }\
  .cha-bot-msg.bot {\
    background: #fff; color: #1E1B18; align-self: flex-start;\
    border: 1px solid rgba(30,27,24,0.08);\
    border-top-left-radius: 4px;\
  }\
  .cha-bot-msg.user {\
    background: #1E1B18; color: #F4F1EC; align-self: flex-end;\
    border-top-right-radius: 4px;\
  }\
  .cha-bot-msg a {\
    color: inherit; border-bottom: 1px solid rgba(184,130,107,0.6); padding-bottom: 1px;\
  }\
  .cha-bot-msg.bot a { border-bottom-color: #BFA160; color: #1E1B18; }\
  .cha-bot-msg.bot a:hover { color: #BFA160; }\
  .cha-bot-suggestions {\
    display: flex; flex-wrap: wrap; gap: 6px; padding: 0 18px 12px;\
  }\
  .cha-bot-chip {\
    background: rgba(191,161,96,0.12); color: #1E1B18; border: 1px solid rgba(191,161,96,0.3);\
    padding: 6px 12px; border-radius: 999px; font-size: 12px; cursor: pointer;\
    transition: background 200ms, border-color 200ms;\
    font-family: inherit;\
  }\
  .cha-bot-chip:hover { background: rgba(191,161,96,0.22); border-color: #BFA160; }\
  .cha-bot-input-row {\
    display: flex; gap: 8px; padding: 12px 14px 14px;\
    border-top: 1px solid rgba(30,27,24,0.08);\
    background: #F4F1EC;\
  }\
  .cha-bot-input {\
    flex: 1; padding: 10px 14px; border-radius: 22px;\
    border: 1px solid rgba(30,27,24,0.14); background: #fff;\
    font-family: inherit; font-size: 14px; color: #1E1B18;\
    outline: none; transition: border-color 200ms;\
  }\
  .cha-bot-input:focus { border-color: #BFA160; }\
  .cha-bot-send {\
    background: #1E1B18; color: #F4F1EC; border: none;\
    width: 40px; height: 40px; border-radius: 50%; cursor: pointer;\
    display: flex; align-items: center; justify-content: center;\
    transition: background 200ms; flex-shrink: 0;\
  }\
  .cha-bot-send:hover { background: #BFA160; }\
  .cha-bot-send:disabled { opacity: 0.4; cursor: not-allowed; }\
  .cha-bot-send svg { width: 16px; height: 16px; stroke: currentColor; fill: none; stroke-width: 2; }\
  .cha-bot-typing {\
    display: inline-flex; gap: 4px; align-items: center;\
  }\
  .cha-bot-typing span {\
    width: 6px; height: 6px; border-radius: 50%; background: #7A706A;\
    animation: chaBotPulse 1.2s infinite ease-in-out;\
  }\
  .cha-bot-typing span:nth-child(2) { animation-delay: 0.18s; }\
  .cha-bot-typing span:nth-child(3) { animation-delay: 0.36s; }\
  @keyframes chaBotPulse { 0%, 60%, 100% { transform: scale(0.7); opacity: 0.4; } 30% { transform: scale(1); opacity: 1; } }\
  .cha-bot-footer-hint {\
    font-size: 10.5px; color: #7A706A; text-align: center; padding: 0 18px 10px;\
    letter-spacing: 0.04em;\
  }\
  @media (max-width: 480px) {\
    #cha-bot-panel { left: 8px; right: 8px; width: auto; bottom: 8px; height: calc(100vh - 16px); border-radius: 12px; }\
    #cha-bot-fab { left: 16px; bottom: 16px; }\
  }\
  ';

  var styleEl = document.createElement('style');
  styleEl.textContent = STYLE;
  document.head.appendChild(styleEl);

  // -----------------------------
  // DOM
  // -----------------------------
  var fab = document.createElement('button');
  fab.id = 'cha-bot-fab';
  fab.setAttribute('aria-label', 'Open help chat');
  fab.innerHTML = '<svg viewBox="0 0 24 24"><path d="M21 12a8 8 0 0 1-11.5 7.2L4 21l1.8-5.5A8 8 0 1 1 21 12z"/></svg>';
  document.body.appendChild(fab);

  var panel = document.createElement('div');
  panel.id = 'cha-bot-panel';
  panel.innerHTML = ''
    + '<div class="cha-bot-header">'
    +   '<div class="cha-bot-title">'
    +     '<span class="name">Cha Help</span>'
    +     '<span class="sub">Usually replies instantly</span>'
    +   '</div>'
    +   '<button class="cha-bot-close" aria-label="Close chat">'
    +     '<svg viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg>'
    +   '</button>'
    + '</div>'
    + '<div class="cha-bot-messages" id="cha-bot-messages"></div>'
    + '<div class="cha-bot-suggestions" id="cha-bot-suggestions"></div>'
    + '<form class="cha-bot-input-row" id="cha-bot-form">'
    +   '<input type="text" class="cha-bot-input" id="cha-bot-input" placeholder="Ask anything…" autocomplete="off" />'
    +   '<button type="submit" class="cha-bot-send" id="cha-bot-send" aria-label="Send">'
    +     '<svg viewBox="0 0 24 24"><path d="M5 12h14M13 5l7 7-7 7"/></svg>'
    +   '</button>'
    + '</form>'
    + '<div class="cha-bot-footer-hint">For clinical questions, please call (212) 643-9326.</div>';
  document.body.appendChild(panel);

  var messagesEl = panel.querySelector('#cha-bot-messages');
  var suggestionsEl = panel.querySelector('#cha-bot-suggestions');
  var formEl = panel.querySelector('#cha-bot-form');
  var inputEl = panel.querySelector('#cha-bot-input');
  var sendEl = panel.querySelector('#cha-bot-send');
  var closeEl = panel.querySelector('.cha-bot-close');

  function addMsg(html, who) {
    var m = document.createElement('div');
    m.className = 'cha-bot-msg ' + who;
    m.innerHTML = html;
    messagesEl.appendChild(m);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    return m;
  }

  function addTyping() {
    var m = document.createElement('div');
    m.className = 'cha-bot-msg bot';
    m.innerHTML = '<span class="cha-bot-typing"><span></span><span></span><span></span></span>';
    messagesEl.appendChild(m);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    return m;
  }

  function renderSuggestions(list) {
    suggestionsEl.innerHTML = '';
    list.forEach(function (q) {
      var c = document.createElement('button');
      c.type = 'button';
      c.className = 'cha-bot-chip';
      c.textContent = q;
      c.addEventListener('click', function () { handleUserMessage(q); });
      suggestionsEl.appendChild(c);
    });
  }

  var askedSuggestions = {};

  function pickFollowups(count) {
    // Prefer chips the user has not clicked yet. When the pool is exhausted,
    // reset and pick fresh.
    var fresh = SUGGESTED.filter(function (q) { return !askedSuggestions[q]; });
    if (fresh.length < count) {
      askedSuggestions = {};
      fresh = SUGGESTED.slice();
    }
    // Shuffle and take `count`
    fresh.sort(function () { return Math.random() - 0.5; });
    return fresh.slice(0, count);
  }

  function handleUserMessage(text) {
    text = (text || '').trim();
    if (!text) return;
    askedSuggestions[text] = true;
    inputEl.value = '';
    addMsg(escapeHTML(text), 'user');
    var typing = addTyping();
    sendEl.disabled = true;
    var minDelay = new Promise(function (r) { setTimeout(r, 450); });
    Promise.all([localResponder(text), minDelay]).then(function (results) {
      typing.remove();
      addMsg(results[0], 'bot');
      sendEl.disabled = false;
      // After the first prompt, surface only two follow-up chips at a time
      // so the conversation feels like a real exchange, not a menu.
      renderSuggestions(pickFollowups(2));
      inputEl.focus();
    });
  }

  function escapeHTML(s) {
    var d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }

  // -----------------------------
  // Open / close logic
  // -----------------------------
  var openedOnce = false;
  function openPanel() {
    panel.style.display = 'flex';
    fab.style.display = 'none';
    inputEl.focus();
    if (!openedOnce) {
      addMsg('Hi. Most people who land here are dealing with pain that has not resolved with what they have already tried. Here are some of the questions they usually want answered first.', 'bot');
      renderSuggestions(SUGGESTED);
      openedOnce = true;
    }
  }
  function closePanel() {
    panel.style.display = 'none';
    fab.style.display = 'flex';
  }

  fab.addEventListener('click', openPanel);
  closeEl.addEventListener('click', closePanel);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && panel.style.display === 'flex') closePanel();
  });

  formEl.addEventListener('submit', function (e) {
    e.preventDefault();
    handleUserMessage(inputEl.value);
  });
})();

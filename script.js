/* ============================================================
   BeMeal — waitlist + motion
   ============================================================ */
(function () {
  'use strict';

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const STORAGE = {
    count: 'bemeal_list_count',
    member: 'bemeal_member',
    refCode: 'bemeal_ref_code',
  };
  const BASE_COUNT = 247;

  /* ---------- waitlist state ---------- */
  function getListCount() {
    const stored = localStorage.getItem(STORAGE.count);
    return stored ? parseInt(stored, 10) : BASE_COUNT;
  }

  function setListCount(n) {
    localStorage.setItem(STORAGE.count, String(n));
    updateAllCounters(n);
  }

  function getRefCode() {
    let code = localStorage.getItem(STORAGE.refCode);
    if (!code) {
      code = Math.random().toString(36).slice(2, 8);
      localStorage.setItem(STORAGE.refCode, code);
    }
    return code;
  }

  function referralUrl() {
    const url = new URL(window.location.href);
    url.searchParams.set('ref', getRefCode());
    url.hash = '';
    return url.toString();
  }

  function shareMessage(queue) {
    return `I'm #${queue} on the BeMeal waitlist. Join the waitlist.`;
  }

  function getSupabaseConfig() {
    const cfg = window.BEMEAL_SUPABASE;
    if (!cfg || !cfg.url) return null;
    const key = cfg.publishableKey || cfg.anonKey;
    if (!key) return null;
    if (
      cfg.url.includes('YOUR_PROJECT')
      || cfg.url.includes('PASTE_PROJECT_URL')
      || key.includes('YOUR_SUPABASE')
    ) return null;
    return { url: cfg.url, key };
  }

  function supabaseHeaders(key) {
    const headers = {
      apikey: key,
      'Content-Type': 'application/json',
    };
    // New sb_publishable_* keys must only go in apikey, not Authorization Bearer
    if (!key.startsWith('sb_publishable_') && !key.startsWith('sb_secret_')) {
      headers.Authorization = `Bearer ${key}`;
    }
    return headers;
  }

  async function submitToSupabase(email) {
    const cfg = getSupabaseConfig();
    if (!cfg) return null;

    const params = new URLSearchParams(window.location.search);
    const referredBy = params.get('ref');

    const res = await fetch(`${cfg.url.replace(/\/$/, '')}/rest/v1/rpc/join_waitlist`, {
      method: 'POST',
      headers: supabaseHeaders(cfg.key),
      body: JSON.stringify({
        p_email: email,
        p_ref_code: getRefCode(),
        p_referred_by: referredBy && referredBy !== getRefCode() ? referredBy : null,
      }),
    });

    if (!res.ok) {
      throw new Error(`waitlist_${res.status}`);
    }

    const data = await res.json();
    if (!data || !data.ok) {
      throw new Error(data && data.error ? data.error : 'waitlist_failed');
    }

    return data;
  }

  function setSubmitPending(form, pending) {
    const btn = form.querySelector('.signup__btn');
    if (!btn) return;
    btn.disabled = pending;
    btn.textContent = pending ? 'Joining…' : 'Join the waitlist';
  }

  function showSubmitError(input, message) {
    input.classList.add('is-error');
    input.setAttribute('aria-invalid', 'true');
    let note = input.closest('.signup') && input.closest('.signup').querySelector('.signup__error');
    if (!note) {
      note = document.createElement('p');
      note.className = 'signup__error mono';
      note.setAttribute('role', 'alert');
      input.closest('.signup').appendChild(note);
    }
    note.textContent = message;
  }

  function clearSubmitError(input) {
    input.classList.remove('is-error');
    input.removeAttribute('aria-invalid');
    const note = input.closest('.signup') && input.closest('.signup').querySelector('.signup__error');
    if (note) note.remove();
  }

  function updateAllCounters(n) {
    document.querySelectorAll('[data-count]').forEach((el) => {
      el.textContent = String(n);
    });
  }

  function renderJoinedState(member) {
    getRefCode();
    const link = referralUrl();

    document.querySelectorAll('[data-waitlist]').forEach((zone) => {
      zone.classList.add('is-joined');
      zone.querySelectorAll('.signup-success').forEach((el) => { el.hidden = false; });

      const numEl = zone.querySelector('[data-queue-num]');
      const linkEl = zone.querySelector('[data-referral-link]');
      const shareBtn = zone.querySelector('[data-share-referral]');

      if (numEl) numEl.textContent = `#${member.queue}`;
      if (linkEl) linkEl.value = link;
      if (shareBtn) shareBtn.hidden = !navigator.share;
    });

    const modal = document.querySelector('[data-waitlist-modal]');
    if (modal) {
      const modalNum = modal.querySelector('[data-modal-queue-num]');
      const modalLink = modal.querySelector('[data-referral-link]');
      const modalShare = modal.querySelector('[data-share-referral]');
      if (modalNum) modalNum.textContent = `#${member.queue}`;
      if (modalLink) modalLink.value = link;
      if (modalShare) modalShare.hidden = !navigator.share;
    }
  }

  function openWaitlistModal() {
    const modal = document.querySelector('[data-waitlist-modal]');
    if (!modal) return;

    modal.hidden = false;
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('is-modal-open');

    requestAnimationFrame(() => {
      modal.classList.add('is-open');
      const closeBtn = modal.querySelector('.waitlist-modal__close');
      if (closeBtn) closeBtn.focus();
    });
  }

  function closeWaitlistModal() {
    const modal = document.querySelector('[data-waitlist-modal]');
    if (!modal || modal.hidden) return;

    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('is-modal-open');

    const finish = () => {
      modal.hidden = true;
      modal.removeEventListener('transitionend', onPanelEnd);
    };
    const onPanelEnd = (e) => {
      if (e.target === modal.querySelector('.waitlist-modal__panel')) finish();
    };

    if (prefersReduced) {
      finish();
      return;
    }

    modal.addEventListener('transitionend', onPanelEnd);
    setTimeout(finish, 500);
  }

  function joinWaitlist(email, queue, options) {
    const showModal = options && options.showModal;
    const member = { email, queue, joinedAt: Date.now() };
    localStorage.setItem(STORAGE.member, JSON.stringify(member));
    if (queue > getListCount()) setListCount(queue);
    renderJoinedState(member);

    if (showModal) {
      openWaitlistModal();
      return;
    }

    const hero = document.querySelector('.hero .waitlist');
    if (hero) {
      hero.scrollIntoView({ behavior: prefersReduced ? 'auto' : 'smooth', block: 'nearest' });
    }
  }

  async function handleWaitlistSignup(email, form, input) {
    setSubmitPending(form, true);
    clearSubmitError(input);

    try {
      const remote = await submitToSupabase(email);

      if (remote) {
        joinWaitlist(email, remote.queue, { showModal: true });
        return;
      }

      const count = getListCount();
      const queue = count + 1;
      setListCount(queue);
      joinWaitlist(email, queue, { showModal: true });
    } catch (_) {
      showSubmitError(input, 'Something went wrong. Try again in a moment.');
    } finally {
      setSubmitPending(form, false);
    }
  }

  /* restore session */
  const saved = localStorage.getItem(STORAGE.member);
  if (saved) {
    try {
      renderJoinedState(JSON.parse(saved));
    } catch (_) { /* ignore corrupt storage */ }
  }

  updateAllCounters(getListCount());

  /* live counter tick */
  if (!prefersReduced) {
    const tick = () => {
      const delay = 45000 + Math.random() * 75000;
      setTimeout(() => {
        const n = getListCount();
        if (n < 999) setListCount(n + 1);
        tick();
      }, delay);
    };
    tick();
  }

  /* ---------- forms ---------- */
  document.querySelectorAll('.signup').forEach((form) => {
    const input = form.querySelector('.signup__input');

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (localStorage.getItem(STORAGE.member)) return;

      const email = (input.value || '').trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        showSubmitError(input, 'Enter a valid email address.');
        input.focus();
        return;
      }

      clearSubmitError(input);
      handleWaitlistSignup(email, form, input);
    });

    input.addEventListener('input', () => clearSubmitError(input));
  });

  /* copy + share referral */
  function getReferralInput(btn) {
    const modal = btn.closest('[data-waitlist-modal]');
    if (modal) return modal.querySelector('[data-referral-link]');
    const zone = btn.closest('.waitlist');
    return zone && zone.querySelector('[data-referral-link]');
  }

  document.querySelectorAll('[data-waitlist-modal-close]').forEach((el) => {
    el.addEventListener('click', closeWaitlistModal);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeWaitlistModal();
  });

  document.querySelectorAll('[data-copy-referral]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const input = getReferralInput(btn);
      if (!input || !input.value) return;

      try {
        await navigator.clipboard.writeText(input.value);
      } catch (_) {
        input.select();
        document.execCommand('copy');
      }

      btn.textContent = 'Copied';
      btn.classList.add('is-copied');
      setTimeout(() => {
        btn.textContent = 'Copy link';
        btn.classList.remove('is-copied');
      }, 2000);
    });
  });

  document.querySelectorAll('[data-share-referral]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const input = getReferralInput(btn);
      const savedMember = localStorage.getItem(STORAGE.member);
      if (!input || !savedMember || !navigator.share) return;

      let queue = getListCount();
      try { queue = JSON.parse(savedMember).queue; } catch (_) { /* use fallback */ }

      try {
        await navigator.share({
          title: 'BeMeal waitlist',
          text: shareMessage(queue),
          url: input.value,
        });
      } catch (_) { /* user cancelled */ }
    });
  });

  /* track inbound referrals (demo) */
  const params = new URLSearchParams(window.location.search);
  const ref = params.get('ref');
  if (ref && ref !== getRefCode()) {
    const key = `bemeal_ref_hit_${ref}`;
    if (!sessionStorage.getItem(key)) {
      sessionStorage.setItem(key, '1');
      const n = getListCount();
      setListCount(n + 1);
    }
  }

  /* ---------- motion ---------- */
  const reveal = document.querySelector('[data-reveal]');
  if (reveal) {
    reveal.querySelectorAll('.word').forEach((w, i) => {
      w.style.setProperty('--d', `${i * 38}ms`);
    });
    requestAnimationFrame(() => reveal.classList.add('is-in'));
  }

  const float = document.querySelector('[data-float]');
  if (float) {
    const imgs = float.querySelectorAll('img');
    const go = () => requestAnimationFrame(() => float.classList.add('is-in'));
    const pending = [...imgs].filter((img) => !img.complete);
    if (pending.length === 0) {
      go();
    } else {
      let left = pending.length;
      pending.forEach((img) => {
        img.addEventListener('load', () => { if (--left === 0) go(); }, { once: true });
        img.addEventListener('error', () => { if (--left === 0) go(); }, { once: true });
      });
    }
  }

  const steps = [...document.querySelectorAll('[data-step]')];

  if (prefersReduced || !('IntersectionObserver' in window)) {
    steps.forEach((el) => el.classList.add('is-in'));
  } else {
    const stepRoot = document.querySelector('.steps');
    const io = new IntersectionObserver((entries, obs) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        obs.unobserve(el);

        if (el.hasAttribute('data-step') && stepRoot) {
          const idx = [...stepRoot.querySelectorAll('[data-step]')].indexOf(el);
          el.style.setProperty('--step-delay', `${idx * 120}ms`);
        }
        el.classList.add('is-in');
      });
    }, { threshold: 0.2, rootMargin: '0px 0px -6% 0px' });

    steps.forEach((el) => io.observe(el));
  }

  const track = document.querySelector('.feed__track');
  if (track && !prefersReduced) {
    [...track.children].forEach((node) => {
      const clone = node.cloneNode(true);
      clone.setAttribute('aria-hidden', 'true');
      track.appendChild(clone);
    });
  }

  const nav = document.querySelector('.nav');
  if (nav) {
    const onScroll = () => nav.classList.toggle('is-stuck', window.scrollY > 6);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* count-up on first view */
  const counterWrap = document.querySelector('[data-count-wrap]');
  if (counterWrap && !saved && !prefersReduced) {
    const target = getListCount();
    const countEl = counterWrap.querySelector('[data-count]');
    let started = false;

    const run = () => {
      if (started || !countEl) return;
      started = true;
      const from = Math.max(BASE_COUNT - 40, target - 40);
      const start = performance.now();
      const dur = 1000;

      const tick = (now) => {
        const t = Math.min(1, (now - start) / dur);
        const eased = 1 - Math.pow(1 - t, 3);
        countEl.textContent = String(Math.round(from + (target - from) * eased));
        if (t < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };

    if ('IntersectionObserver' in window) {
      new IntersectionObserver((e) => {
        if (e[0].isIntersecting) run();
      }, { threshold: 0.5 }).observe(counterWrap);
    } else {
      run();
    }
  }
})();

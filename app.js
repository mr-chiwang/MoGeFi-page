const data = await fetch('data.json').then(r => { if (!r.ok) throw new Error('Could not load motion examples'); return r.json(); });
const players = [];
data.robot = await fetch('robot.json').then(r => r.json());
const detail = document.querySelector('.motion-dialog');
let detailSource = null;
function openDetail(player, method, source) {
  players.forEach(p => p.pause()); stopHeroes();
  detailSource = player;
  detail.querySelector('#detail-title').textContent = method.label;
  detail.querySelector('.detail-prompt').textContent = player.case.text;
  const video = source.cloneNode(true); video.controls = true; video.muted = true; video.preload = 'auto';
  const time = source.currentTime;
  video.addEventListener('loadedmetadata', () => { video.currentTime = Math.min(time, video.duration); }, {once:true});
  detail.querySelector('.detail-video').replaceChildren(video);
  detail.showModal();
}
detail.querySelector('.detail-close').addEventListener('click', () => detail.close());
detail.addEventListener('click', e => { if (e.target === detail) detail.close(); });
detail.addEventListener('close', () => {
  const video = detail.querySelector('video');
  if (video) { video.pause(); detailSource?.seek(video.currentTime); video.replaceChildren(); video.removeAttribute('src'); video.load(); }
  detail.querySelector('.detail-video').replaceChildren(); detailSource = null;
});

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const heroes = [...document.querySelectorAll('[data-hero]')];
let heroEnabled = !reducedMotion;
const heroButton = document.querySelector('.hero-pause');
function stopHeroes() { heroes.forEach(v => v.pause()); }
function playHeroes() { if (heroEnabled && !document.hidden) heroes.filter(v => v.getBoundingClientRect().height).forEach(v => v.play().catch(() => {})); }
heroButton.addEventListener('click', () => {
  heroEnabled = !heroEnabled;
  if (heroEnabled) { players.forEach(p => p.pause()); playHeroes(); } else stopHeroes();
  heroButton.textContent = heroEnabled ? 'Ⅱ' : '▶';
  heroButton.setAttribute('aria-label', `${heroEnabled ? 'Pause' : 'Play'} introduction videos`);
});
heroButton.textContent = heroEnabled ? 'Ⅱ' : '▶';
heroButton.setAttribute('aria-label', `${heroEnabled ? 'Pause' : 'Play'} introduction videos`);
new IntersectionObserver(entries => entries.forEach(e => { if (e.isIntersecting) playHeroes(); else stopHeroes(); }), {threshold:0.1}).observe(document.querySelector('.hero-films'));

class MotionComparison {
  constructor(task, config) {
    this.task = task; this.config = config; this.root = document.getElementById(task);
    this.playing = false; this.frameRequest = 0; this.generation = 0; this.requestId = 0;
    this.timeline = this.root.querySelector('.timeline'); this.playButton = this.root.querySelector('.play');
    this.speed = this.root.querySelector('.speed'); this.time = this.root.querySelector('.time');
    const tabs = this.root.querySelector('.case-tabs');
    config.cases.forEach((item, i) => {
      const tab = document.createElement('button'); tab.type = 'button'; tab.role = 'tab';
      tab.id = `${task}-tab-${item.id}`; tab.setAttribute('aria-controls', `${task}-panel`);
      tab.textContent = item.label;
      tab.addEventListener('click', () => this.select(i));
      tab.addEventListener('keydown', e => {
        let target;
        if (e.key === 'ArrowRight') target = (i+1) % config.cases.length;
        if (e.key === 'ArrowLeft') target = (i+config.cases.length-1) % config.cases.length;
        if (e.key === 'Home') target = 0;
        if (e.key === 'End') target = config.cases.length-1;
        if (target !== undefined) { e.preventDefault(); this.select(target); tabs.children[target].focus(); }
      });
      tabs.append(tab);
    });
    this.root.querySelector('.example').id = `${task}-panel`;
    this.playButton.addEventListener('click', () => this.playing ? this.pause() : this.play());
    this.root.querySelector('.restart').addEventListener('click', () => { this.seek(0); });
    this.timeline.addEventListener('pointerdown', () => { this.wasPlaying = this.playing; this.pause(); });
    this.timeline.addEventListener('input', () => { if (this.playing) this.pause(); this.seek(Number(this.timeline.value)); });
    this.timeline.addEventListener('change', () => { if (this.wasPlaying) this.play(); this.wasPlaying = false; });
    this.speed.addEventListener('change', () => this.videos.forEach(v => { v.playbackRate = Number(this.speed.value); }));
    new IntersectionObserver(entries => entries.forEach(e => { if (!e.isIntersecting) this.pause(); }), {threshold:0}).observe(this.root);
    this.select(0);
  }
  select(index) {
    if (this.case === this.config.cases[index]) return;
    this.pause(); this.generation++;
    this.case = this.config.cases[index];
    [...this.root.querySelector('.case-tabs').children].forEach((t,i) => { t.setAttribute('aria-selected', i===index); t.tabIndex = i===index ? 0 : -1; });
    this.root.querySelector('.example').setAttribute('aria-labelledby', `${this.task}-tab-${this.case.id}`);
    this.root.querySelector('.prompt').textContent = `“${this.case.text}”`;
    if (this.task === 'sparse') {
      this.root.querySelector('.control-info').textContent = `Control: ${this.case.joint} · ${this.case.observed_frames.length} target frames`;
      this.root.querySelector('.target-times')?.remove();
      const ticks = document.createElement('span'); ticks.className = 'target-times'; ticks.setAttribute('aria-hidden','true');
      this.case.observed_frames.forEach(frame => { const tick = document.createElement('i'); tick.style.left = `${frame/(this.case.frames-1)*100}%`; ticks.append(tick); });
      this.timeline.parentElement.append(ticks);
    }
    this.duration = this.case.frames / this.case.fps;
    this.timeline.max = ((this.case.frames-1)/this.case.fps).toString(); this.timeline.step = (1/this.case.fps).toString();
    const grid = this.root.querySelector('.video-grid');
    grid.style.gridTemplateColumns = `repeat(${this.config.methods.length}, minmax(0,1fr))`;
    grid.style.maxWidth = this.config.methods.length === 1 ? '640px' : ''; grid.style.marginInline = 'auto';
    this.videos?.forEach(v => { v.replaceChildren(); v.removeAttribute('src'); v.load(); }); grid.replaceChildren();
    this.videos = this.config.methods.map(method => {
      const panel = document.createElement('article'); panel.className = `video-panel ${method.id}`;
      const head = document.createElement('header'); const name = document.createElement('strong'); name.textContent = method.label;
      const timing = document.createElement('small'); timing.textContent = method.subtitle ?? (method.id === 'real' ? 'Dataset reference' : `AITS: ${this.config.aits[method.id]} s`);
      if (!method.subtitle) { timing.title = 'Average inference time per sentence'; head.append(name, timing); } else head.append(name);
      const expand = document.createElement('button'); expand.className = 'expand-video'; expand.textContent = '⤢'; expand.setAttribute('aria-label', `Enlarge ${method.label} video`); head.append(expand);
      const v = document.createElement('video'); v.muted = true; v.playsInline = true; v.preload = 'auto';
      for (const extension of (this.task === 'robot' ? ['mp4'] : ['webm','mp4'])) { const source = document.createElement('source'); source.src = `assets/videos/${this.task}-${this.case.id}-${method.id}.${extension}`; source.type = `video/${extension}`; v.append(source); }
      v.poster = `assets/posters/${this.task}-${this.case.id}-${method.id}.jpg`;
      v.setAttribute('aria-label', `${method.label}: ${this.case.text}`);
      v.playbackRate = Number(this.speed.value);
      v.addEventListener('error', () => { this.pause(); if (!panel.querySelector('.media-error')) { const note = document.createElement('p'); note.className = 'media-error'; note.textContent = 'Video could not load. Reload the page to retry.'; panel.append(note); } });
      v.addEventListener('waiting', () => this.resync());
      expand.addEventListener('click', () => openDetail(this, method, v));
      panel.append(head, v); grid.append(panel); return v;
    });
    this.master = this.videos[0];
    this.master.addEventListener('ended', () => { const resume = this.playing; this.pause(); this.seek(0); if (resume) this.play(); });
    this.update(0);
  }
  async play() {
    players.forEach(p => { if (p !== this) p.pause(); }); stopHeroes();
    if (this.playing) return;
    const generation = this.generation; const request = ++this.requestId;
    if (this.master.currentTime >= this.duration - .08) this.seek(0);
    this.starting = true;
    this.playing = true; this.playButton.innerHTML = 'Ⅱ <span>Loading…</span>'; this.playButton.setAttribute('aria-label', `Pause synchronized ${this.task === 'robot' ? 'robot demonstration' : this.task === 't2m' ? 'text-to-motion' : 'joint-control'} videos`);
    try {
      this.videos.forEach(v => { v.preload = 'auto'; if (v.networkState === 0) v.load(); });
      await Promise.all(this.videos.map(v => this.waitForVideo(v, () => v.readyState >= 3)));
      if (!this.playing || generation !== this.generation || request !== this.requestId) return;
      const start = this.master.currentTime;
      this.videos.forEach(v => { if (Math.abs(v.currentTime - start) > .5 / this.case.fps) v.currentTime = start; });
      await Promise.all(this.videos.map(v => this.waitForVideo(v, () => !v.seeking && v.readyState >= 3)));
      if (!this.playing || generation !== this.generation || request !== this.requestId) return;
      this.videos.forEach(v => { v.playbackRate = Number(this.speed.value); });
      await Promise.all(this.videos.map(v => v.play()));
      this.starting = false;
      this.playButton.innerHTML = 'Ⅱ <span>Pause</span>';
    } catch { if (generation === this.generation && request === this.requestId) this.pause(); return; }
    if (!this.playing || generation !== this.generation || request !== this.requestId) return;
    const tick = () => {
      if (!this.playing) return;
      const time = this.master.currentTime;
      this.videos.slice(1).forEach(v => {
        const drift = v.currentTime - time;
        const rate = Number(this.speed.value);
        // Correct small clock drift smoothly; re-align the group for a large gap.
        v.playbackRate = rate * (Math.abs(drift) > .025 ? (drift > 0 ? .95 : 1.05) : 1);
      });
      if (this.videos.some(v => v.seeking || v.readyState < 3 || Math.abs(v.currentTime - time) > .2)) {
        this.resync(); return;
      }
      this.update(time); this.frameRequest = requestAnimationFrame(tick);
    }; tick();
  }
  waitForVideo(video, ready) {
    return new Promise((resolve, reject) => {
      const signal = (this.waitAbort ??= new AbortController()).signal;
      const events = ['canplaythrough', 'canplay', 'seeked', 'progress', 'loadeddata', 'error'];
      const cleanup = () => { events.forEach(e => video.removeEventListener(e, check)); signal.removeEventListener('abort', cancel); };
      const cancel = () => { cleanup(); reject(new Error('Playback cancelled')); };
      const check = () => {
        if (video.error) { cleanup(); reject(new Error('Video unavailable')); }
        else if (ready()) { cleanup(); resolve(); }
      };
      events.forEach(e => video.addEventListener(e, check)); signal.addEventListener('abort', cancel, {once:true});
      check();
    });
  }
  resync() {
    if (!this.playing || this.starting) return;
    const time = this.master.currentTime;
    this.pause(); this.update(time); this.play();
  }
  pause() { this.waitAbort?.abort(); this.waitAbort = null; this.starting = false; this.requestId++; this.playing = false; cancelAnimationFrame(this.frameRequest); this.videos?.forEach(v => v.pause()); if (this.playButton) { this.playButton.innerHTML = '▶ <span>Play all</span>'; this.playButton.setAttribute('aria-label', `Play synchronized ${this.task === 'robot' ? 'robot demonstration' : this.task === 't2m' ? 'text-to-motion' : 'joint-control'} videos`); } }
  seek(time) { this.videos.forEach(v => { if (v.readyState >= 1) v.currentTime = time; }); this.update(time); }
  update(time) { this.timeline.value = Math.min(time, Number(this.timeline.max)); this.time.textContent = `${time.toFixed(2)} / ${this.duration.toFixed(2)} s`; this.timeline.setAttribute('aria-valuetext', `Frame ${Math.min(this.case.frames,Math.floor(time*this.case.fps)+1)} of ${this.case.frames}`); }
}
for (const task of ['t2m','sparse','robot']) players.push(new MotionComparison(task, data[task]));
document.addEventListener('visibilitychange', () => { if (document.hidden) { players.forEach(p => p.pause()); stopHeroes(); } });

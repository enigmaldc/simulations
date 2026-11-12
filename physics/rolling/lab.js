(() => {
  'use strict';

  const { radius, length, step, innerRadius, crescent, bodies, makeState, geometry, slope, advance } = RollingModel;
  const byId = id => document.getElementById(id);
  const inputs = ['angle', 'static', 'kinetic', 'phase'].map(byId);
  const [angleInput, staticInput, kineticInput, phaseInput] = inputs;
  const canvas = byId('track');
  const context = canvas.getContext('2d');
  const play = byId('play');
  const timeInput = byId('time');
  const clock = byId('clock');
  const speed = byId('speed');
  const stepsPerSample = 16;
  const sampleDuration = step * stepsPerSample;
  const maxDuration = 20;
  const formatter = new Intl.NumberFormat('de-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const number = value => formatter.format(Math.abs(value) < .005 ? 0 : value);
  const rows = bodies.map(body => {
    const row = byId('readings').insertRow();
    const name = document.createElement('th');
    name.scope = 'row';
    const swatch = document.createElement('span');
    swatch.className = 'swatch';
    swatch.style.backgroundColor = body.color;
    swatch.setAttribute('aria-hidden', 'true');
    name.append(swatch, body.name);
    row.append(name);
    return [row.insertCell(), row.insertCell(), row.insertCell(), row.insertCell()];
  });

  let states, plane, timeline, sampleIndex, running, frame, lastFrame, playbackTime;

  function updateReadings() {
    const labels = { ready: 'Bereit', roll: 'Rollt', slip: 'Rutscht', air: 'In der Luft' };
    states.forEach((state, i) => {
      const resting = state.mode !== 'ready' && state.mode !== 'air'
        && Math.hypot(state.vx, state.vy, radius * state.spin) < .005;
      const values = [
        state.finish !== null ? 'Im Ziel' : resting ? 'Ruht' : labels[state.mode],
        number(state.finish === null ? geometry(state).x : length),
        number(state.vx),
        state.finish === null ? '–' : number(state.finish),
      ];
      rows[i].forEach((cell, col) => {
        if (cell.textContent !== values[col]) cell.textContent = values[col];
      });
    });
  }

  function circle(x, y, r) {
    context.moveTo(x + r, y);
    context.arc(x, y, r, 0, 2 * Math.PI);
  }

  function drawBody(state, x, y, r) {
    const { body } = state;
    context.save();
    context.translate(x, y);
    context.rotate(plane.angle + state.angle);
    context.scale(r, r);
    context.beginPath();
    circle(0, 0, 1);
    if (body.shape === 'ring') circle(0, 0, innerRadius);
    if (body.shape === 'crescent') {
      const { left, outer, right, inner, angleLeft, angleRight, crossing } = crescent;
      context.moveTo(crossing, outer * Math.sin(angleLeft));
      context.arc(left, 0, outer, angleLeft, 2 * Math.PI - angleLeft);
      context.arc(right, 0, inner, 2 * Math.PI - angleRight, angleRight, true);
      context.closePath();
    }
    context.fillStyle = body.light;
    if (body.shape === 'sphere' || body.shape === 'shell') {
      const shade = context.createRadialGradient(-.3, -.35, 0, 0, 0, 1);
      shade.addColorStop(0, '#fffef9');
      shade.addColorStop(.54, body.light);
      shade.addColorStop(1, body.color);
      context.fillStyle = shade;
    }
    context.fill('evenodd');
    context.strokeStyle = body.color;
    context.lineWidth = .09;
    context.stroke();

    context.beginPath();
    if (body.shape === 'shell') {
      context.ellipse(0, 0, .57, .83, 0, 0, 2 * Math.PI);
      context.setLineDash([.11, .10]);
      context.stroke();
      context.setLineDash([]);
      context.beginPath();
    }
    context.moveTo(.76, 0);
    context.lineTo(.94, 0);
    context.lineCap = 'round';
    context.stroke();
    if (body.e) {
      context.beginPath();
      circle(body.e, 0, .12);
      context.fillStyle = '#283e37';
      context.fill();
    }
    context.restore();
  }

  function draw() {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const density = Math.min(window.devicePixelRatio || 1, 2);
    const pixelsWide = Math.round(width * density);
    const pixelsHigh = Math.round(height * density);
    if (canvas.width !== pixelsWide || canvas.height !== pixelsHigh) {
      canvas.width = pixelsWide;
      canvas.height = pixelsHigh;
    }
    context.setTransform(density, 0, 0, density, 0, 0);
    context.clearRect(0, 0, width, height);
    if (!width || !height) return;

    const sin = Math.sin(plane.angle);
    const cos = Math.cos(plane.angle);
    const laneGap = width < 520 ? 33 : 50;
    const spreadX = 4 * laneGap * sin;
    const spreadY = 4 * laneGap * cos;
    const scale = Math.min((width - 76 - spreadX) / (length * cos),
      (height - spreadY - 78) / Math.max(length * sin, .01),
      (height - spreadY - 34) / (length * sin + 4 * radius),
      (laneGap - 6) / (2 * radius));
    const spanX = length * scale * cos;
    const spanY = length * scale * sin;
    const startX = (width - spanX + spreadX) / 2;
    const startY = (height - spanY - spreadY) / 2 + 11;

    context.font = '600 12px "Segoe UI", sans-serif';
    context.textAlign = 'center';
    context.fillStyle = '#455f55';
    context.fillText('Start', startX, startY - 2 * radius * scale - 10);
    context.fillText('Ziel', startX + spanX, startY + spanY - 2 * radius * scale - 10);

    states.forEach((state, i) => {
      const x = startX - i * laneGap * sin;
      const y = startY + i * laneGap * cos;
      context.beginPath();
      context.moveTo(x - 21 * cos, y - 21 * sin);
      context.lineTo(x + spanX + 8 * cos, y + spanY + 8 * sin);
      context.strokeStyle = '#a6b7a7';
      context.lineWidth = 2;
      context.stroke();
      context.beginPath();
      context.moveTo(x, y);
      context.lineTo(x + 7 * sin, y - 7 * cos);
      context.moveTo(x + spanX, y + spanY);
      context.lineTo(x + spanX + 10 * sin, y + spanY - 10 * cos);
      context.strokeStyle = state.body.color;
      context.stroke();
    });
    states.forEach((state, i) => {
      const { x, y } = geometry(state);
      drawBody(state, startX - i * laneGap * sin + scale * (x * cos + y * sin),
        startY + i * laneGap * cos + scale * (x * sin - y * cos), radius * scale);
    });
  }

  function updatePlayButton() {
    if (running) play.textContent = 'Pause';
    else if (!sampleIndex) play.textContent = 'Start';
    else if (sampleIndex === timeline.length - 1) play.textContent = 'Neustart';
    else play.textContent = 'Weiter';
  }

  function pause() {
    running = false;
    cancelAnimationFrame(frame);
  }

  function recordRun(phase) {
    const current = bodies.map(body => makeState(body, phase));
    const samples = [{ time: 0, states: current.map(state => ({ ...state })) }];
    const maxTicks = Math.round(maxDuration / step);
    for (let tick = 1; tick <= maxTicks; tick++) {
      for (const state of current) {
        if (state.finish !== null) continue;
        const previous = geometry(state).x;
        advance(state, plane);
        const position = geometry(state).x;
        if (position >= length) state.finish = (tick - 1 + (length - previous) / (position - previous)) * step;
      }
      const finished = current.every(state => state.finish !== null);
      if (finished || tick % stepsPerSample === 0 || tick === maxTicks) {
        const time = finished ? Math.max(...current.map(state => state.finish)) : tick * step;
        samples.push({ time, states: current.map(state => ({ ...state })) });
      }
      if (finished) break;
    }
    return samples;
  }

  function showSample(index) {
    sampleIndex = index;
    states = timeline[index].states;
    timeInput.value = index;
    const currentTime = number(timeline[index].time) + ' s';
    clock.value = currentTime + ' / ' + number(timeline.at(-1).time) + ' s';
    timeInput.setAttribute('aria-valuetext', currentTime);
    updatePlayButton();
    updateReadings();
    draw();
  }

  function reset() {
    pause();
    kineticInput.max = staticInput.value;
    plane = slope(+angleInput.value, +staticInput.value, +kineticInput.value);
    byId('angle-value').value = angleInput.value + '°';
    byId('static-value').value = number(plane.muStatic);
    byId('kinetic-value').value = number(plane.muKinetic);
    byId('phase-value').value = phaseInput.value + '°';
    const phase = (+phaseInput.value + 90) * Math.PI / 180;
    timeline = recordRun(phase);
    timeInput.max = timeline.length - 1;
    showSample(0);
  }

  function tick(now) {
    if (!running) return;
    if (lastFrame !== undefined) playbackTime += Math.min((now - lastFrame) / 1000, .05) * +speed.value;
    lastFrame = now;
    if (playbackTime >= timeline.at(-1).time) {
      pause();
      showSample(timeline.length - 1);
      return;
    }
    const index = Math.floor(playbackTime / sampleDuration);
    if (index !== sampleIndex) showSample(index);
    frame = requestAnimationFrame(tick);
  }

  for (const input of inputs) input.addEventListener('input', reset);
  timeInput.addEventListener('input', () => {
    pause();
    showSample(+timeInput.value);
  });
  byId('reset').addEventListener('click', () => {
    pause();
    showSample(0);
  });
  play.addEventListener('click', () => {
    if (running) {
      pause();
      updatePlayButton();
    } else {
      if (sampleIndex === timeline.length - 1) showSample(0);
      running = true;
      playbackTime = timeline[sampleIndex].time;
      lastFrame = undefined;
      updatePlayButton();
      frame = requestAnimationFrame(tick);
    }
  });
  reset();
  new ResizeObserver(draw).observe(canvas);
})();

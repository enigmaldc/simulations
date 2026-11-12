(() => {
  'use strict';

  const radius = 0.30;
  const length = 6;
  const step = 1 / 960;
  const stepsPerSample = 16;
  const sampleDuration = step * stepsPerSample;
  const maxDuration = 20;
  const gravity = 9.81;
  const innerRadius = 0.70;
  // Subtract the part of the left disk outside the right disk, in units of R.
  const crescent = { left: -0.16, outer: 0.73, right: 0.24, inner: 0.68 };
  const { left, outer, right, inner } = crescent;
  crescent.crossing = (outer ** 2 - inner ** 2 + right ** 2 - left ** 2) / (2 * (right - left));
  crescent.angleLeft = Math.acos((crescent.crossing - left) / outer);
  crescent.angleRight = Math.acos((crescent.crossing - right) / inner);

  let area = 0;
  let firstMoment = 0;
  let polarMoment = 0;
  const slice = (crescent.crossing - (left - outer)) / 8192;
  for (let i = 0; i < 8192; i++) {
    const x = left - outer + (i + 0.5) * slice;
    const top = Math.sqrt(Math.max(0, outer ** 2 - (x - left) ** 2));
    const bottom = Math.sqrt(Math.max(0, inner ** 2 - (x - right) ** 2));
    const strip = 2 * (top - bottom) * slice;
    area += strip;
    firstMoment += x * strip;
    polarMoment += x ** 2 * strip + 2 / 3 * (top ** 3 - bottom ** 3) * slice;
  }
  const material = Math.PI - area;
  const center = -firstMoment / material;
  const inertia = (Math.PI / 2 - polarMoment) / material - center ** 2;

  const bodies = [
    { name: 'Vollkugel', shape: 'sphere', k: 2 / 5, color: '#237f70', light: '#bfe6d4' },
    { name: 'Hohlkugel', shape: 'shell', k: 2 / 3, color: '#4c6095', light: '#cedaf3' },
    { name: 'Vollzylinder', shape: 'disk', k: 1 / 2, color: '#a75630', light: '#f4c6a5' },
    { name: 'Hohlzylinder', shape: 'ring', k: (1 + innerRadius ** 2) / 2, color: '#724c85', light: '#e8d0eb' },
    { name: 'Zylinder mit Sichelbohrung', shape: 'crescent', k: inertia, e: center, color: '#8b641c', light: '#f5d890' },
  ];

  function makeState(body, phase) {
    const angle = body.e ? phase : 0;
    const e = (body.e || 0) * radius;
    return {
      body, e, j: body.k * radius ** 2,
      x: e * Math.cos(angle), y: radius - e * Math.sin(angle), angle,
      vx: 0, vy: 0, spin: 0, mode: 'ready', finish: null,
    };
  }

  function geometry(state) {
    const x = state.x - state.e * Math.cos(state.angle);
    const y = state.y + state.e * Math.sin(state.angle);
    return { x, y };
  }

  function slope(degrees, muStatic, muKinetic) {
    const angle = degrees * Math.PI / 180;
    return {
      angle, gx: gravity * Math.sin(angle), gy: -gravity * Math.cos(angle),
      muStatic, muKinetic: Math.min(muKinetic, muStatic),
    };
  }

  function advance(state, plane, dt = step) {
    // Integrate gravity on the centre of mass. The circular rim alone touches
    // the plane, so the contact lever arm changes as the eccentric body turns.
    const oldVx = state.vx;
    const oldVy = state.vy;
    const oldSpin = state.spin;
    const angle = state.angle + oldSpin * dt;
    const a = state.e * Math.cos(angle);
    const d = radius - state.e * Math.sin(angle);
    state.vx += plane.gx * dt;
    state.vy += plane.gy * dt;
    state.mode = 'air';

    if (state.y + (oldVy + state.vy) * dt / 2 <= d + 1e-9) {
      // Contact velocity = (vx - dω, vy + aω). The inverse effective mass
      // matrix below maps impulses per unit mass to changes in that velocity.
      const tangentSpeed = state.vx - d * state.spin;
      const normalSpeed = state.vy + a * state.spin;
      const tt = 1 + d * d / state.j;
      const nn = 1 + a * a / state.j;
      const tn = -a * d / state.j;
      const det = tt * nn - tn * tn;
      let tangent = (tn * normalSpeed - nn * tangentSpeed) / det;
      let normal = (tn * tangentSpeed - tt * normalSpeed) / det;
      if (normal < 0 || Math.abs(tangent) > plane.muStatic * normal + 1e-12) {
        const direction = Math.sign(tangentSpeed - tn * normalSpeed / nn);
        const ratio = -direction * plane.muKinetic;
        normal = -normalSpeed / (nn + tn * ratio);
        tangent = ratio * normal;
        state.mode = 'slip';
      } else {
        state.mode = 'roll';
      }
      if (normal >= 0) {
        state.vx += tangent;
        state.vy += normal;
        state.spin += (a * normal - d * tangent) / state.j;
      } else {
        state.mode = 'air';
      }
    }

    state.angle += (oldSpin + state.spin) * dt / 2;
    state.x += (oldVx + state.vx) * dt / 2;
    state.y += (oldVy + state.vy) * dt / 2;
    // Correct small integration penetrations without adding rebound energy.
    const contactY = radius - state.e * Math.sin(state.angle);
    if (state.mode !== 'air' || state.y < contactY) state.y = contactY;
  }

  function recordRun(plane, phase) {
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

  globalThis.RollingModel = {
    radius, length, step, sampleDuration, innerRadius, crescent, bodies, makeState, geometry, slope, advance, recordRun,
  };
})();

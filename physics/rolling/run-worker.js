'use strict';

importScripts('model.js?v=2');

self.addEventListener('message', ({ data: { id, plane, phase } }) => {
  self.postMessage({ id, samples: RollingModel.recordRun(plane, phase) });
});

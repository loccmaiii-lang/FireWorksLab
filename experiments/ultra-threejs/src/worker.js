import { buildTrack } from './tracks.js';
import { measure } from './generated/core.js';
self.onmessage = ({ data }) => {
  try {
    const track = buildTrack(data.P, data.maxTextureSize);
    const bounds = measure({ ...data.P, engine:'gpu' });
    self.postMessage({ track, bounds }, [track.positions.buffer, track.velocities.buffer, track.info.buffer]);
  } catch (e) { self.postMessage({ error: e.message }); }
};

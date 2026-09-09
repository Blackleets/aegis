export const NAVIGATION_PUCK_IMAGE_ID = 'vector-position-arrow';
export const NAVIGATION_PUCK_PIXEL_RATIO = 2;

export function getNavigationPuckLayerLayout() {
  return {
    'icon-image': NAVIGATION_PUCK_IMAGE_ID,
    'icon-size': [
      'interpolate', ['linear'], ['zoom'],
      12, 0.82,
      16, 1.08,
      18, 1.22,
      19.5, 1.34,
    ],
    'icon-rotate': ['coalesce', ['to-number', ['get', 'bearing']], 0],
    'icon-rotation-alignment': 'map' as const,
    'icon-pitch-alignment': 'viewport' as const,
    'icon-anchor': 'center' as const,
    'icon-allow-overlap': true,
    'icon-ignore-placement': true,
  };
}

export function buildNavigationPuckImageData() {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.translate(128, 138);

  ctx.fillStyle = 'rgba(2, 8, 16, 0.42)';
  ctx.beginPath();
  ctx.ellipse(0, 52, 40, 12, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(0, -96);
  ctx.lineTo(54, 50);
  ctx.quadraticCurveTo(0, 26, -54, 50);
  ctx.closePath();

  ctx.shadowColor = 'rgba(2, 8, 16, 0.7)';
  ctx.shadowBlur = 22;
  ctx.strokeStyle = '#031018';
  ctx.lineWidth = 18;
  ctx.stroke();
  ctx.shadowBlur = 0;

  const body = ctx.createLinearGradient(0, -96, 18, 52);
  body.addColorStop(0, '#E7FFFF');
  body.addColorStop(0.38, '#7DE8EE');
  body.addColorStop(1, '#2A9AA3');
  ctx.fillStyle = body;
  ctx.fill();

  ctx.strokeStyle = '#F7FCFF';
  ctx.lineWidth = 6;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(0, -96);
  ctx.lineTo(-54, 50);
  ctx.lineTo(-18, 28);
  ctx.closePath();
  ctx.fillStyle = 'rgba(4, 16, 24, 0.22)';
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(0, -96);
  ctx.lineTo(54, 50);
  ctx.lineTo(18, 28);
  ctx.closePath();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(0, -70);
  ctx.lineTo(16, 8);
  ctx.quadraticCurveTo(0, 0, -16, 8);
  ctx.closePath();
  ctx.fillStyle = '#041018';
  ctx.fill();

  return {
    width: size,
    height: size,
    data: new Uint8Array(ctx.getImageData(0, 0, size, size).data),
  };
}

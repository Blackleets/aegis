export function buildNavigationPuckImageData() {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.translate(64, 68);

  ctx.beginPath();
  ctx.moveTo(0, -50);
  ctx.lineTo(30, 32);
  ctx.quadraticCurveTo(0, 18, -30, 32);
  ctx.closePath();

  ctx.shadowColor = 'rgba(2, 8, 16, 0.62)';
  ctx.shadowBlur = 14;
  ctx.strokeStyle = '#031018';
  ctx.lineWidth = 11;
  ctx.stroke();

  ctx.shadowBlur = 0;
  ctx.fillStyle = '#7DE8EE';
  ctx.fill();
  ctx.strokeStyle = '#F7FCFF';
  ctx.lineWidth = 3.5;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(0, 8, 6, 0, Math.PI * 2);
  ctx.fillStyle = '#041018';
  ctx.fill();

  return {
    width: size,
    height: size,
    data: new Uint8Array(ctx.getImageData(0, 0, size, size).data),
  };
}

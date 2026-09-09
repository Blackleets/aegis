export function buildNavigationPuckImageData() {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.translate(64, 64);
  ctx.beginPath();
  ctx.moveTo(0, -46);
  ctx.lineTo(28, 34);
  ctx.lineTo(0, 18);
  ctx.lineTo(-28, 34);
  ctx.closePath();
  ctx.shadowColor = 'rgba(2, 8, 16, 0.55)';
  ctx.shadowBlur = 12;
  ctx.strokeStyle = '#041018';
  ctx.lineWidth = 10;
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#76E4EA';
  ctx.fill();
  ctx.strokeStyle = '#F5FBFF';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 6, 5.5, 0, Math.PI * 2);
  ctx.fillStyle = '#041018';
  ctx.fill();
  return {
    width: size,
    height: size,
    data: new Uint8Array(ctx.getImageData(0, 0, size, size).data),
  };
}

import bwipjs from 'bwip-js';
import QRCode from 'qrcode';

export async function generateCode128(value) {
  const png = await bwipjs.toBuffer({
    bcid: 'code128',
    text: String(value),
    scale: 3,
    height: 10,
    includetext: true,
    textxalign: 'center'
  });
  return png; // Buffer
}

export async function generateQr(value) {
  const dataUrl = await QRCode.toDataURL(String(value), { margin: 1, scale: 6 });
  const base64 = dataUrl.split(',')[1];
  return Buffer.from(base64, 'base64');
}


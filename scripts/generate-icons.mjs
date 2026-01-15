import sharp from 'sharp';
import { mkdir } from 'fs/promises';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ThinkFlow icon SVG - Lightbulb with thought bubble
const iconSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#3b82f6"/>
      <stop offset="100%" style="stop-color:#1d4ed8"/>
    </linearGradient>
  </defs>
  <!-- Background -->
  <rect width="512" height="512" rx="108" fill="url(#bg)"/>
  <!-- Lightbulb -->
  <g transform="translate(128, 80)">
    <!-- Bulb -->
    <path d="M128 0C75.4 0 32 43.4 32 96c0 35.7 19.6 66.8 48.6 83.3V208c0 8.8 7.2 16 16 16h62.8c8.8 0 16-7.2 16-16v-28.7C204.4 162.8 224 131.7 224 96 224 43.4 180.6 0 128 0z" fill="white"/>
    <!-- Filament lines -->
    <path d="M96 240h64v16c0 8.8-7.2 16-16 16h-32c-8.8 0-16-7.2-16-16v-16z" fill="white" opacity="0.9"/>
    <path d="M104 280h48v8c0 8.8-7.2 16-16 16h-16c-8.8 0-16-7.2-16-16v-8z" fill="white" opacity="0.8"/>
    <!-- Inner glow -->
    <ellipse cx="128" cy="100" rx="40" ry="50" fill="#fef08a" opacity="0.6"/>
  </g>
  <!-- Thought dots -->
  <circle cx="380" cy="120" r="24" fill="white" opacity="0.9"/>
  <circle cx="420" cy="180" r="16" fill="white" opacity="0.7"/>
  <circle cx="440" cy="240" r="10" fill="white" opacity="0.5"/>
</svg>
`;

async function generateIcons() {
  const sizes = [192, 512];
  const outputDir = `${__dirname}/../public/icons`;

  try {
    await mkdir(outputDir, { recursive: true });

    for (const size of sizes) {
      await sharp(Buffer.from(iconSvg))
        .resize(size, size)
        .png()
        .toFile(`${outputDir}/icon-${size}.png`);

      console.log(`Generated icon-${size}.png`);
    }

    // Also create apple-touch-icon
    await sharp(Buffer.from(iconSvg))
      .resize(180, 180)
      .png()
      .toFile(`${__dirname}/../public/apple-touch-icon.png`);

    console.log('Generated apple-touch-icon.png');

    // Create favicon
    await sharp(Buffer.from(iconSvg))
      .resize(32, 32)
      .png()
      .toFile(`${__dirname}/../public/favicon.png`);

    console.log('Generated favicon.png');

    console.log('All icons generated successfully!');
  } catch (error) {
    console.error('Error generating icons:', error);
    process.exit(1);
  }
}

generateIcons();

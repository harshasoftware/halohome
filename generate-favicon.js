// generate-favicon.js
import sharp from 'sharp';

async function generateFavicons() {
  // Use the existing 1024x1024 iOS icon as the source
  const sourceImage = 'public/images/ios/1024.png';

  console.log(`Using source image: ${sourceImage}`);

  try {
    // Generate 32x32 favicon
    await sharp(sourceImage)
      .resize(32, 32)
      .png()
      .toFile('public/favicon.png');
    console.log('Generated favicon.png (32x32)');

    // Generate 16x16 favicon
    await sharp(sourceImage)
      .resize(16, 16)
      .png()
      .toFile('public/favicon-16x16.png');
    console.log('Generated favicon-16x16.png');

    // Generate 192x192 favicon for PWA
    await sharp(sourceImage)
      .resize(192, 192)
      .png()
      .toFile('public/favicon-192x192.png');
    console.log('Generated favicon-192x192.png');

    // Generate 512x512 favicon for PWA
    await sharp(sourceImage)
      .resize(512, 512)
      .png()
      .toFile('public/favicon-512x512.png');
    console.log('Generated favicon-512x512.png');

    // Generate apple-touch-icon (180x180)
    await sharp(sourceImage)
      .resize(180, 180)
      .png()
      .toFile('public/apple-touch-icon.png');
    console.log('Generated apple-touch-icon.png (180x180)');

    // Generate SVG favicon from PNG
    await sharp(sourceImage)
      .resize(64, 64)
      .toFile('public/favicon.svg');
    console.log('Generated favicon.svg');

    // Generate Open Graph image for Instagram/Facebook (1200x1200 square)
    // Center the icon on a dark background
    const ogSize = 1200;
    const iconSize = 800;
    const ogBackground = sharp({
      create: {
        width: ogSize,
        height: ogSize,
        channels: 4,
        background: { r: 15, g: 23, b: 42, alpha: 1 } // #0f172a dark theme color
      }
    });
    const resizedIcon = await sharp(sourceImage)
      .resize(iconSize, iconSize)
      .toBuffer();
    await ogBackground
      .composite([{
        input: resizedIcon,
        left: Math.floor((ogSize - iconSize) / 2),
        top: Math.floor((ogSize - iconSize) / 2)
      }])
      .png()
      .toFile('public/og-image.png');
    console.log('Generated og-image.png (1200x1200)');

    // Generate Twitter card image (1200x630)
    const twitterWidth = 1200;
    const twitterHeight = 630;
    const twitterIconSize = 500;
    const twitterBackground = sharp({
      create: {
        width: twitterWidth,
        height: twitterHeight,
        channels: 4,
        background: { r: 15, g: 23, b: 42, alpha: 1 }
      }
    });
    const twitterIcon = await sharp(sourceImage)
      .resize(twitterIconSize, twitterIconSize)
      .toBuffer();
    await twitterBackground
      .composite([{
        input: twitterIcon,
        left: Math.floor((twitterWidth - twitterIconSize) / 2),
        top: Math.floor((twitterHeight - twitterIconSize) / 2)
      }])
      .png()
      .toFile('public/twitter-large.png');
    console.log('Generated twitter-large.png (1200x630)');

  } catch (error) {
    console.error('Error generating favicons:', error);
    process.exit(1);
  }

  console.log('Favicon generation complete!');
}

// Run the function
generateFavicons().catch(console.error);

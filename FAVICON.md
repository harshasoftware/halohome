# DiceBear Favicon Generation

This project uses a DiceBear bigSmile avatar as its favicon, generated using the `@dicebear/collection` npm library.

## Generated Files

The favicon generation script creates the following files in the `public/` directory:

- `favicon.svg` - SVG version (64x64, main favicon)
- `favicon.png` - PNG version (32x32, for legacy browser support)
- `favicon-16x16.png` - Small PNG version (16x16)
- `favicon-192x192.png` - Large PNG version (192x192, for web app manifests)

## How to Regenerate

To generate a new favicon with a different avatar:

```bash
# Using bun
bun run generate-favicon

# Or using Node directly
node generate-favicon.js
```

## Customization

Edit the `generate-favicon.js` file to customize:

- **seed**: Change the `seed` value to generate a different avatar
- **style**: Replace `bigSmile` with another DiceBear collection (e.g., `avataaars`, `bottts`, `personas`)
- **size**: Modify the `size` parameter for different dimensions
- **colors**: Add color options specific to the chosen style

## Available DiceBear Collections

Some popular collections include:
- `bigSmile` - Cute smiling faces
- `avataaars` - Sketch-style avatars
- `bottts` - Robot avatars
- `personas` - Modern avatar style
- `openPeeps` - Hand-drawn style
- `funEmoji` - Emoji-style avatars

## Browser Support

- **Modern browsers**: Use `favicon.svg` (vector, scalable)
- **Legacy browsers**: Fall back to `favicon.png` or `favicon-16x16.png`
- **Web app manifests**: Use `favicon-192x192.png`

The HTML includes all necessary `<link>` tags for comprehensive browser support.

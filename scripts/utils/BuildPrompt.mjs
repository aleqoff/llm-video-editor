const describeAssetsForPrompt = (assets) => {
  if (!assets.length) {
    return 'No user images were provided.';
  }

  return assets
    .map((asset) => {
      return `- assetId: "${asset.id}", type: "image", alt: "${asset.alt}"`;
    })
    .join('\n');
};

export const buildPrompt = ({ topic, assets = [] }) => `
You are a director for vertical SMM videos.
Create a video plan for the topic: "${topic}".

Return strictly valid JSON without markdown or explanations using this contract:
{
  "schemaVersion": 2,
  "videoConfig": {
    "width": 1080,
    "height": 1920,
    "fps": 30
  },
  "assets": [
    {
      "id": "user-photo-1",
      "type": "image",
      "src": "uploads/example.jpg",
      "alt": "Short image description"
    }
  ],
  "scenes": [
    {
      "type": "title",
      "text": "Short text for the scene",
      "duration": 90,
      "backgroundColor": "#1F1F1F",
      "textColor": "#FFFFFF",
      "align": "center",
      "media": {
        "assetId": "user-photo-1",
        "mode": "background",
        "overlayColor": "#000000",
        "overlayOpacity": 0.38
      }
    },
    {
      "type": "bullet-list",
      "title": "List title",
      "items": ["Point 1", "Point 2", "Point 3"],
      "duration": 120,
      "backgroundColor": "#101820",
      "textColor": "#FFFFFF",
      "accentColor": "#FFCC00",
      "align": "left",
      "media": {
        "assetId": "user-photo-1",
        "mode": "side",
        "position": "right",
        "overlayColor": "#000000",
        "overlayOpacity": 0.18
      }
    },
    {
      "type": "quote",
      "quote": "Strong emotional thesis",
      "author": "Source",
      "duration": 90,
      "backgroundColor": "#111827",
      "textColor": "#FFFFFF",
      "accentColor": "#F97316",
      "align": "center",
      "media": {
        "assetId": "user-photo-1",
        "mode": "frame",
        "position": "right",
        "overlayColor": "#000000",
        "overlayOpacity": 0.12
      }
    }
  ]
}

Available user assets:
${describeAssetsForPrompt(assets)}

Rules:
- At least 3 scenes.
- Use only "title", "bullet-list", "quote", "cta", "stat".
- At least one non-title scene is required.
- Duration must be an integer number of frames.
- Colors must be valid HEX.
- For bullet-list use 2 to 5 short items.
- Text must stay concise and suitable for a vertical video.
- Keep all assets from the input "assets" array unchanged in the output. Do not invent new asset ids or src values.
- Use scene.media only when it helps the composition.
- media.mode can only be "background", "frame", or "side".
- Use "position" only when media.mode is "side". For "background" and "frame", omit "position".
- If media.mode is "side", choose position "left" or "right" depending on where the image should appear.
- If user images are provided, use at least one of them in at least one scene.
- Use the actual image contents to decide where the image fits best.
- Prefer text overlay inside the same scene instead of creating a separate scene for the image.
`;

export default buildPrompt;

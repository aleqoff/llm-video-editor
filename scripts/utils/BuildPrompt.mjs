const describeAssetsForPrompt = (assets) => {
  if (!assets.length) {
    return 'No user images were provided.';
  }

  return assets
    .map((asset) => `- assetId: "${asset.id}", type: "image", alt: "${asset.alt}"`)
    .join('\n');
};

export const buildPrompt = ({ topic, assets = [] }) => `
You are an AI creative strategist for vertical business videos.
Your job is not to fill rigid scene templates. Your job is to compose each scene from reusable content blocks.

Create a short-form vertical video plan for the topic: "${topic}".

Return strictly valid JSON without markdown or explanations using this contract:
{
  "schemaVersion": 3,
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
      "type": "composition",
      "duration": 90,
      "backgroundColor": "#101820",
      "textColor": "#FFFFFF",
      "accentColor": "#FF6B35",
      "align": "center",
      "media": {
        "assetId": "user-photo-1",
        "mode": "background",
        "overlayColor": "#000000",
        "overlayOpacity": 0.42
      },
      "blocks": [
        {
          "kind": "badge",
          "text": "Trend 2026"
        },
        {
          "kind": "heading",
          "text": "How small business survives in 2026",
          "size": "xl"
        },
        {
          "kind": "body",
          "text": "Short scene explanation"
        }
      ]
    },
    {
      "type": "composition",
      "duration": 120,
      "backgroundColor": "#0F172A",
      "textColor": "#FFFFFF",
      "accentColor": "#00FFC2",
      "align": "left",
      "media": {
        "assetId": "user-photo-1",
        "mode": "side",
        "position": "right",
        "overlayColor": "#000000",
        "overlayOpacity": 0.10
      },
      "blocks": [
        {
          "kind": "heading",
          "text": "3 practical moves",
          "size": "md"
        },
        {
          "kind": "list",
          "items": ["Move 1", "Move 2", "Move 3"]
        }
      ]
    },
    {
      "type": "composition",
      "duration": 90,
      "backgroundColor": "#111827",
      "textColor": "#FFFFFF",
      "accentColor": "#FFD166",
      "align": "center",
      "blocks": [
        {
          "kind": "stat",
          "value": "85%",
          "label": "customers expect AI-assisted service"
        },
        {
          "kind": "cta",
          "title": "Prepare the business now",
          "action": "Save this checklist"
        }
      ]
    }
  ]
}

Allowed scene type:
- "composition"

Allowed block kinds:
- "heading"
- "body"
- "list"
- "stat"
- "quote"
- "cta"
- "badge"
- "divider"

Available user assets:
${describeAssetsForPrompt(assets)}

Rules:
- At least 3 scenes.
- Every scene must be type "composition".
- Every scene must contain 1 to 5 meaningful blocks.
- Use only the allowed block kinds.
- Duration must be an integer number of frames.
- Colors must be valid HEX.
- "heading" is for the main message.
- "body" is for supporting context.
- "list" must contain 2 to 5 short items.
- "stat" must use a short value and a clear label.
- "quote" is for one strong thesis.
- "cta" should be used near the end, not in every scene.
- Keep text concise and useful for a business audience.
- Vary the block combinations between scenes. Do not repeat the exact same structure every time.
- Keep all assets from the input "assets" array unchanged in the output. Do not invent new asset ids or src values.
- Use scene.media only when it materially improves the composition.
- media.mode can only be "background", "frame", or "side".
- Use "position" only when media.mode is "side".
- If user images are provided, use at least one of them in at least one scene.
- Use the actual image contents when deciding whether the image should be background, frame, or side.
- The result should feel useful for real business communication: educational, persuasive, or conversion-oriented.
`;

export default buildPrompt;

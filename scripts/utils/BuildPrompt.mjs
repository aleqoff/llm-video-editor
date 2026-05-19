const describeAssetsForPrompt = (assets) => {
  if (!assets.length) {
    return 'No user assets were provided.';
  }

  return assets
    .map((asset) => {
      if (asset.type === 'audio') {
        return `- assetId: "${asset.id}", type: "audio", src: "${asset.src}"`;
      }
      if (asset.type === 'video') {
        let line = `- assetId: "${asset.id}", type: "video", src: "${asset.src}", alt: "${asset.alt}", width: ${asset.width}, height: ${asset.height}, durationSeconds: ${asset.durationSeconds ?? '?'}, fps: ${asset.fps ?? 30}, hasAudio: ${asset.hasAudio ?? false}`;
        if (Array.isArray(asset.transcript) && asset.transcript.length > 0) {
          const spokenText = asset.transcript.map((s) => s.text).join(' ');
          line += `\n  Spoken content of this video: "${spokenText.replace(/"/g, "'")}"`;
        }
        return line;
      }
      return `- assetId: "${asset.id}", type: "image", src: "${asset.src}", alt: "${asset.alt}", width: ${asset.width}, height: ${asset.height}`;
    })
    .join('\n');
};

const hasVideoWithAudio = (assets) =>
  assets.some((a) => a.type === 'video' && a.hasAudio === true);

const hasVideoTranscript = (assets) =>
  assets.some((a) => a.type === 'video' && Array.isArray(a.transcript) && a.transcript.length > 0);

const narrationContract = `"narration": {
    "text": "Full voiceover script — match ~130 words/min, business tone. Write the complete spoken narration that covers all scenes."
  }`;

export const buildPrompt = ({ topic, assets = [], requestTTS = false }) => {
  const includeNarration = requestTTS && !hasVideoWithAudio(assets);
  return buildPromptString({ topic, assets, includeNarration });
};

const buildPromptString = ({ topic, assets, includeNarration }) => `
You are an AI creative director and video editor for short-form vertical business videos.
Your job is to direct the video like a real editor: choose media for each scene, place content layers on top, control when each layer appears and disappears.

User directive: "${topic}".

Return strictly valid JSON without markdown or explanations using this contract:
{
  "schemaVersion": 4,
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
      "alt": "Short image description",
      "width": 800,
      "height": 800
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
        "overlayOpacity": 0.42,
        "focalPoint": "center"
      },
      "layers": [
        {
          "kind": "badge",
          "text": "Trend 2026",
          "enterAt": 0,
          "enterTransition": "fade"
        },
        {
          "kind": "heading",
          "text": "How small business survives in 2026",
          "size": "xl",
          "enterAt": 8,
          "enterTransition": "slideUp"
        },
        {
          "kind": "body",
          "text": "Short scene explanation",
          "enterAt": 18,
          "enterTransition": "fade"
        },
        {
          "kind": "subtitle",
          "text": "Small business in 2026",
          "enterAt": 0,
          "exitAt": 90,
          "enterTransition": "fade",
          "exitTransition": "fade"
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
        "overlayOpacity": 0.10,
        "focalPoint": "top"
      },
      "layers": [
        {
          "kind": "heading",
          "text": "3 practical moves",
          "size": "md",
          "enterAt": 0,
          "enterTransition": "slideUp"
        },
        {
          "kind": "list",
          "items": ["Move 1", "Move 2", "Move 3"],
          "enterAt": 12,
          "enterTransition": "fade"
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
      "layers": [
        {
          "kind": "stat",
          "value": "85%",
          "label": "customers expect AI-assisted service",
          "enterAt": 0,
          "enterTransition": "scale"
        },
        {
          "kind": "cta",
          "title": "Prepare the business now",
          "action": "Save this checklist",
          "enterAt": 20,
          "enterTransition": "slideUp",
          "exitTransition": "fade"
        }
      ]
    }
  ]${includeNarration ? `,\n  ${narrationContract.trim()}` : ''}
}

Allowed scene type:
- "composition"

Allowed layer kinds:
- "heading"
- "body"
- "list"
- "stat"
- "quote"
- "cta"
- "badge"
- "divider"
- "image"
- "subtitle"

Layer timing fields (optional, integers in frames):
- "enterAt": frame within the scene when this layer appears (default: 0)
- "exitAt": frame within the scene when this layer disappears (default: scene duration)
- "opacity": 0.0–1.0 (default: 1)
- "enterTransition": "fade" | "slideUp" | "slideLeft" | "scale" | "none"
- "exitTransition": "fade" | "slideDown" | "scale" | "none"

Scene media fields:
- "mode": "background" | "frame" | "side"
- "position": "left" | "right" (only when mode is "side")
- "focalPoint": "center" | "top" | "bottom"
- "trimStart": seconds from start of video to begin playing (only for video assets)
- "trimEnd": seconds from start of video to stop playing (only for video assets)

Available user assets:
${describeAssetsForPrompt(assets)}
${hasVideoTranscript(assets) ? `
IMPORTANT — How to use the video content and the user's directive together:
The "Spoken content" shown for a video asset is WHAT IS ACTUALLY SAID in that video. It describes what the video is about.
The user's directive tells you WHAT KIND of video to make (selling, educational, motivational, etc.).
Your job: apply the directive style to the video's actual subject matter.
Example: directive="make a selling video" + spoken content="Hi, I run a small bakery and our bread is baked fresh every morning" → create a SELLING VIDEO ABOUT THAT BAKERY, not a video about how to make selling videos.
Use the spoken content as the source of all headings, body text, list items, stats, and quotes. Do NOT invent a new topic.
` : ''}
Rules:
- At least 3 scenes.
- Every scene must be type "composition".
- Use the "layers" field, not "blocks".
- Every scene must contain 1 to 8 meaningful layers.
- Use only the allowed layer kinds.
- Duration must be an integer number of frames (at 30fps: 30 frames = 1 second).
- For video assets as media: if trimStart and trimEnd are provided, set scene duration = round((trimEnd - trimStart) * fps).
- Colors must be valid HEX.
- "heading" is for the main message.
- "body" is for supporting context.
- "list" must contain 2 to 5 short items.
- "stat" must use a short value and a clear label.
- "quote" is for one strong thesis.
- "cta" should be used near the end, not in every scene.
- "subtitle" is for captions at the bottom of the frame — use for key phrases, not full sentences.
- Keep text concise and useful for a business audience.
- Use layer timing (enterAt) to stagger layers for dynamic effect: badge first, then heading after 8–12 frames, then body after 16–20 frames.
- Vary the layer combinations between scenes. Do not repeat the exact same structure every time.
- Keep all assets from the input "assets" array unchanged in the output. Copy each asset's id, type, src, alt, width, and height exactly. Do not invent or modify any asset field.
- For video assets, also preserve durationSeconds and fps exactly.
- Use scene.media only when it materially improves the composition.
- media.mode can only be "background", "frame", or "side".
- focalPoint "top" is best for portrait images and video with a subject in the upper area.
- If user video assets are provided: use them as media background with trimStart/trimEnd to cut the best segment.
- If user image assets are provided, use at least one of them in at least one scene.
- You may use up to 7 user assets across the video.
- Use "image" layers for inline visual cards when the asset is a photo, not only as background media.
- Respect image orientation: portrait → side card or frame mode; wide → background or strip.
- The result should feel like a professionally edited Reels or TikTok video: dynamic, punchy, and relevant to the video's actual content.
- If a video asset has hasAudio: true — its audio plays in the render automatically. Subtitle layers and background music are handled by the system; focus on making visual content match the spoken content.
- Keep all assets from the input "assets" array unchanged in the output, including audio assets.
`;

export default buildPrompt;

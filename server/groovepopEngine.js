// Standalone GROOVE POP Transformation Engine
// Direct Azure OpenAI Integration (groovepop-vision + gpt-image-2)

const DEFAULT_INSTRUCTION_SINGLE =
  "Write a brief poetic story (3-5 sentences) describing what is happening in this photo. Focus on: the subject's presence and energy, their outfit and accessories, the setting and atmosphere, and the mood or feeling of the moment. Write in present tense, third person. Be specific and sensory — describe what you see with evocative, grounded language. This story will guide an artistic transformation of the image, so capture the soul of the moment, not just the facts.";

const DEFAULT_INSTRUCTION_MULTIPLE =
  "Write a brief poetic story (3-5 sentences) describing what is happening in this photo. All subjects are of equal importance — identify them clearly and give each one genuine presence throughout. Focus on: the energy and dynamic between them, how they connect or contrast with each other, the way they share the space, the setting and atmosphere that frames them, and the mood of the moment. Write in present tense, third person. Be specific and sensory — describe what you see with evocative, grounded language. This story will guide an artistic transformation of the image, so capture the soul of what exists between them, not just the facts.";

const CLASSIFICATION_PROMPT =
  `Look at this image and respond with exactly one word — either SINGLE or MULTIPLE.

SINGLE: one clear primary subject. A person alone, an animal alone, one object. Background figures or crowds do not count.
MULTIPLE: two or more subjects of equal visual importance. A person with a pet, two people together, two animals together, a group where all members matter equally.

Respond with only the single word. Nothing else.`;

export function getAzureConfig() {
  const apiKey = process.env.GROOVEPOP_AZURE_OPENAI_KEY || process.env.AZURE_OPENAI_KEY;
  if (!apiKey) {
    throw new Error('Azure OpenAI key is not configured in environment (GROOVEPOP_AZURE_OPENAI_KEY or AZURE_OPENAI_KEY)');
  }
  const endpoint = process.env.GROOVEPOP_AZURE_OPENAI_ENDPOINT || 'https://green-mos1tune-eastus2.openai.azure.com';
  const captionDeployment = process.env.GROOVEPOP_AZURE_CAPTION_DEPLOYMENT || 'groovepop-vision';
  const imageDeployment = process.env.GROOVEPOP_AZURE_IMAGE_DEPLOYMENT || 'gpt-image-2';

  return {
    apiKey,
    endpoint: endpoint.replace(/\/$/, ''),
    captionDeployment,
    imageDeployment
  };
}


export function parseBase64Image(imageInput, defaultMime = 'image/jpeg') {
  if (!imageInput || typeof imageInput !== 'string') return null;

  const trimmed = imageInput.trim();
  let base64 = trimmed;
  let mimeType = defaultMime;

  if (trimmed.startsWith('data:')) {
    const matches = trimmed.match(/^data:([^;]+);base64,(.+)$/);
    if (matches) {
      mimeType = matches[1];
      base64 = matches[2];
    } else {
      const commaIdx = trimmed.indexOf(',');
      if (commaIdx !== -1) {
        base64 = trimmed.slice(commaIdx + 1);
      }
    }
  }

  try {
    const buffer = Buffer.from(base64, 'base64');
    return { base64, mimeType, buffer };
  } catch {
    return null;
  }
}

export function mapAspectRatio(ratio) {
  if (!ratio || typeof ratio !== 'string') return '1024x1024';

  const normalized = ratio.trim().toLowerCase();
  switch (normalized) {
    case '1:1':
    case 'square':
      return '1024x1024';
    case '2:3':
    case 'portrait':
      return '1024x1536';
    case '3:2':
    case 'landscape':
      return '1536x1024';
    case '9:16':
      return '1024x1792';
    case '16:9':
      return '1792x1024';
    case '4:3':
      return '1536x1024';
    case '3:4':
      return '1024x1536';
    default:
      if (normalized.includes('x')) return normalized;
      return '1024x1024';
  }
}

export function buildFullPrompt(caption, stylePrompt) {
  const cleanPrompt = (stylePrompt || '').trim();
  const cleanCaption = (caption || '').trim();

  if (!cleanCaption) return cleanPrompt;
  if (!cleanPrompt) return cleanCaption;

  return `${cleanCaption}\n\n---\n\n${cleanPrompt}`;
}

async function classifySubject(base64, mimeType, azureConfig) {
  const url = `${azureConfig.endpoint}/openai/deployments/${azureConfig.captionDeployment}/chat/completions?api-version=2025-03-01-preview`;

  const imageContent = {
    type: 'image_url',
    image_url: {
      url: `data:${mimeType || 'image/jpeg'};base64,${base64}`,
      detail: 'auto',
    },
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': azureConfig.apiKey,
    },
    body: JSON.stringify({
      max_tokens: 10,
      messages: [
        {
          role: 'user',
          content: [imageContent, { type: 'text', text: CLASSIFICATION_PROMPT }],
        },
      ],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    const err = new Error(`Vision classification failed (${response.status}): ${errText}`);
    err.status = response.status;
    throw err;
  }

  const data = await response.json();
  const rawText = data.choices?.[0]?.message?.content?.trim()?.toUpperCase() || 'SINGLE';
  return rawText.includes('MULTIPLE') ? 'multiple' : 'single';
}

async function generatePoeticCaption(base64, mimeType, subjectCount, azureConfig, customInstruction) {
  const url = `${azureConfig.endpoint}/openai/deployments/${azureConfig.captionDeployment}/chat/completions?api-version=2025-03-01-preview`;

  let promptText = customInstruction && customInstruction.trim()
    ? customInstruction.trim()
    : subjectCount === 'multiple'
    ? DEFAULT_INSTRUCTION_MULTIPLE
    : DEFAULT_INSTRUCTION_SINGLE;

  const imageContent = {
    type: 'image_url',
    image_url: {
      url: `data:${mimeType || 'image/jpeg'};base64,${base64}`,
      detail: 'auto',
    },
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': azureConfig.apiKey,
    },
    body: JSON.stringify({
      max_tokens: 300,
      messages: [
        {
          role: 'user',
          content: [imageContent, { type: 'text', text: promptText }],
        },
      ],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    const err = new Error(`Vision captioning failed (${response.status}): ${errText}`);
    err.status = response.status;
    throw err;
  }

  const data = await response.json();
  const caption = data.choices?.[0]?.message?.content?.trim() || '';
  if (!caption) throw new Error('Vision model returned an empty caption');
  return caption;
}

async function generateTransformedImage({
  imageBuffer,
  mimeType = 'image/jpeg',
  prompt,
  size = '1024x1024',
  quality = 'medium',
  azureConfig,
}) {
  const url = `${azureConfig.endpoint}/openai/deployments/${azureConfig.imageDeployment}/images/edits?api-version=2025-04-01-preview`;
  const ext = (mimeType || 'image/jpeg').split('/')[1] || 'jpg';

  const blob = new Blob([imageBuffer], { type: mimeType });
  const formData = new FormData();
  formData.append('image[]', blob, `photo.${ext}`);
  formData.append('prompt', prompt);
  formData.append('n', '1');
  formData.append('size', size);
  formData.append('quality', quality);
  formData.append('output_format', 'jpeg');
  formData.append('output_compression', '80');

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'api-key': azureConfig.apiKey,
    },
    body: formData,
  });

  if (!response.ok) {
    const errText = await response.text();
    const err = new Error(`Image edit failed (${response.status}): ${errText}`);
    err.status = response.status;
    throw err;
  }

  const data = await response.json();
  const b64 = data.data?.[0]?.b64_json;
  if (!b64) throw new Error('Azure image edits returned empty image data');
  return b64;
}

export async function executeEngineCaption({ image, captionInstruction }) {
  const parsed = parseBase64Image(image);
  if (!parsed || !parsed.base64) {
    throw new Error('Missing or invalid image base64 data');
  }

  const azureConfig = getAzureConfig();
  const subjectCount = await classifySubject(parsed.base64, parsed.mimeType, azureConfig);
  const caption = await generatePoeticCaption(parsed.base64, parsed.mimeType, subjectCount, azureConfig, captionInstruction);

  return {
    success: true,
    caption,
    subjectCount
  };
}

export async function executeEngineTransform({
  image,
  stylePrompt,
  styleLabel = '',
  aspectRatio = '1:1',
  captionInstruction
}) {
  const startTime = Date.now();
  const parsed = parseBase64Image(image);
  if (!parsed || !parsed.base64 || !parsed.buffer) {
    throw new Error('Missing or invalid image base64 data');
  }
  if (!stylePrompt || typeof stylePrompt !== 'string' || !stylePrompt.trim()) {
    throw new Error('Missing required stylePrompt string');
  }

  const azureConfig = getAzureConfig();

  // Phase 1: Two-call vision caption
  const subjectCount = await classifySubject(parsed.base64, parsed.mimeType, azureConfig);
  const caption = await generatePoeticCaption(parsed.base64, parsed.mimeType, subjectCount, azureConfig, captionInstruction);

  // Phase 2: Compose prompt and generate transformed image
  const fullPrompt = buildFullPrompt(caption, stylePrompt);
  const targetSize = mapAspectRatio(aspectRatio);

  const transformedImage = await generateTransformedImage({
    imageBuffer: parsed.buffer,
    mimeType: parsed.mimeType,
    prompt: fullPrompt,
    size: targetSize,
    quality: 'medium',
    azureConfig
  });

  const processingTimeMs = Date.now() - startTime;

  return {
    success: true,
    transformedImage,
    caption,
    processingTimeMs
  };
}

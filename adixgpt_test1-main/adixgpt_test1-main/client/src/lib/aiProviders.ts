export interface AIProvider {
  id: string;
  displayName: string;
  endpoint: string;
  apiKey: string;
  modelId: string;
  requestsPerMinute: number;
  isEditable: boolean;
  isDefault?: boolean;
  group?: string;
  tooltip?: string;
  tags?: string[];
}

const STORAGE_KEY = "chatbot-providers";
const SELECTED_PROVIDER_KEY = "chatbot-selected-provider";

export function getAIProviders(): AIProvider[] {
  try {
    const customProviders = getCustomProviders();
    const defaultOverrides = getDefaultOverrides();
    
    // Initialize default models with loaded API keys
    const initializedModels = initializeProvidersWithKeys();
    
    // Apply overrides to default models with updated rate limits
    const defaultModels = initializedModels.map(model => {
      const overridden = defaultOverrides[model.id] ? {...defaultOverrides[model.id], apiKey: model.apiKey} : model;
      // Ensure all models have the updated rate limit of 50
      return { ...overridden, requestsPerMinute: 50 };
    });
    
    // Merge default models with custom providers
    const allProviders = [...defaultModels, ...customProviders];
    
    // Deduplicate providers by ID to prevent React key errors
    const uniqueProviders = allProviders.reduce((acc, provider) => {
      if (!acc.find(p => p.id === provider.id)) {
        acc.push(provider);
      }
      return acc;
    }, [] as AIProvider[]);
    
    return uniqueProviders;
  } catch {
    return initializeProvidersWithKeys();
  }
}

export function saveAIProvider(provider: AIProvider): void {
  const customProviders = getCustomProviders();
  const existingIndex = customProviders.findIndex(p => p.id === provider.id);
  
  if (provider.isDefault) {
    // Save default model modifications separately
    const defaultOverrides = getDefaultOverrides();
    defaultOverrides[provider.id] = provider;
    localStorage.setItem("chatbot-default-overrides", JSON.stringify(defaultOverrides));
  } else {
    // Handle custom providers
    if (existingIndex >= 0) {
      customProviders[existingIndex] = provider;
    } else {
      customProviders.push(provider);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(customProviders));
  }
}

function getCustomProviders(): AIProvider[] {
  try {
    const providers = localStorage.getItem(STORAGE_KEY);
    return providers ? JSON.parse(providers) : [];
  } catch {
    return [];
  }
}

function getDefaultOverrides(): Record<string, AIProvider> {
  try {
    const overrides = localStorage.getItem("chatbot-default-overrides");
    return overrides ? JSON.parse(overrides) : {};
  } catch {
    return {};
  }
}

export function removeAIProvider(providerId: string): void {
  const providers = getAIProviders().filter(p => p.id !== providerId);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(providers));
  
  // If this was the selected provider, clear the selection
  const selectedProvider = getSelectedProvider();
  if (selectedProvider?.id === providerId) {
    localStorage.removeItem(SELECTED_PROVIDER_KEY);
  }
}

export function getSelectedProvider(): AIProvider | null {
  try {
    const selectedId = localStorage.getItem(SELECTED_PROVIDER_KEY);
    if (!selectedId) return null;
    
    const providers = getAIProviders();
    return providers.find(p => p.id === selectedId) || null;
  } catch {
    return null;
  }
}

export function setSelectedProvider(providerId: string): void {
  localStorage.setItem(SELECTED_PROVIDER_KEY, providerId);
}

// Default AI Model configurations - Free Gemini and Mistral models
export const DEFAULT_GITHUB_MODELS: AIProvider[] = [
  // Google Gemini Models - Free tier models
  {
    id: "gemini-1.5-flash",
    displayName: "Gemini 1.5 Flash",
    endpoint: "https://generativelanguage.googleapis.com/v1beta",
    apiKey: "", // Will be loaded from environment variables
    modelId: "gemini-1.5-flash",
    requestsPerMinute: 50,
    isEditable: false,
    isDefault: true,
    group: "Gemini",
    tooltip: "Fastest, optimized for chatbot use - Low cost",
  },
  {
    id: "gemini-1.5-pro",
    displayName: "Gemini 1.5 Pro",
    endpoint: "https://generativelanguage.googleapis.com/v1beta",
    apiKey: "",
    modelId: "gemini-1.5-pro",
    requestsPerMinute: 50,
    isEditable: false,
    isDefault: true,
    group: "Gemini",
    tooltip: "Most capable model with 1M token context window",
  },
  {
    id: "gemini-2.0-flash",
    displayName: "Gemini 2.0 Flash",
    endpoint: "https://generativelanguage.googleapis.com/v1beta",
    apiKey: "",
    modelId: "gemini-2.0-flash",
    requestsPerMinute: 50,
    isEditable: false,
    isDefault: true,
    group: "Gemini",
    tooltip: "Latest multimodal model with next-gen features",
  },
  {
    id: "gemini-2.5-flash",
    displayName: "Gemini 2.5 Flash",
    endpoint: "https://generativelanguage.googleapis.com/v1beta",
    apiKey: "",
    modelId: "gemini-2.5-flash",
    requestsPerMinute: 50,
    isEditable: false,
    isDefault: true,
    group: "Gemini",
    tooltip: "Best price-performance model with well-rounded capabilities",
  },
  {
    id: "gemini-2.5-pro",
    displayName: "Gemini 2.5 Pro",
    endpoint: "https://generativelanguage.googleapis.com/v1beta",
    apiKey: "",
    modelId: "gemini-2.5-pro",
    requestsPerMinute: 50,
    isEditable: false,
    isDefault: true,
    group: "Gemini",
    tooltip: "State-of-the-art thinking model with 1M token context window",
  },
  // Mistral Models
  {
    id: "mistral-small-latest",
    displayName: "Mistral Small Latest",
    endpoint: "https://api.mistral.ai/v1",
    apiKey: "", // Will be loaded from environment variables
    modelId: "mistral-small-latest",
    requestsPerMinute: 50,
    isEditable: false,
    isDefault: true,
    group: "Mistral",
    tooltip: "General-purpose tasks, chatbots, summarization - Fast & affordable",
  },
  {
    id: "pixtral-12b-2409",
    displayName: "Pixtral 12B",
    endpoint: "https://api.mistral.ai/v1",
    apiKey: "", // Will be loaded from environment variables
    modelId: "pixtral-12b-2409",
    requestsPerMinute: 50,
    isEditable: false,
    isDefault: true,
    group: "Mistral",
    tooltip: "Text + image understanding, captioning, visual Q&A - Multimodal",
  },
  {
    id: "open-mistral-nemo",
    displayName: "Open Mistral Nemo",
    endpoint: "https://api.mistral.ai/v1",
    apiKey: "", // Will be loaded from environment variables
    modelId: "open-mistral-nemo",
    requestsPerMinute: 50,
    isEditable: false,
    isDefault: true,
    group: "Mistral",
    tooltip: "Multilingual tasks, translation, cross-language chat - Language focused",
  },
  {
    id: "open-codestral-mamba",
    displayName: "Open Codestral Mamba",
    endpoint: "https://api.mistral.ai/v1",
    apiKey: "", // Will be loaded from environment variables
    modelId: "open-codestral-mamba",
    requestsPerMinute: 50,
    isEditable: false,
    isDefault: true,
    group: "Mistral",
    tooltip: "Coding assistant, code completion, programming tasks - Best for coding",
    tags: ["coding"],
  },
  {
    id: "mathstral-7b",
    displayName: "Mathstral 7B",
    endpoint: "https://api.mistral.ai/v1",
    apiKey: "", // Will be loaded from environment variables
    modelId: "mathstral-7b",
    requestsPerMinute: 50,
    isEditable: false,
    isDefault: true,
    group: "Mistral",
    tooltip: "Math & STEM reasoning - Study and mathematics focused",
    tags: ["study", "maths"],
  },
  {
    id: "mistral-7b-instruct",
    displayName: "Mistral 7B Instruct",
    endpoint: "https://api.mistral.ai/v1",
    apiKey: "",
    modelId: "open-mistral-7b",
    requestsPerMinute: 50,
    isEditable: false,
    isDefault: true,
    group: "Mistral",
    tooltip: "Most powerful 7B model, great for basic tasks",
  },
  {
    id: "mixtral-8x7b-instruct",
    displayName: "Mixtral 8x7B Instruct",
    endpoint: "https://api.mistral.ai/v1",
    apiKey: "",
    modelId: "open-mixtral-8x7b",
    requestsPerMinute: 50,
    isEditable: false,
    isDefault: true,
    group: "Mistral",
    tooltip: "Outperforms Llama 2 70B, 6x faster inference - Apache 2.0",
  },
  {
    id: "mistral-small-3.1",
    displayName: "Mistral Small 3.1",
    endpoint: "https://api.mistral.ai/v1",
    apiKey: "",
    modelId: "ministral-3b-latest",
    requestsPerMinute: 50,
    isEditable: false,
    isDefault: true,
    group: "Mistral",
    tooltip: "Multimodal model with 128k context, fast inference",
  },
];

// Global variable to store loaded API keys
let loadedApiKeys = { gemini: "", mistral: "", github: "" };
let keysLoaded = false;

// Function to load API keys from secure backend endpoint
export async function loadApiKeys(): Promise<void> {
  if (keysLoaded) return;
  
  try {
    const response = await fetch('/api/config/keys');
    if (response.ok) {
      loadedApiKeys = await response.json();
      keysLoaded = true;
    }
  } catch (error) {
    console.error('Failed to load API keys from server:', error);
  }
}

// Function to initialize providers with loaded API keys
export function initializeProvidersWithKeys(): AIProvider[] {
  return DEFAULT_GITHUB_MODELS.map(provider => ({
    ...provider,
    apiKey: provider.group === "Gemini" 
      ? loadedApiKeys.gemini || ""
      : loadedApiKeys.mistral || ""
  }));
}

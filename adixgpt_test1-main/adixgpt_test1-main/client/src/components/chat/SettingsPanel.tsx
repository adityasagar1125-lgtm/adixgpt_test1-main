import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { X, Brain, Download, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { getAIProviders, saveAIProvider, removeAIProvider, type AIProvider } from "@/lib/aiProviders";

interface ProviderEditFormProps {
  provider: AIProvider;
  onSave: (provider: AIProvider) => void;
  onCancel: () => void;
}

function ProviderEditForm({ provider, onSave, onCancel }: ProviderEditFormProps) {
  const [formData, setFormData] = useState(provider);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="space-y-2">
        <Label className="text-xs font-medium text-foreground">Display Name</Label>
        <Input
          value={formData.displayName}
          onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
          className="glass-input h-8 text-xs"
          required
        />
      </div>
      <div className="space-y-2">
        <Label className="text-xs font-medium text-foreground">Endpoint</Label>
        <Input
          value={formData.endpoint}
          onChange={(e) => setFormData({ ...formData, endpoint: e.target.value })}
          className="glass-input h-8 text-xs"
          required
        />
      </div>
      <div className="space-y-2">
        <Label className="text-xs font-medium text-foreground">Model ID</Label>
        <Input
          value={formData.modelId}
          onChange={(e) => setFormData({ ...formData, modelId: e.target.value })}
          className="glass-input h-8 text-xs"
          required
        />
      </div>
      <div className="space-y-2">
        <Label className="text-xs font-medium text-foreground">API Key</Label>
        <Input
          type="password"
          value={formData.apiKey}
          onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
          className="glass-input h-8 text-xs"
          placeholder="Enter API key (leave empty for GitHub Models)"
        />
      </div>
      <div className="space-y-2">
        <Label className="text-xs font-medium text-foreground">Rate Limit (req/min)</Label>
        <Input
          type="number"
          value={formData.requestsPerMinute}
          onChange={(e) => setFormData({ ...formData, requestsPerMinute: parseInt(e.target.value) || 1 })}
          className="glass-input h-8 text-xs"
          min="1"
          max="1000"
          required
        />
      </div>
      <div className="flex space-x-2 pt-2">
        <Button type="submit" size="sm" className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600">
          Save
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SettingsPanel({ isOpen, onClose }: SettingsPanelProps) {
  const [providers, setProviders] = useState<AIProvider[]>([]);
  const [selectedModel, setSelectedModel] = useState('gemini-1.5-pro');
  const [editingProvider, setEditingProvider] = useState<AIProvider | null>(null);
  const [newProvider, setNewProvider] = useState({
    displayName: "",
    endpoint: "",
    apiKey: "",
    modelId: "",
    requestsPerMinute: 60,
  });
  const [settings, setSettings] = useState({
    darkMode: true,
    autoSave: true,
    soundEffects: false,
  });
  const { toast } = useToast();
  
  



  useEffect(() => {
    setProviders(getAIProviders());
    
    // Load settings from localStorage
    const savedSettings = localStorage.getItem("chatbot-settings");
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings));
    }
    
    // Load selected model
    const savedModel = localStorage.getItem("chatbot-selected-model");
    if (savedModel) {
      setSelectedModel(savedModel);
    }
  }, [isOpen]);

  const handleAddProvider = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newProvider.displayName || !newProvider.endpoint || !newProvider.apiKey || !newProvider.modelId) {
      toast({
        title: "Missing fields",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    const provider: AIProvider = {
      id: Date.now().toString(),
      ...newProvider,
      isEditable: true,
      isDefault: false,
    };

    saveAIProvider(provider);
    setProviders(getAIProviders());
    setNewProvider({
      displayName: "",
      endpoint: "",
      apiKey: "",
      modelId: "",
      requestsPerMinute: 60,
    });

    toast({
      title: "Provider added",
      description: `${provider.displayName} has been configured`,
    });
  };

  const handleEditProvider = (provider: AIProvider) => {
    setEditingProvider(provider);
  };

  const handleSaveProvider = (updatedProvider: AIProvider) => {
    saveAIProvider(updatedProvider);
    setProviders(getAIProviders());
    setEditingProvider(null);
    
    toast({
      title: "Provider updated",
      description: `${updatedProvider.displayName} has been updated`,
    });
  };

  const handleRemoveProvider = (providerId: string) => {
    removeAIProvider(providerId);
    setProviders(getAIProviders());
    toast({
      title: "Provider removed",
    });
  };

  const handleModelSelect = (provider: AIProvider) => {
    setSelectedModel(provider.modelId);
    localStorage.setItem("chatbot-selected-model", provider.modelId);
    localStorage.setItem("chatbot-selected-provider", provider.id);
    toast({
      title: "Model updated",
      description: `Switched to ${provider.displayName}`,
    });
  };

  const handleSettingChange = (key: string, value: boolean) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    localStorage.setItem("chatbot-settings", JSON.stringify(newSettings));
  };

  const handleExportData = () => {
    const chats = JSON.parse(localStorage.getItem("chatbot-chats") || "[]");
    const dataStr = JSON.stringify({ chats, providers, settings }, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `chatbot-export-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
    
    toast({
      title: "Data exported",
      description: "Your chat data has been downloaded",
    });
  };

  const handleClearData = () => {
    if (confirm("Are you sure you want to clear all data? This cannot be undone.")) {
      localStorage.removeItem("chatbot-chats");
      localStorage.removeItem("chatbot-providers");
      localStorage.removeItem("chatbot-settings");
      setProviders([]);
      toast({
        title: "Data cleared",
        description: "All chat data has been removed",
      });
    }
  };

  return (
    <div className={cn("fixed inset-0 z-50", !isOpen && "hidden")} data-testid="settings-panel">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-background/80 backdrop-blur-sm" 
        onClick={onClose}
        data-testid="settings-backdrop"
      />
      
      {/* Settings Panel */}
      <div className="absolute right-0 top-0 h-full w-full max-w-md glass-card border-l border-border animate-slide-in">
        <div className="flex flex-col h-full">
          {/* Settings Header */}
          <div className="flex items-center justify-between p-6 border-b border-border">
            <h2 className="text-xl font-semibold text-foreground">Settings</h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="hover:bg-accent/20"
              data-testid="button-close-settings"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </Button>
          </div>

          {/* Settings Content */}
          <div className="flex-1 overflow-y-auto scrollbar-thin p-6">
            <Tabs defaultValue="providers" className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-6">
                <TabsTrigger value="providers">AI Providers</TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
              </TabsList>
              
              <TabsContent value="providers" className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-foreground mb-4">AI Providers</h3>
                  
                  {/* All Providers (Default + Custom) */}
                  <div className="space-y-3 mb-4">
                    {providers.map((provider) => (
                      <div key={provider.id} className="glass-card p-4 rounded-2xl border border-border">
                        {editingProvider?.id === provider.id ? (
                          <ProviderEditForm 
                            provider={editingProvider}
                            onSave={handleSaveProvider}
                            onCancel={() => setEditingProvider(null)}
                          />
                        ) : (
                          <>
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center space-x-3">
                                <div className={cn(
                                  "w-8 h-8 rounded-full flex items-center justify-center",
                                  provider.isDefault ? "bg-primary" : "bg-accent"
                                )}>
                                  <Brain className={cn(
                                    "h-4 w-4",
                                    provider.isDefault ? "text-primary-foreground" : "text-accent-foreground"
                                  )} />
                                </div>
                                <div>
                                  <h4 className="font-medium text-foreground">
                                    {provider.displayName}
                                    {provider.isDefault && <span className="ml-2 text-xs bg-primary/20 text-primary px-2 py-1 rounded">Default</span>}
                                  </h4>
                                  <p className="text-xs text-muted-foreground">{provider.endpoint}</p>
                                </div>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleModelSelect(provider)}
                                  className="text-xs h-6 px-2 hover:bg-accent/20"
                                  data-testid={`button-select-provider-${provider.id}`}
                                >
                                  {provider.modelId === selectedModel ? 'Active' : 'Select'}
                                </Button>
                                {!provider.isDefault && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleEditProvider(provider)}
                                    className="text-xs h-6 px-2 hover:bg-accent/20"
                                    data-testid={`button-edit-provider-${provider.id}`}
                                  >
                                    Edit
                                  </Button>
                                )}
                                {!provider.isDefault && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleRemoveProvider(provider.id)}
                                    className="h-6 w-6 hover:bg-destructive/20 text-destructive"
                                    data-testid={`button-remove-provider-${provider.id}`}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>
                            </div>
                            <div className="text-xs text-muted-foreground space-y-1">
                              <p>Rate limit: <span className="text-accent">{provider.requestsPerMinute} req/min</span></p>
                              <p>Model: <span className="text-accent">{provider.modelId}</span></p>
                              {provider.tooltip && (
                                <p>Description: <span className="text-accent">{provider.tooltip}</span></p>
                              )}
                              {provider.tags && provider.tags.length > 0 && (
                                <p>Tags: 
                                  {provider.tags.map((tag, index) => (
                                    <span key={`${provider.id}-${tag}-${index}`} className="ml-1 bg-accent/20 text-accent px-1 py-0.5 rounded text-xs">
                                      {tag}
                                    </span>
                                  ))}
                                </p>
                              )}
                              {provider.modelId === selectedModel && (
                                <div className="flex items-center space-x-2 mt-2">
                                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                                  <span className="text-green-400 text-xs">Currently Active</span>
                                </div>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Add New Provider Form */}
                  <div className="glass-card p-4 rounded-2xl border border-border">
                    <h4 className="font-medium text-foreground mb-3">Add AI Provider</h4>
                    <form onSubmit={handleAddProvider} className="space-y-4">
                      <div>
                        <Label className="text-sm font-medium text-foreground">Display Name</Label>
                        <Input
                          type="text"
                          value={newProvider.displayName}
                          onChange={(e) => setNewProvider({ ...newProvider, displayName: e.target.value })}
                          placeholder="My Custom AI"
                          className="glass-input rounded-xl mt-1"
                          data-testid="input-provider-name"
                        />
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-foreground">API Endpoint</Label>
                        <Input
                          type="url"
                          value={newProvider.endpoint}
                          onChange={(e) => setNewProvider({ ...newProvider, endpoint: e.target.value })}
                          placeholder="https://api.example.com"
                          className="glass-input rounded-xl mt-1"
                          data-testid="input-provider-endpoint"
                        />
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-foreground">API Key</Label>
                        <Input
                          type="password"
                          value={newProvider.apiKey}
                          onChange={(e) => setNewProvider({ ...newProvider, apiKey: e.target.value })}
                          placeholder="sk-..."
                          className="glass-input rounded-xl mt-1"
                          data-testid="input-provider-api-key"
                        />
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-foreground">Model ID</Label>
                        <Input
                          type="text"
                          value={newProvider.modelId}
                          onChange={(e) => setNewProvider({ ...newProvider, modelId: e.target.value })}
                          placeholder="gpt-4"
                          className="glass-input rounded-xl mt-1"
                          data-testid="input-provider-model"
                        />
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-foreground">Rate Limit (req/min)</Label>
                        <Input
                          type="number"
                          value={newProvider.requestsPerMinute}
                          onChange={(e) => setNewProvider({ ...newProvider, requestsPerMinute: parseInt(e.target.value) || 60 })}
                          placeholder="60"
                          min="1"
                          max="1000"
                          className="glass-input rounded-xl mt-1"
                          data-testid="input-provider-rate-limit"
                        />
                      </div>
                      <Button
                        type="submit"
                        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-medium"
                        data-testid="button-add-provider"
                      >
                        Add Provider
                      </Button>
                    </form>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="settings" className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-foreground mb-4">General</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-foreground">Dark Mode</p>
                        <p className="text-sm text-muted-foreground">Toggle dark theme</p>
                      </div>
                      <Switch
                        checked={settings.darkMode}
                        onCheckedChange={(checked) => handleSettingChange("darkMode", checked)}
                        data-testid="switch-dark-mode"
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-foreground">Auto-save Chats</p>
                        <p className="text-sm text-muted-foreground">Automatically save conversations</p>
                      </div>
                      <Switch
                        checked={settings.autoSave}
                        onCheckedChange={(checked) => handleSettingChange("autoSave", checked)}
                        data-testid="switch-auto-save"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-foreground">Sound Effects</p>
                        <p className="text-sm text-muted-foreground">Play sound on message received</p>
                      </div>
                      <Switch
                        checked={settings.soundEffects}
                        onCheckedChange={(checked) => handleSettingChange("soundEffects", checked)}
                        data-testid="switch-sound-effects"
                      />
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-medium text-foreground mb-4">Data</h3>
                  <div className="space-y-3">
                    <Button
                      variant="ghost"
                      onClick={handleExportData}
                      className="w-full glass-card p-3 rounded-xl justify-start hover:bg-accent/10"
                      data-testid="button-export-data"
                    >
                      <Download className="h-4 w-4 text-accent mr-3" />
                      <div className="text-left">
                        <p className="font-medium text-foreground">Export Chats</p>
                        <p className="text-sm text-muted-foreground">Download your conversation history</p>
                      </div>
                    </Button>
                    
                    <Button
                      variant="ghost"
                      onClick={handleClearData}
                      className="w-full glass-card p-3 rounded-xl justify-start hover:bg-destructive/10"
                      data-testid="button-clear-data"
                    >
                      <Trash2 className="h-4 w-4 text-destructive mr-3" />
                      <div className="text-left">
                        <p className="font-medium text-foreground">Clear All Data</p>
                        <p className="text-sm text-muted-foreground">Delete all chats and settings</p>
                      </div>
                    </Button>
                  </div>
                </div>
              </TabsContent>
              
            </Tabs>
          </div>

          {/* Settings Footer */}
          <div className="p-6 border-t border-border">
            <div className="text-center text-sm text-muted-foreground">
              <p>AI Chatbot v5.2.3</p>
              <p className="mt-1">'-'_@ 𝓓𝓮𝓿𝓮𝓵𝓸𝓹𝓮𝓭 𝓫𝔂 𝓐𝓓𝓘𝓣𝓨𝓐 𝓢𝓐𝓖𝓐𝓡 @_'-' </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

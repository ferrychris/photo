// src/pages/CollageEditorPage.tsx - UPDATED: Left-side settings panel with improved styling
import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ChevronLeft, Settings, Image, Shield, Video, Pencil, Camera } from 'lucide-react';
import { useCollageStore } from '../store/collageStore';
import { useSceneStore } from '../store/sceneStore';
import { ErrorBoundary } from 'react-error-boundary';
import DashboardLayout from '../components/layout/DashboardLayout';
import SceneSettings from '../components/collage/SceneSettings';
import CollageScene from '../components/three/CollageScene';
import PhotoUploader from '../components/collage/PhotoUploader';
import CollagePhotos from '../components/collage/CollagePhotos';
import RealtimeDebugPanel from '../components/debug/RealtimeDebugPanel';
import MobileVideoRecorder from '../components/video/MobileVideoRecorder';

type Tab = 'settings' | 'photos';

// Error fallback component for 3D scene errors
function SceneErrorFallback({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) {
  return (
    <div className="bg-red-900/30 backdrop-blur-sm rounded-lg border border-gray-500/50 p-6 flex flex-col items-center justify-center h-[calc(100vh-240px)]">
      <h3 className="text-xl font-bold text-white mb-2">Something went wrong rendering the scene</h3>
      <p className="text-red-200 mb-4 text-center max-w-md">
        There was an error loading the 3D scene. This could be due to WebGL issues or resource limitations.
      </p>
      <pre className="bg-black/50 p-3 rounded text-red-300 text-xs max-w-full overflow-auto mb-4 max-h-32">
        {error.message}
      </pre>
      <button
        onClick={resetErrorBoundary}
        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors"
      >
        Try Again
      </button>
      <p className="mt-4 text-gray-400 text-sm">
        Tip: Try reducing the photo count in settings if the issue persists.
      </p>
    </div>
  );
}

const CollageEditorPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { 
    currentCollage, 
    photos, 
    fetchCollageById, 
    updateCollageSettings, 
    updateCollageName,
    loading, 
    error, 
    setupRealtimeSubscription, 
    cleanupRealtimeSubscription,
    isRealtimeConnected,
    refreshPhotos
  } = useCollageStore();
  const { settings, updateSettings } = useSceneStore();
  
  const [activeTab, setActiveTab] = useState<Tab>('settings');
  const [showVideoRecorder, setShowVideoRecorder] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editingTitleValue, setEditingTitleValue] = useState('');
  const [isSavingTitle, setIsSavingTitle] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout>();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [recordingResolution, setRecordingResolution] = useState({ width: 1920, height: 1080 });

  // SAFETY: Ensure photos is always an array
  const safePhotos = Array.isArray(photos) ? photos : [];

  // DEBUG: Log settings comparison
  useEffect(() => {
    console.log('🎨 EDITOR: Settings comparison:');
    console.log('🎨 Scene store settings (temp):', settings);
    console.log('🎨 Collage settings (persisted):', currentCollage?.settings);
    console.log('🎨 Using settings:', currentCollage?.settings || settings);
  }, [settings, currentCollage?.settings]);

  // Load collage data and sync settings
  useEffect(() => {
    if (id) {
      console.log('🎨 EDITOR: Loading collage:', id);
      fetchCollageById(id);
      setupRealtimeSubscription(id);
    }

    return () => {
      console.log('🎨 EDITOR: Cleaning up subscription');
      cleanupRealtimeSubscription();
    };
  }, [id, fetchCollageById, setupRealtimeSubscription, cleanupRealtimeSubscription]);

  // Sync persisted collage settings to scene store when collage loads
  useEffect(() => {
    if (currentCollage?.settings) {
      console.log('🎨 EDITOR: Syncing collage settings to scene store:', currentCollage.settings);
      updateSettings(currentCollage.settings);
      setEditingTitleValue(currentCollage.name);
    }
  }, [currentCollage?.settings, updateSettings]);

  // Auto-save settings with debounce
  const handleSettingsChange = (newSettings: Partial<any>) => {
    updateSettings(newSettings);
    
    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    // Set new timeout for auto-save
    setSaving(true);
    saveTimeoutRef.current = setTimeout(async () => {
      if (currentCollage?.id) {
        try {
          await updateCollageSettings(currentCollage.id, newSettings);
          console.log('✅ Settings auto-saved successfully');
        } catch (error) {
          console.error('❌ Failed to save settings:', error);
        } finally {
          setSaving(false);
        }
      }
    }, 1000); // 1 second debounce
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // Handle title editing
  const handleTitleEdit = () => {
    if (!currentCollage) return;
    setEditingTitleValue(currentCollage.name);
    setIsEditingTitle(true);
  };

  const handleTitleSave = async () => {
    if (!currentCollage || isSavingTitle) return;
    
    const newName = editingTitleValue.trim();
    if (!newName || newName === currentCollage.name) {
      setIsEditingTitle(false);
      setEditingTitleValue(currentCollage.name);
      return;
    }

    setIsSavingTitle(true);
    try {
      await updateCollageName(currentCollage.id, newName);
      console.log('✅ Title updated successfully');
      setIsEditingTitle(false);
    } catch (error) {
      console.error('❌ Failed to update title:', error);
      // Revert to original name on error
      setEditingTitleValue(currentCollage.name);
      setIsEditingTitle(false);
      alert('Failed to update title. Please try again.');
    } finally {
      setIsSavingTitle(false);
    }
  };

  // Manual refresh function for when realtime fails
  const handleManualRefresh = async () => {
    if (currentCollage?.id) {
      console.log('🔄 EDITOR: Manual refresh triggered');
      await refreshPhotos(currentCollage.id);
    }
  };

  // Reset settings to defaults
  const handleResetSettings = () => {
    if (!currentCollage) return;
    
    const defaultSettings = {
      animationPattern: 'grid' as const,
      animationSpeed: 50,
      animationEnabled: true,
      photoCount: 50,
      backgroundColor: '#000000',
      backgroundGradient: false,
      backgroundGradientStart: '#000000',
      backgroundGradientEnd: '#1a1a1a',
      backgroundGradientAngle: 180,
      emptySlotColor: '#1A1A1A',
      cameraDistance: 25,
      cameraRotationEnabled: true,
      cameraRotationSpeed: 0.2,
      cameraHeight: 10,
      cameraEnabled: true,
      spotlightCount: 4,
      spotlightHeight: 30,
      spotlightDistance: 40,
      spotlightAngle: Math.PI / 6,
      spotlightIntensity: 2,
      spotlightColor: '#ffffff',
      ambientLightIntensity: 0.4,
      ambientLightColor: '#404040',
      floorEnabled: true,
      floorSize: 200,
      floorColor: '#1A1A1A',
      floorOpacity: 1,
      floorMetalness: 0.5,
      floorRoughness: 0.5,
      gridEnabled: false,
      gridSize: 100,
      gridDivisions: 20,
      gridColor: '#404040',
      gridOpacity: 0.5,
      photoSize: 4.0,
      photoBrightness: 1.0,
      photoSpacing: 1.2,
      photoRotation: false,
      photoTilt: 0,
      photoDepth: 0.1,
      shadowsEnabled: true,
      shadowQuality: 'medium' as const,
      fogEnabled: false,
      fogColor: '#000000',
      fogNear: 50,
      fogFar: 200,
      postProcessingEnabled: false,
      bloomEnabled: false,
      bloomStrength: 0.5,
      bloomRadius: 0.4,
      bloomThreshold: 0.9,
    };
    
    updateSettings(defaultSettings);
    handleSettingsChange(defaultSettings);
  };

  if (loading && !currentCollage) {
    return (
      <DashboardLayout>
        <div className="min-h-[calc(100vh-160px)] flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-600">Loading collage...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !currentCollage) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Collage Not Found</h2>
          <p className="text-gray-600 mb-6">
            The collage you're looking for doesn't exist or you don't have permission to edit it.
          </p>
          <Link
            to="/join"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Try Another Code
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-black">
        {/* Header */}
        <div className="bg-gray-900 border-b border-gray-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center space-x-4">
                <Link 
                  to="/join" 
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <ChevronLeft className="w-6 h-6" />
                </Link>
                <div>
                  {isEditingTitle ? (
                    <input
                      type="text"
                      value={editingTitleValue}
                      onChange={(e) => setEditingTitleValue(e.target.value)}
                      onBlur={handleTitleSave}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleTitleSave();
                        } else if (e.key === 'Escape') {
                          setIsEditingTitle(false);
                          setEditingTitleValue(currentCollage.name);
                        }
                      }}
                      className="text-xl font-bold text-white bg-transparent border-b-2 border-purple-500 focus:outline-none focus:border-blue-500 transition-colors"
                      autoFocus
                      maxLength={100}
                    />
                  ) : (
                    <h1 
                      className="text-xl font-bold text-white cursor-pointer hover:text-purple-300 transition-colors flex items-center group"
                      onClick={handleTitleEdit}
                      title="Click to edit title"
                    >
                      <span>{currentCollage.name}</span>
                      <Pencil className="w-4 h-4 ml-2 opacity-60 hover:opacity-100 transition-opacity" />
                    </h1>
                  )}
                  <div className="flex items-center space-x-2 text-gray-400 text-sm">
                    <span>Code: {currentCollage.code}</span>
                    <span>•</span>
                    <span>{safePhotos.length} photos</span>
                    <span>•</span>
                    <div className="flex items-center space-x-1">
                      <div className={`w-2 h-2 rounded-full ${isRealtimeConnected ? 'bg-green-400' : 'bg-yellow-400'}`}></div>
                      <span>{isRealtimeConnected ? 'Live' : 'Polling'}</span>
                    </div>
                    {saving && (
                      <>
                        <span>•</span>
                        <span className="text-blue-400">Saving...</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                <Link
                  to={`/collage/${currentCollage.code}`}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm transition-colors"
                >
                  View Live
                </Link>
                <button
                  onClick={() => setShowVideoRecorder(!showVideoRecorder)}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md text-sm transition-colors flex items-center space-x-2"
                >
                  <Video className="w-4 h-4" />
                  <span>Record</span>
                </button>
                <Link
                  to={`/dashboard/collage/${currentCollage.id}/photobooth-settings`}
                  className="relative px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md text-sm transition-colors flex items-center space-x-2"
                >
                  <Camera className="w-4 h-4" />
                  <span>Photobooth Settings</span>
                  {/* NEW badge */}
                  <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full leading-none">
                    NEW
                  </div>
                </Link>
                <Link
                  to={`/collage/${currentCollage.id}/moderation`}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md text-sm transition-colors flex items-center space-x-2"
                >
                  <Shield className="w-4 h-4" />
                  <span>Moderate</span>
                </Link>
                <Link
                  to={`/photobooth/${currentCollage.code}`}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md text-sm transition-colors"
                >
                  📸 Photobooth
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Layout */}
        <div className="flex h-[calc(100vh-64px)]">
          {/* LEFT SIDE - Compact Settings Panel */}
          <div className="w-80 bg-gray-900/95 backdrop-blur border-r border-gray-700/50 flex flex-col">
            {/* Compact Header */}
            <div className="p-4 border-b border-gray-700/50">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">Controls</h2>
                <div className="flex items-center space-x-1 text-xs">
                  <div className={`w-2 h-2 rounded-full ${isRealtimeConnected ? 'bg-green-400' : 'bg-yellow-400'}`}></div>
                  <span className="text-gray-400">{isRealtimeConnected ? 'Live' : 'Polling'}</span>
                </div>
              </div>
              
              {/* Compact Tab Buttons */}
              <div className="flex mt-3 space-x-1">
                <button
                  onClick={() => setActiveTab('settings')}
                  className={`flex-1 px-3 py-2 text-xs font-medium rounded transition-colors flex items-center justify-center space-x-1 ${
                    activeTab === 'settings'
                      ? 'bg-purple-600 text-white'
                      : 'text-gray-400 hover:text-white hover:bg-gray-700'
                  }`}
                >
                  <Settings className="w-3 h-3" />
                  <span>Settings</span>
                </button>
                <button
                  onClick={() => setActiveTab('photos')}
                  className={`flex-1 px-3 py-2 text-xs font-medium rounded transition-colors flex items-center justify-center space-x-1 ${
                    activeTab === 'photos'
                      ? 'bg-purple-600 text-white'
                      : 'text-gray-400 hover:text-white hover:bg-gray-700'
                  }`}
                >
                  <Image className="w-3 h-3" />
                  <span>Photos</span>
                </button>
              </div>
            </div>

            {/* Maximized Content Area */}
            <div className="flex-1 overflow-auto">
              {activeTab === 'settings' ? (
                <div className="p-4">
                  <SceneSettings
                    settings={settings}
                    onSettingsChange={handleSettingsChange}
                    onReset={handleResetSettings}
                  />
                </div>
              ) : (
                <div className="p-4 space-y-4">
                  <CollagePhotos 
                    collageId={currentCollage.id}
                    onManualRefresh={handleManualRefresh}
                  />
                </div>
              )}
            </div>

            {/* Compact Footer */}
            <div className="p-4 border-t border-gray-700/50 bg-gray-800/30">
              <div className="flex space-x-2">
                <Link
                  to={`/collage/${currentCollage.code}`}
                  className="flex-1 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white text-center rounded text-sm font-medium transition-colors"
                >
                  View Live
                </Link>
                <button
                  onClick={() => setShowVideoRecorder(!showVideoRecorder)}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md text-sm transition-colors flex items-center space-x-2"
                >
                  <Video className="w-4 h-4" />
                  <span>Record</span>
                </button>
                <Link
                  to={`/collage/${currentCollage.id}/moderation`}
                  className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors text-sm"
                >
                  <Shield className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>

          {/* RIGHT SIDE - Main 3D Scene */}
          <div className="flex-1 relative">
            <div className="bg-gray-900/30 backdrop-blur-sm border border-gray-700/50 rounded-lg h-full overflow-hidden">
              <ErrorBoundary 
                FallbackComponent={SceneErrorFallback}
                resetKeys={[currentCollage.id, settings, safePhotos.length]}
              >
                <CollageScene
                  ref={canvasRef}
                  photos={safePhotos}
                  settings={settings}
                  width={recordingResolution.width}
                  height={recordingResolution.height}
                  onSettingsChange={handleSettingsChange}
                />
              </ErrorBoundary>
            </div>
          </div>
        </div>
      </div>
      
      {/* Debug Realtime Status - Only visible in development */}
      {import.meta.env.DEV && (
        <div className="fixed bottom-4 right-4 z-20 w-64">
          <RealtimeDebugPanel collageId={currentCollage?.id} />
        </div>
      )}
      
      {/* Video Recorder */}
      {showVideoRecorder && (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50 bg-black/50 backdrop-blur-md p-4 rounded-lg border border-white/20">
          <MobileVideoRecorder 
            canvasRef={canvasRef} 
            onClose={() => setShowVideoRecorder(false)}
            onResolutionChange={(width, height) => setRecordingResolution({ width, height })}
          />
        </div>
      )}
    </DashboardLayout>
  );
};

export default CollageEditorPage;
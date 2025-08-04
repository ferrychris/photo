import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCollageStore, type Collage } from '../store/collageStore';
import { useUsageLimit } from '../hooks/useSubscription';
import { Image, ExternalLink, Edit, Trash2, Pencil, Camera, Plus, Crown } from 'lucide-react';
import CollageNameModal from '../components/collage/CollageNameModal';
import DashboardLayout from '../components/layout/DashboardLayout';
import SubscriptionManager from '../components/subscription/SubscriptionManager';


const DashboardPage = () => {
  const navigate = useNavigate();
  const { collages, loading, error, fetchCollages, deleteCollage, createCollage } = useCollageStore();
  const { canUse: canCreatePhotosphere } = useUsageLimit('photospheres', collages.length);
  const [selectedCollage, setSelectedCollage] = useState<Collage | null>(null);
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newCollageName, setNewCollageName] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);

  useEffect(() => {
    fetchCollages();
  }, [fetchCollages]);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!confirm('Are you sure you want to delete this collage? This action cannot be undone.')) {
      return;
    }
    
    setIsDeleting(id);
    try {
      await deleteCollage(id);
    } catch (error) {
      console.error('Failed to delete collage:', error);
    } finally {
      setIsDeleting(null);
    }
  };

  const handleRename = (collage: Collage, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedCollage(collage);
    setIsRenameModalOpen(true);
  };

  const handleCreateCollage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCollageName.trim()) return;

    // Check if user can create more photospheres
    if (!canCreatePhotosphere) {
      alert('You have reached your PhotoSphere limit. Please upgrade your plan to create more.');
      return;
    }

    setIsCreating(true);
    try {
      await createCollage(newCollageName);
      setNewCollageName('');
      setShowCreateForm(false);
    } catch (error) {
      console.error('Failed to create collage:', error);
    } finally {
      setIsCreating(false);
    }
  };

  // Navigation helper functions with proper React Router navigation
  const navigateToEdit = (id: string) => {
    navigate(`/dashboard/collage/${id}`);
  };

  const navigateToView = (code: string) => {
    window.open(`/collage/${code}`, '_blank');
  };

  const navigateToPhotobooth = (id: string) => {
    navigate(`/dashboard/collage/${id}/photobooth-settings`);
  };

  if (loading && collages.length === 0) {
    return (
      <DashboardLayout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white/20 mx-auto"></div>
            <p className="mt-4 text-white/60">Loading your collages...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="p-8 text-center">
            <p className="text-red-400">Error loading collages. Please try again later.</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Subscription Overview */}
        <div className="mb-8">
          <SubscriptionManager 
            photosphereCount={collages.length}
            photoCount={collages.reduce((total, collage) => total + (collage.photoCount || 0), 0)}
            showUsage={true}
            showFeatures={false}
          />
        </div>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <h1 className="text-3xl font-bold text-white mb-2">
                My PhotoSpheres
              </h1>
              <p className="text-sm text-gray-400">
                Create and manage your 3D photo collages
              </p>
            </div>
            {canCreatePhotosphere ? (
              <button
                onClick={() => setShowCreateForm(true)}
                className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-medium rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                <Plus className="w-5 h-5 mr-2" />
                Create PhotoSphere
              </button>
            ) : (
              <div className="flex items-center space-x-3">
                <div className="text-right">
                  <p className="text-sm text-gray-400">PhotoSphere limit reached</p>
                  <p className="text-xs text-gray-500">Upgrade to create more</p>
                </div>
                <button
                  onClick={() => navigate('/dashboard/profile')}
                  className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-medium rounded-lg transition-all duration-200"
                >
                  <Crown className="w-4 h-4 mr-2" />
                  Upgrade
                </button>
              </div>
            )}
          </div>
        </div>

        {collages.length === 0 ? (
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/5 backdrop-blur-sm border border-white/10 mb-6">
              <Image className="w-8 h-8 text-white/40" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">No PhotoSpheres Yet</h3>
            <p className="text-gray-400 mb-6 max-w-md mx-auto">
              Create your first 3D photo collage to get started! Your guests will be able to upload photos in real-time.
            </p>
            <button
              onClick={() => setShowCreateForm(true)}
              className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-medium rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              <Plus className="w-5 h-5 mr-2" />
              Create Your First PhotoSphere
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Improved grid layout for better organization of many collages */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {collages.map((collage) => (
                <div 
                  key={collage.id} 
                  className="relative group rounded-xl overflow-hidden border border-white/10 bg-white/5 backdrop-blur-sm hover:bg-white/10 transition-all duration-200 hover:border-white/20 hover:shadow-lg hover:shadow-purple-500/10"
                >
                  {/* Improved card content with better spacing */}
                  <div className="p-5">
                    {/* Header section - name and code with better layout */}
                    <div className="mb-4">
                      <h3 className="text-lg font-medium text-white mb-2 truncate group-hover:text-purple-300 transition-colors">
                        {collage.name}
                      </h3>
                      <div className="flex items-center justify-between text-sm text-gray-400 mb-2">
                        <div className="inline-flex items-center px-2 py-1 rounded bg-white/5 text-white/60 text-xs border border-white/10">
                          <Image className="w-3 h-3 mr-1" />
                          Code: {collage.code}
                        </div>
                        {/* Photo count can be added here if available in the future */}
                      </div>
                      <p className="text-xs text-gray-500">
                        Created: {new Date(collage.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    
                    {/* Reorganized action buttons with better hierarchy */}
                    <div className="space-y-3">
                      {/* Primary actions - larger and more prominent */}
                      <div className="flex space-x-2">
                        <button
                          onClick={() => navigateToEdit(collage.id)}
                          className="flex-1 inline-flex items-center justify-center text-sm text-white bg-purple-600 hover:bg-purple-700 px-3 py-2.5 rounded-lg border border-purple-500/50 transition-colors font-medium"
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </button>
                        
                        <button
                          onClick={() => navigateToView(collage.code)}
                          className="flex-1 inline-flex items-center justify-center text-sm text-white bg-blue-600 hover:bg-blue-700 px-3 py-2.5 rounded-lg border border-blue-500/50 transition-colors font-medium"
                        >
                          <ExternalLink className="h-4 w-4 mr-1" />
                          View
                        </button>
                      </div>

                      {/* Camera Settings - Full width button */}
                      <button
                          onClick={() => navigateToPhotobooth(collage.id)}
                          className="w-full inline-flex items-center justify-center text-sm text-green-300 hover:text-green-200 bg-green-600/20 hover:bg-green-600/30 px-3 py-2.5 rounded-lg border border-green-500/30 transition-colors font-medium"
                        >
                          <Camera className="h-4 w-4 mr-2" />
                          Photobooth Settings
                        </button>

                      {/* Secondary actions - smaller, organized in 2-column grid */}
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={(e) => handleRename(collage, e)}
                          className="inline-flex items-center justify-center text-xs text-blue-300 hover:text-blue-200 bg-blue-600/20 hover:bg-blue-600/30 px-2 py-2 rounded-lg border border-blue-500/30 transition-colors"
                        >
                          <Pencil className="h-3 w-3 mr-1" />
                          Rename
                        </button>
                        
                        <button
                          onClick={(e) => handleDelete(collage.id, e)}
                          disabled={isDeleting === collage.id}
                          className="inline-flex items-center justify-center text-xs text-red-300 hover:text-red-200 bg-red-600/20 hover:bg-red-600/30 px-2 py-2 rounded-lg border border-red-500/30 transition-colors disabled:opacity-50"
                        >
                          {isDeleting === collage.id ? (
                            <span className="h-3 w-3 mr-1 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Trash2 className="h-3 w-3 mr-1" />
                          )}
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Create Collage Modal */}
        {showCreateForm && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-gray-900 rounded-xl p-8 max-w-md w-full mx-4 border border-gray-700 shadow-2xl">
              <h2 className="text-2xl font-bold text-white mb-6">Create New PhotoSphere</h2>
              <form onSubmit={handleCreateCollage} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    PhotoSphere Name
                  </label>
                  <input
                    type="text"
                    value={newCollageName}
                    onChange={(e) => setNewCollageName(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Enter PhotoSphere name..."
                    required
                  />
                </div>
                <div className="flex items-center justify-end space-x-4 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateForm(false);
                      setNewCollageName('');
                    }}
                    className="px-6 py-2 text-gray-400 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isCreating || !newCollageName.trim()}
                    className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 text-white px-6 py-2 rounded-lg transition-all duration-200 flex items-center space-x-2"
                  >
                    {isCreating ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Creating...</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4" />
                        <span>Create PhotoSphere</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        
        {selectedCollage && (
          <CollageNameModal
            collage={selectedCollage}
            isOpen={isRenameModalOpen}
            onClose={() => {
              setIsRenameModalOpen(false);
              setSelectedCollage(null);
            }}
          />
        )}
      </div>
    </DashboardLayout>
  );
};

export default DashboardPage;
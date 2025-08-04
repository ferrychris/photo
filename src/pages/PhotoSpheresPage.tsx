import { useEffect, useState } from 'react';
import { useCollageStore, type Collage } from '../store/collageStore';
import { Plus } from 'lucide-react';
import CollageNameModal from '../components/collage/CollageNameModal';
import DashboardLayout from '../components/layout/DashboardLayout';
import UserCollage from '../components/dashboard/Usercollage';
import { supabase } from '../lib/supabase';

const PhotoSpheresPage = () => {
  const { collages, loading, error, fetchCollages, createCollage } = useCollageStore();
  const [selectedCollage, setSelectedCollage] = useState<Collage | null>(null);
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newCollageName, setNewCollageName] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);

  useEffect(() => {
    fetchCollages();
  }, [fetchCollages]);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this PhotoSphere? This action cannot be undone.')) {
      return;
    }
    
    setIsDeleting(id);
    try {
      // Delete the collage using Supabase directly
      const { error } = await supabase
        .from('collages')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      
      // Update local state after successful deletion
      fetchCollages();
    } catch (error) {
      console.error('Failed to delete PhotoSphere:', error);
    } finally {
      setIsDeleting(null);
    }
  };

  const handleRename = (collage: Collage) => {
    setSelectedCollage(collage);
    setIsRenameModalOpen(true);
  };

  const handleCreateCollage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCollageName.trim()) return;

    setIsCreating(true);
    try {
      await createCollage(newCollageName);
      setNewCollageName('');
      setShowCreateForm(false);
    } catch (error) {
      console.error('Failed to create PhotoSphere:', error);
    } finally {
      setIsCreating(false);
    }
  };

  if (loading && collages.length === 0) {
    return (
      <DashboardLayout>
        <div className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white/20 mx-auto"></div>
          <p className="mt-4 text-white/60">Loading your PhotoSpheres...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="p-8 text-center">
          <p className="text-red-400">Error loading PhotoSpheres. Please try again later.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <h1 className="text-3xl font-bold text-white mb-2">
                My PhotoSpheres
              </h1>
              <p className="text-sm text-gray-400">
                View and manage all your 3D photo collages
              </p>
            </div>
            <button
              onClick={() => setShowCreateForm(true)}
              className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-medium rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              <Plus className="w-5 h-5 mr-2" />
              Create PhotoSphere
            </button>
          </div>
        </div>

        {collages.length === 0 ? (
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/5 backdrop-blur-sm border border-white/10 mb-6">
              <div className="w-8 h-8 bg-white/20 rounded-full" />
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
            {/* Grid layout for collages using UserCollage component */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {collages.map((collage) => (
                <UserCollage 
                  key={collage.id}
                  collage={collage}
                  onDelete={handleDelete}
                  onRename={handleRename}
                  isDeleting={isDeleting === collage.id}
                />
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

export default PhotoSpheresPage;

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Edit, Trash2, Pencil, Camera, ExternalLink, Image } from 'lucide-react';
import { Collage } from '../../store/collageStore';

interface UserCollageProps {
  collage: Collage;
  onDelete: (id: string, e: React.MouseEvent) => void;
  onRename: (collage: Collage, e: React.MouseEvent) => void;
  isDeleting: boolean;
}

const UserCollage: React.FC<UserCollageProps> = ({ collage, onDelete, onRename, isDeleting }) => {
  const navigate = useNavigate();

  const navigateToEdit = (id: string) => {
    navigate(`/dashboard/collage/${id}`);
  };

  const navigateToView = (code: string) => {
    window.open(`/collage/${code}`, '_blank');
  };

  const navigateToPhotobooth = (id: string) => {
    navigate(`/dashboard/collage/${id}/photobooth-settings`);
  };

  return (
    <div 
      key={collage.id}
      className="relative group rounded-xl overflow-hidden border border-white/10 bg-white/5 backdrop-blur-sm hover:bg-white/10 transition-all duration-200 hover:border-white/20 hover:shadow-lg hover:shadow-purple-500/10"
    >
      <div className="p-5">
        <div className="mb-4">
          <h3 className="text-lg font-medium text-white mb-2 truncate group-hover:text-purple-300 transition-colors">
            {collage.name}
          </h3>
          <div className="flex items-center justify-between text-sm text-gray-400 mb-2">
            <div className="inline-flex items-center px-2 py-1 rounded bg-white/5 text-white/60 text-xs border border-white/10">
              <Image className="w-3 h-3 mr-1" />
              Code: {collage.code}
            </div>
            {collage.photoCount !== undefined && (
              <span className="text-xs text-gray-400">{collage.photoCount} photos</span>
            )}
          </div>
          <p className="text-xs text-gray-500">
            Created: {new Date(collage.created_at).toLocaleDateString()}
          </p>
        </div>
        
        <div className="space-y-3">
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

          <button
            onClick={() => navigateToPhotobooth(collage.id)}
            className="w-full inline-flex items-center justify-center text-sm text-green-300 hover:text-green-200 bg-green-600/20 hover:bg-green-600/30 px-3 py-2.5 rounded-lg border border-green-500/30 transition-colors font-medium"
          >
            <Camera className="h-4 w-4 mr-2" />
            Photobooth Settings
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={(e) => onRename(collage, e)}
              className="inline-flex items-center justify-center text-xs text-blue-300 hover:text-blue-200 bg-blue-600/20 hover:bg-blue-600/30 px-2 py-2 rounded-lg border border-blue-500/30 transition-colors"
            >
              <Pencil className="h-3 w-3 mr-1" />
              Rename
            </button>
            
            <button
              onClick={(e) => onDelete(collage.id, e)}
              disabled={isDeleting}
              className="inline-flex items-center justify-center text-xs text-red-300 hover:text-red-200 bg-red-600/20 hover:bg-red-600/30 px-2 py-2 rounded-lg border border-red-500/30 transition-colors disabled:opacity-50"
            >
              {isDeleting ? (
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
  );
};

export default UserCollage;
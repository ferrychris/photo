import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/layout/DashboardLayout';
import { Plus, Edit, Trash2, Search, Filter } from 'lucide-react';

interface Exercise {
  id: string;
  name: string;
  description: string;
  category: string;
  difficulty: string;
  equipment: string;
}

const ExerciseView: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');

  useEffect(() => {
    // Simulate API call to fetch exercises
    setTimeout(() => {
      const mockExercises: Exercise[] = [
        {
          id: '1',
          name: 'Push-up',
          description: 'A classic upper body exercise',
          category: 'strength',
          difficulty: 'beginner',
          equipment: 'none'
        },
        {
          id: '2',
          name: 'Squat',
          description: 'A fundamental lower body exercise',
          category: 'strength',
          difficulty: 'beginner',
          equipment: 'none'
        },
        {
          id: '3',
          name: 'Plank',
          description: 'Core stabilization exercise',
          category: 'strength',
          difficulty: 'intermediate',
          equipment: 'none'
        },
        {
          id: '4',
          name: 'Jumping Jacks',
          description: 'Full body cardio exercise',
          category: 'cardio',
          difficulty: 'beginner',
          equipment: 'none'
        }
      ];
      
      setExercises(mockExercises);
      setLoading(false);
    }, 1000);
  }, []);

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this exercise?')) {
      // Simulate API call to delete exercise
      setExercises(exercises.filter(exercise => exercise.id !== id));
    }
  };

  const filteredExercises = exercises.filter(exercise => {
    const matchesSearch = exercise.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         exercise.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'all' || exercise.category === filterCategory;
    
    return matchesSearch && matchesCategory;
  });

  const getCategoryBadgeClass = (category: string) => {
    switch (category) {
      case 'strength':
        return 'bg-blue-900/30 text-blue-300 border-blue-700/50';
      case 'cardio':
        return 'bg-red-900/30 text-red-300 border-red-700/50';
      case 'flexibility':
        return 'bg-green-900/30 text-green-300 border-green-700/50';
      case 'balance':
        return 'bg-purple-900/30 text-purple-300 border-purple-700/50';
      default:
        return 'bg-gray-900/30 text-gray-300 border-gray-700/50';
    }
  };

  const getDifficultyBadgeClass = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner':
        return 'bg-green-900/30 text-green-300 border-green-700/50';
      case 'intermediate':
        return 'bg-yellow-900/30 text-yellow-300 border-yellow-700/50';
      case 'advanced':
        return 'bg-red-900/30 text-red-300 border-red-700/50';
      default:
        return 'bg-gray-900/30 text-gray-300 border-gray-700/50';
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="min-h-[calc(100vh-160px)] flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
            <p className="mt-4 text-lg">Loading exercises...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
          <h1 className="text-2xl font-bold text-white">Exercise Management</h1>
          <Link
            to="/admin/exercises/add"
            className="inline-flex items-center justify-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add New Exercise
          </Link>
        </div>

        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search exercises..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <div className="md:w-64">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Filter className="h-5 w-5 text-gray-400" />
                </div>
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent appearance-none"
                >
                  <option value="all">All Categories</option>
                  <option value="strength">Strength</option>
                  <option value="cardio">Cardio</option>
                  <option value="flexibility">Flexibility</option>
                  <option value="balance">Balance</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {filteredExercises.length === 0 ? (
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-8 text-center">
            <p className="text-gray-400">No exercises found matching your criteria.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredExercises.map((exercise) => (
              <div 
                key={exercise.id}
                className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl overflow-hidden hover:bg-gray-800/70 transition-all"
              >
                <div className="p-5">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="text-xl font-semibold text-white">{exercise.name}</h3>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => navigate(`/admin/exercises/edit/${exercise.id}`)}
                        className="p-1 rounded-md bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(exercise.id)}
                        className="p-1 rounded-md bg-red-900/30 hover:bg-red-900/50 text-red-300 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <p className="text-gray-400 mb-4">{exercise.description}</p>
                  <div className="flex flex-wrap gap-2">
                    <span className={`px-2 py-1 text-xs rounded-md border ${getCategoryBadgeClass(exercise.category)}`}>
                      {exercise.category.charAt(0).toUpperCase() + exercise.category.slice(1)}
                    </span>
                    <span className={`px-2 py-1 text-xs rounded-md border ${getDifficultyBadgeClass(exercise.difficulty)}`}>
                      {exercise.difficulty.charAt(0).toUpperCase() + exercise.difficulty.slice(1)}
                    </span>
                    {exercise.equipment !== 'none' && (
                      <span className="px-2 py-1 text-xs rounded-md border bg-gray-900/30 text-gray-300 border-gray-700/50">
                        {exercise.equipment.charAt(0).toUpperCase() + exercise.equipment.slice(1)}
                      </span>
                    )}
                  </div>
                </div>
                <div className="border-t border-gray-700 p-4">
                  <Link
                    to={`/admin/exercises/edit/${exercise.id}`}
                    className="flex items-center justify-center w-full px-4 py-2 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 rounded-lg transition-colors border border-indigo-500/30"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Details
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default ExerciseView;

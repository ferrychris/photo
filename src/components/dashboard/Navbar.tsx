import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { Menu, X, User, LogOut, Settings, Grid, Camera, ChevronDown, Bell } from 'lucide-react';

const DashboardNavbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const { user, signOut, initialized, loading } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Don't render navbar if not authenticated
  if (!initialized || loading) {
    return null; // Return nothing while loading
  }
  
  // Don't render if no user is logged in
  if (!user) {
    return null;
  }
  
  // Close mobile menu when route changes
  useEffect(() => {
    setIsOpen(false);
    setIsProfileOpen(false);
    setIsNotificationsOpen(false);
  }, [location.pathname]);
  
  // Handle logout
  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };
  
  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const profileMenu = document.getElementById('profile-menu');
      const profileButton = document.getElementById('profile-button');
      const notificationsMenu = document.getElementById('notifications-menu');
      const notificationsButton = document.getElementById('notifications-button');
      
      if (profileMenu && profileButton && 
          !profileMenu.contains(event.target as Node) && 
          !profileButton.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
      
      if (notificationsMenu && notificationsButton && 
          !notificationsMenu.contains(event.target as Node) && 
          !notificationsButton.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  return (
    <nav className="bg-gray-900 border-b border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo and primary nav */}
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link to="/dashboard" className="flex items-center">
                <span className="text-xl font-bold bg-gradient-to-r from-purple-500 to-blue-500 text-transparent bg-clip-text">PhotoSphere</span>
              </Link>
            </div>
            
            {/* Desktop navigation */}
            <div className="hidden md:ml-6 md:flex md:items-center md:space-x-4">
              <Link 
                to="/dashboard" 
                className={`px-3 py-2 rounded-md text-sm font-medium ${location.pathname === '/dashboard' ? 'text-white bg-gray-800' : 'text-gray-300 hover:bg-gray-700 hover:text-white'}`}
              >
                Dashboard
              </Link>
              <Link 
                to="/dashboard/collages" 
                className={`px-3 py-2 rounded-md text-sm font-medium ${location.pathname.includes('/dashboard/collage') ? 'text-white bg-gray-800' : 'text-gray-300 hover:bg-gray-700 hover:text-white'}`}
              >
                My PhotoSpheres
              </Link>
              <Link 
                to="/dashboard/settings" 
                className={`px-3 py-2 rounded-md text-sm font-medium ${location.pathname === '/dashboard/settings' ? 'text-white bg-gray-800' : 'text-gray-300 hover:bg-gray-700 hover:text-white'}`}
              >
                Settings
              </Link>
            </div>
          </div>
          
          {/* Right side - user menu, notifications */}
          <div className="hidden md:flex md:items-center md:space-x-4">
            {/* Notifications dropdown */}
            <div className="relative">
              <button
                id="notifications-button"
                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                className="p-2 rounded-full text-gray-400 hover:text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-white"
              >
                <span className="sr-only">View notifications</span>
                <Bell className="h-6 w-6" />
                <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-400 ring-2 ring-gray-900"></span>
              </button>
              
              {/* Notifications dropdown menu */}
              {isNotificationsOpen && (
                <div 
                  id="notifications-menu"
                  className="origin-top-right absolute right-0 mt-2 w-80 rounded-md shadow-lg py-1 bg-gray-800 ring-1 ring-black ring-opacity-5 focus:outline-none z-50"
                >
                  <div className="px-4 py-3 border-b border-gray-700">
                    <p className="text-sm font-medium text-white">Notifications</p>
                  </div>
                  <div className="max-h-60 overflow-y-auto">
                    <div className="px-4 py-3 hover:bg-gray-700 transition-colors">
                      <p className="text-sm text-white">New comment on your PhotoSphere</p>
                      <p className="text-xs text-gray-400 mt-1">5 minutes ago</p>
                    </div>
                    <div className="px-4 py-3 hover:bg-gray-700 transition-colors">
                      <p className="text-sm text-white">Your PhotoSphere was shared 3 times</p>
                      <p className="text-xs text-gray-400 mt-1">2 hours ago</p>
                    </div>
                  </div>
                  <div className="border-t border-gray-700 px-4 py-2">
                    <Link to="/dashboard/notifications" className="text-xs text-blue-400 hover:text-blue-300">View all notifications</Link>
                  </div>
                </div>
              )}
            </div>
            
            {/* Profile dropdown */}
            <div className="relative ml-3">
              <button
                id="profile-button"
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex items-center max-w-xs bg-gray-800 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-white"
              >
                <span className="sr-only">Open user menu</span>
                <div className="h-8 w-8 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 flex items-center justify-center text-white font-medium">
                  {user?.email?.charAt(0).toUpperCase() || 'U'}
                </div>
                <ChevronDown className="ml-1 h-4 w-4 text-gray-400" />
              </button>
              
              {/* Profile dropdown menu */}
              {isProfileOpen && (
                <div 
                  id="profile-menu"
                  className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 bg-gray-800 ring-1 ring-black ring-opacity-5 focus:outline-none z-50"
                >
                  <div className="px-4 py-3 border-b border-gray-700">
                    <p className="text-sm font-medium text-white truncate">{user?.email}</p>
                  </div>
                  <Link 
                    to="/dashboard/profile" 
                    className="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white"
                  >
                    <div className="flex items-center">
                      <User className="mr-2 h-4 w-4" />
                      Your Profile
                    </div>
                  </Link>
                  <Link 
                    to="/dashboard/settings" 
                    className="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white"
                  >
                    <div className="flex items-center">
                      <Settings className="mr-2 h-4 w-4" />
                      Settings
                    </div>
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left block px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white"
                  >
                    <div className="flex items-center">
                      <LogOut className="mr-2 h-4 w-4" />
                      Sign out
                    </div>
                  </button>
                </div>
              )}
            </div>
          </div>
          
          {/* Mobile menu button */}
          <div className="-mr-2 flex md:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-white"
            >
              <span className="sr-only">{isOpen ? 'Close menu' : 'Open menu'}</span>
              {isOpen ? <X className="block h-6 w-6" /> : <Menu className="block h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isOpen && (
        <div className="md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            <Link 
              to="/dashboard" 
              className={`block px-3 py-2 rounded-md text-base font-medium ${location.pathname === '/dashboard' ? 'text-white bg-gray-800' : 'text-gray-300 hover:bg-gray-700 hover:text-white'}`}
            >
              <div className="flex items-center">
                <Grid className="mr-2 h-5 w-5" />
                Dashboard
              </div>
            </Link>
            <Link 
              to="/dashboard/collages" 
              className={`block px-3 py-2 rounded-md text-base font-medium ${location.pathname.includes('/dashboard/collage') ? 'text-white bg-gray-800' : 'text-gray-300 hover:bg-gray-700 hover:text-white'}`}
            >
              <div className="flex items-center">
                <Camera className="mr-2 h-5 w-5" />
                My PhotoSpheres
              </div>
            </Link>
            <Link 
              to="/dashboard/settings" 
              className={`block px-3 py-2 rounded-md text-base font-medium ${location.pathname === '/dashboard/settings' ? 'text-white bg-gray-800' : 'text-gray-300 hover:bg-gray-700 hover:text-white'}`}
            >
              <div className="flex items-center">
                <Settings className="mr-2 h-5 w-5" />
                Settings
              </div>
            </Link>
          </div>
          
          {/* Mobile profile section */}
          <div className="pt-4 pb-3 border-t border-gray-700">
            <div className="flex items-center px-5">
              <div className="flex-shrink-0">
                <div className="h-10 w-10 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 flex items-center justify-center text-white font-medium">
                  {user?.email?.charAt(0).toUpperCase() || 'U'}
                </div>
              </div>
              <div className="ml-3">
                <div className="text-base font-medium leading-none text-white">{user?.email?.split('@')[0]}</div>
                <div className="text-sm font-medium leading-none text-gray-400 mt-1">{user?.email}</div>
              </div>
            </div>
            <div className="mt-3 px-2 space-y-1">
              <Link 
                to="/dashboard/profile" 
                className="block px-3 py-2 rounded-md text-base font-medium text-gray-300 hover:bg-gray-700 hover:text-white"
              >
                <div className="flex items-center">
                  <User className="mr-2 h-5 w-5" />
                  Your Profile
                </div>
              </Link>
              <button
                onClick={handleLogout}
                className="w-full text-left block px-3 py-2 rounded-md text-base font-medium text-gray-300 hover:bg-gray-700 hover:text-white"
              >
                <div className="flex items-center">
                  <LogOut className="mr-2 h-5 w-5" />
                  Sign out
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default DashboardNavbar;
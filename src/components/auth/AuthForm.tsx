import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, User } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

type AuthFormProps = {
  isLogin?: boolean;
};

const AuthForm: React.FC<AuthFormProps> = ({ isLogin = true }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const navigate = useNavigate();
  
  const { signIn, signUp, loading, error, clearError, user } = useAuthStore();

  // If user is already logged in, redirect to dashboard
  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  // Display auth store errors
  useEffect(() => {
    if (error) {
      setErrorMessage(error);
    }
  }, [error]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setErrorMessage(null);
    setSuccessMessage(null);

    // Validate input
    if (!email || !password) {
      setErrorMessage("Please enter both email and password");
      return;
    }

    if (password.length < 6) {
      setErrorMessage("Password must be at least 6 characters");
      return;
    }

    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) {
          if (error.message?.includes('database') || error.message?.includes('schema')) {
            setErrorMessage('We are experiencing technical difficulties. Please try again in a few minutes.');
          } else if (error.message?.includes('credentials') || error.message?.includes('invalid')) {
            setErrorMessage('Invalid email or password. Please try again.');
          } else {
            setErrorMessage(error.message || 'Authentication failed. Please try again later.');
          }
          return;
        }
      } else {
        const { error } = await signUp(email, password);
        if (error) {
          if (error.message?.includes('database') || error.message?.includes('schema')) {
            setErrorMessage('We are experiencing technical difficulties. Please try again in a few minutes.');
          } else if (error.message?.includes('exists')) {
            setErrorMessage('An account with this email already exists.');
          } else {
            setErrorMessage(error.message || 'Account creation failed. Please try again later.');
          }
          return;
        } else {
          setSuccessMessage("Account created successfully! Please sign in.");
          setTimeout(() => {
            navigate('/login');
          }, 2000);
          return;
        }
      }
    } catch (err: any) {
      console.error('Auth form error:', err);
      
      if (err.message?.includes('database') || err.message?.includes('schema')) {
        setErrorMessage('We are experiencing technical difficulties with our database. Please try again in a few minutes.');
      } else if (err.message?.includes('unavailable')) {
        setErrorMessage('The authentication service is currently unavailable. Please try again in a few minutes.');
      } else {
        setErrorMessage('An unexpected error occurred. Please try again later.');
      }
    }
  };

  return (
    <div className="w-full max-w-md">
      <div className="bg-white/10 backdrop-blur-md p-8 rounded-lg shadow-xl border border-white/20">
        <div className="flex justify-center mb-6">
          <div className="bg-gradient-to-r from-purple-600 to-blue-500 p-3 rounded-full">
            <User className="h-6 w-6 text-white" />
          </div>
        </div>
        
        <h2 className="text-2xl font-bold text-center text-white mb-6">
          {isLogin ? 'Sign In' : 'Create Account'}
        </h2>
        
        {errorMessage && (
          <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded text-sm text-red-200">
            {errorMessage}
          </div>
        )}
        
        {successMessage && (
          <div className="mb-4 p-3 bg-green-500/20 border border-green-500/50 rounded text-sm text-green-200">
            {successMessage}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="email" className="block text-sm font-medium text-gray-200 mb-1">
              Email
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-black/30 text-white block w-full pl-10 pr-3 py-2 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="you@example.com"
              />
            </div>
          </div>
          
          <div className="mb-6">
            <label htmlFor="password" className="block text-sm font-medium text-gray-200 mb-1">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="bg-black/30 text-white block w-full pl-10 pr-3 py-2 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="••••••••"
              />
            </div>
          </div>
          
          <div>
            <button
              type="submit"
              disabled={loading}
              className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gradient-to-r from-purple-600 to-blue-500 hover:from-purple-700 hover:to-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 ${
                loading ? 'opacity-70 cursor-not-allowed' : ''
              }`}
            >
              {loading ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white\" xmlns="http://www.w3.org/2000/svg\" fill="none\" viewBox="0 0 24 24">
                    <circle className="opacity-25\" cx="12\" cy="12\" r="10\" stroke="currentColor\" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </span>
              ) : isLogin ? (
                'Sign In'
              ) : (
                'Create Account'
              )}
            </button>
          </div>
        </form>
        
        <div className="mt-4 text-center">
          <button
            onClick={() => {
              clearError();
              setErrorMessage(null);
              setSuccessMessage(null);
              navigate(isLogin ? '/signup' : '/login');
            }}
            className="text-sm text-purple-300 hover:text-purple-200 transition-colors"
          >
            {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
          </button>
        </div>
        
      </div>
    </div>
  );
};

export default AuthForm;
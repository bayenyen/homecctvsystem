// src/pages/NotFoundPage.jsx
import { Link } from 'react-router-dom';
import { Camera, Home } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-dark-900 flex items-center justify-center">
      <div className="text-center">
        <div className="w-20 h-20 bg-dark-700 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <Camera size={36} className="text-gray-600" />
        </div>
        <h1 className="text-6xl font-bold text-dark-500 mb-3">404</h1>
        <p className="text-gray-400 mb-6">Page not found</p>
        <Link to="/dashboard" className="btn-primary mx-auto">
          <Home size={14} /> Back to Dashboard
        </Link>
      </div>
    </div>
  );
}

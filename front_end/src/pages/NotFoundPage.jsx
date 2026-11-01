// NotFoundPage — 404 handler shown when the user navigates to an unknown URL
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Bus } from 'lucide-react';

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    // Full-screen centered layout matching the dark theme
    <div className="min-h-screen bg-[#070d18] flex flex-col items-center justify-center gap-6 px-4">
      {/* Bus icon as a visual identifier for the 404 state */}
      <div className="w-20 h-20 rounded-2xl bg-[#0c162b] border border-[#16274a] flex items-center justify-center text-slate-600">
        <Bus className="w-10 h-10" />
      </div>

      <div className="text-center">
        <h1 className="text-6xl font-extrabold text-slate-700">404</h1>
        <h2 className="text-xl font-bold text-white mt-2">Page Not Found</h2>
        <p className="text-sm text-slate-400 mt-2">
          The page you're looking for doesn't exist or you don't have access.
        </p>
      </div>

      {/* Navigate back to the student dashboard */}
      <button
        onClick={() => navigate('/dashboard', { replace: true })}
        className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm rounded-xl transition shadow-lg shadow-emerald-600/25"
      >
        Go to Dashboard
      </button>
    </div>
  );
}

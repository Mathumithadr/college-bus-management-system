// WelcomeHeroCard — greeting banner with college building silhouette and date badge, shown at top of dashboard
import React from 'react';
import { Calendar } from 'lucide-react';

export default function WelcomeHeroCard({ user }) {
  // Format today's date as "Thu, 16 Oct 2026" for the date badge
  const today = new Date().toLocaleDateString('en-GB', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  // Get just the first name from the user's full name for a friendly greeting
  const firstName = user?.name?.split(' ')[0] || 'Student';

  // Determine greeting based on current hour (morning / afternoon / evening)
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';

  return (
    // Dark card with subtle college building vector illustration in background
    <div className="relative overflow-hidden rounded-2xl bg-[#0c162b] border border-[#16274a] px-6 py-5 flex items-center justify-between shadow-xl">

      {/* Faint college building silhouette — purely decorative background element */}
      <div className="absolute right-40 bottom-0 opacity-[0.06] pointer-events-none hidden lg:block">
        <svg className="w-72 h-28" fill="currentColor" viewBox="0 0 300 100">
          <rect x="0" y="60" width="300" height="40" />
          <rect x="30" y="30" width="60" height="70" />
          <rect x="120" y="10" width="60" height="90" />
          <polygon points="150,0 120,10 180,10" />
          <rect x="210" y="30" width="60" height="70" />
          <rect x="42" y="48" width="12" height="20" />
          <rect x="66" y="48" width="12" height="20" />
          <rect x="132" y="30" width="12" height="20" />
          <rect x="156" y="30" width="12" height="20" />
          <rect x="222" y="48" width="12" height="20" />
          <rect x="246" y="48" width="12" height="20" />
        </svg>
      </div>

      {/* LEFT: Dynamic greeting using the logged-in user's first name */}
      <div className="relative z-10">
        <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
          {greeting}, {firstName}!
        </h1>
        <p className="text-sm text-slate-400 mt-1">Here's your bus information for today.</p>
      </div>

      {/* RIGHT: Date badge showing today's date and a "College Day" label */}
      <div className="relative z-10 bg-[#101e38] border border-[#1e335d] rounded-2xl px-4 py-2.5 flex items-center gap-3 shadow-md shrink-0">
        <Calendar className="w-5 h-5 text-emerald-400" />
        <div>
          <div className="text-xs font-semibold text-slate-200">{today}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">College Day</div>
        </div>
      </div>
    </div>
  );
}

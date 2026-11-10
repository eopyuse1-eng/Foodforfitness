import React from 'react';

const CONDITION_BADGES = [
  { key: 'diabetes', label: 'DB', name: 'Diabetes', style: 'bg-blue-100 text-blue-700 dark:bg-blue-900/70 dark:text-blue-200' },
  { key: 'hypertension', label: 'HT', name: 'Hypertension', style: 'bg-red-100 text-red-700 dark:bg-red-900/60 dark:text-red-200' },
  { key: 'gout', label: 'Gout', name: 'Gout / uric acid', style: 'bg-purple-100 text-purple-700 dark:bg-purple-900/60 dark:text-purple-200' },
  { key: 'ckd', label: 'CKD', name: 'Chronic kidney disease', style: 'bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-200' },
  { key: 'pcos', label: 'PCOS', name: 'PCOS', style: 'bg-pink-100 text-pink-700 dark:bg-pink-900/60 dark:text-pink-200' },
  { key: 'dyslipidemia', label: 'Chol', name: 'Dyslipidemia / cholesterol', style: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-200' },
  { key: 'heartDisease', label: 'Heart', name: 'Heart disease', style: 'bg-rose-100 text-rose-700 dark:bg-rose-900/60 dark:text-rose-200' },
  { key: 'gerd', label: 'GERD', name: 'GERD', style: 'bg-teal-100 text-teal-700 dark:bg-teal-900/60 dark:text-teal-200' },
  { key: 'osteoporosis', label: 'Bone', name: 'Osteoporosis', style: 'bg-orange-100 text-orange-700 dark:bg-orange-900/60 dark:text-orange-200' },
  { key: 'anemia', label: 'Anemia', name: 'Anemia', style: 'bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-900/60 dark:text-fuchsia-200' }
];

function NavButton({ id, icon, label, nativeLabel, activeTab, setActiveTab }) {
  return (
    <button
      type="button"
      onClick={() => setActiveTab(id)}
      aria-label={label}
      aria-current={activeTab === id ? 'page' : undefined}
      className={`native-nav-button flex min-h-12 flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl py-1 transition-colors lg:w-full lg:flex-none lg:py-2 ${activeTab === id ? 'text-emerald-700 dark:text-emerald-300 lg:bg-emerald-50 dark:lg:bg-emerald-900/30' : 'text-gray-400 hover:text-gray-600 dark:text-slate-400 dark:hover:text-slate-200'}`}
    >
      <div className={`rounded-full p-1.5 ${activeTab === id ? 'bg-emerald-100 dark:bg-emerald-900/60' : ''}`}>{icon}</div>
      <span className="native-nav-label-web text-[9px] font-bold uppercase tracking-wider lg:text-[8px]">{label}</span>
      <span aria-hidden="true" className="native-nav-label-native hidden text-[10px] font-bold tracking-wide">{nativeLabel}</span>
    </button>
  );
}

export default function Navigation({ profile, activeTab, setActiveTab }) {
  return (
    <>
      <header className="app-shell-header native-android-header z-20 flex shrink-0 items-center justify-between border-b border-emerald-100 bg-white/95 px-5 py-3 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900 lg:ml-24 lg:px-8">
        <div className="flex min-w-0 items-center gap-2">
          <h1 className="shrink-0 text-lg font-black tracking-tight text-gray-900 dark:text-slate-100">Food<span className="text-emerald-600 dark:text-emerald-400">For</span>Fitness</h1>
        </div>
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex min-w-0 items-center gap-1 overflow-x-auto py-0.5 sm:max-w-[55vw] lg:max-w-[45vw]" aria-label="Active health conditions">
            {CONDITION_BADGES.filter(({ key }) => profile.conditions?.[key]).map(({ key, label, name, style }) => (
              <span key={key} title={name} aria-label={name} className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold ${style}`}>
                {label}
              </span>
            ))}
          </div>
          <div className="flex shrink-0 items-center">
            <button type="button" onClick={() => setActiveTab('profile')} className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal-100 text-xs font-bold text-teal-700 shadow-sm dark:bg-teal-900/60 dark:text-teal-300" aria-label="Open profile">
              {profile.name ? profile.name[0].toUpperCase() : 'U'}
            </button>
          </div>
        </div>
      </header>

      <nav aria-label="Main navigation" className="native-android-nav fixed inset-x-0 bottom-0 z-30 flex h-[calc(4rem+env(safe-area-inset-bottom))] w-full items-center border-t border-emerald-100 bg-white/95 px-2 pb-[env(safe-area-inset-bottom)] shadow-[0_-5px_15px_rgba(0,0,0,0.05)] backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/95 lg:inset-y-0 lg:left-0 lg:right-auto lg:h-screen lg:w-24 lg:flex-col lg:justify-center lg:border-r lg:border-t-0 lg:px-3 lg:py-6 lg:pb-6 lg:shadow-[4px_0_18px_rgba(0,0,0,0.04)]">
        <div className="flex w-full items-center justify-between lg:h-full lg:flex-col lg:justify-center lg:gap-6">
          <div className="flex w-[43%] items-center justify-between lg:w-full lg:flex-col lg:gap-3">
            <NavButton activeTab={activeTab} setActiveTab={setActiveTab} id="dashboard" label="Dash" nativeLabel="Home" icon={<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>} />
            <NavButton activeTab={activeTab} setActiveTab={setActiveTab} id="tracker" label="Log" nativeLabel="Diary" icon={<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>} />
          </div>

          <div className="flex w-[14%] items-center justify-center lg:w-full">
            <button
              onClick={() => setActiveTab('scan')}
              aria-label="Scan ingredients"
              aria-current={activeTab === 'scan' ? 'page' : undefined}
              className={`relative -top-3 flex h-12 w-12 items-center justify-center rounded-full text-white shadow-lg shadow-emerald-200 transition active:scale-95 lg:top-0 ${activeTab === 'scan' ? 'bg-emerald-800' : 'bg-emerald-600'}`}
              type="button"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"></path><circle cx="12" cy="13" r="3"></circle></svg>
            </button>
          </div>

          <div className="flex w-[43%] items-center justify-between lg:w-full lg:flex-col lg:gap-3">
            <NavButton activeTab={activeTab} setActiveTab={setActiveTab} id="analytics" label="Health" nativeLabel="Health" icon={<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>} />
            <NavButton activeTab={activeTab} setActiveTab={setActiveTab} id="ai" label="AI Bot" nativeLabel="Ask" icon={<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>} />
          </div>
        </div>
      </nav>
    </>
  );
}

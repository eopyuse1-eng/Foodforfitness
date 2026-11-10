import React, { useEffect, useRef, useState } from 'react';

const TOUR_STEPS = [
  {
    tab: 'dashboard',
    target: 'dashboard-nutrition',
    icon: '🔥',
    title: 'Daily nutrition targets',
    description: 'Makikita rito ang calories na nakain mo kumpara sa daily calorie target at progress bar. Sa ibaba, may hiwalay na totals at targets para sa protein, carbs, at fat. Nagbabago ang totals kapag nag-log ka ng pagkain.'
  },
  {
    tab: 'dashboard',
    target: 'dashboard-clinical',
    icon: '🩺',
    title: 'Daily intake guide',
    description: 'Tingnan ang sugar at sodium estimates mula sa mga na-log na pagkain. Ipinapakita ng progress bars ang paghahambing sa app targets; gabay lang ang mga ito at hindi medical measurements.'
  },
  {
    tab: 'dashboard',
    target: 'dashboard-micronutrients',
    icon: '🌱',
    title: 'Micronutrient summary',
    description: 'Ipinapakita ang estimated totals para sa fiber, calcium, iron, potassium, at vitamins A, C, D, at B12 mula sa meals na na-log mo ngayong araw. Nutrition estimates ang mga ito, hindi laboratory measurements.'
  },
  {
    tab: 'dashboard',
    target: 'dashboard-reminders',
    icon: '🔔',
    title: 'Health reminders',
    description: 'Magdagdag ng meal, hydration, medication, o health-check reminder. Puwede mong i-edit ang oras at repeat schedule, i-pause, o burahin ito. I-enable ang notifications kung gusto mong makatanggap ng alerts.'
  },
  {
    tab: 'tracker',
    target: 'food-log-search',
    icon: '📝',
    title: 'Food Log',
    description: 'Pumili ng Go, Grow, o Glow, saka i-filter ayon sa main dish, appetizer, side dish, o salad. Itakda ang serving quantity at pindutin ang Add para maitala ito sa Food Log at dashboard.'
  },
  {
    tab: 'scan',
    target: 'scanner-modes',
    icon: '📷',
    title: 'Food Scanner',
    description: 'Pumili ng Live Camera o Photo Upload para tukuyin ang mga hilaw na sangkap. I-review ang tantiyang dami at calories ng bawat sangkap at ang Go, Grow, Glow meal ideas bago mag-log ng rekomendasyon.'
  },
  {
    tab: 'analytics',
    target: 'health-vital-summary',
    icon: '🩺',
    title: 'Health overview',
    description: 'Tingnan ang pinakahuling weight, blood pressure, at glucose readings. Kapag wala pang naitalang reading, dito rin makikita ang status na hindi pa ito recorded. Nasa itaas ng cards ang profile BMI.'
  },
  {
    tab: 'analytics',
    target: 'health-nutrition-report',
    icon: '📊',
    title: 'Nutrition progress report',
    description: 'Pumili ng 7-day o 30-day view para makita ang average calories, goal days, protein, fiber, at calorie trend kumpara sa daily target.'
  },
  {
    tab: 'analytics',
    target: 'health-condition-analysis',
    icon: '🎯',
    title: 'Condition analysis',
    description: 'Ihambing ang na-log na sugar, sodium, protein, o fat sa personalized limits para sa conditions na pinili sa profile. Gabay lang ito at hindi medical diagnosis.'
  },
  {
    tab: 'analytics',
    target: 'health-vital-trends',
    icon: '📈',
    title: 'Vital trends',
    description: 'Makikita rito ang chart ng pinakahuling weight, blood pressure, at glucose entries para masundan ang pagbabago sa mga reading mo.'
  },
  {
    tab: 'analytics',
    target: 'health-vital-entry',
    icon: '✍️',
    title: 'Log health readings',
    description: 'Opsyonal ang pag-record ng weight, blood pressure, at glucose. Puwede kang mag-save ng isa o higit pang reading; hindi kailangan punan ang lahat.'
  },
  {
    tab: 'analytics',
    target: 'health-vital-history',
    icon: '🗂️',
    title: 'Health history',
    description: 'Balikan ang mga na-save na vital readings kasama ang petsa. Maaari ka pa ring gumamit ng food log at reminders kahit wala kang health readings.'
  },
  {
    tab: 'ai',
    target: 'nutribot-chat-input',
    icon: '💬',
    title: 'NutriBot',
    description: 'Magtanong tungkol sa pagkain at nutrition sa chat box. Puwede ring gamitin ang microphone para magsalita; gabay ang sagot at hindi ito medical diagnosis.'
  },
  {
    tab: 'profile',
    target: 'profile-clinical-summary',
    icon: '👤',
    title: 'Profile and health information',
    description: 'I-review ang profile details at health conditions na ginagamit sa pag-personalize ng nutrition guidance. Gamitin ang Edit Profile kung may kailangang baguhin.'
  },
  {
    tab: 'settings',
    target: 'settings-appearance',
    icon: '⚙️',
    title: 'Settings',
    description: 'Pumili ng light o dark theme, tingnan ang notification permissions, o ulitin ang walkthrough. Sa Dashboard naman ginagawa at inaayos ang mga reminder.'
  }
];

function getTargetPosition(target, tooltipHeight) {
  const rect = target.getBoundingClientRect();
  const padding = 6;
  const top = Math.max(4, rect.top - padding);
  const left = Math.max(4, rect.left - padding);
  const right = Math.min(window.innerWidth - 4, rect.right + padding);
  const bottom = Math.min(window.innerHeight - 4, rect.bottom + padding);
  const cardHeight = Math.min(tooltipHeight, window.innerHeight * 0.48);
  const spaceAbove = rect.top - 16;
  const spaceBelow = window.innerHeight - rect.bottom - 16;
  const shouldPlaceAbove = spaceAbove >= cardHeight
    || (spaceAbove > spaceBelow && spaceBelow < cardHeight);
  const desiredTop = shouldPlaceAbove ? rect.top - cardHeight - 16 : rect.bottom + 16;
  const tooltipTop = Math.min(
    Math.max(12, desiredTop),
    Math.max(12, window.innerHeight - cardHeight - 12)
  );

  return {
    spotlight: { top, left, width: Math.max(0, right - left), height: Math.max(0, bottom - top) },
    tooltipTop
  };
}

export default function OnboardingTour({ setActiveTab, onComplete }) {
  const [stepIndex, setStepIndex] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [position, setPosition] = useState(null);
  const [isMobile, setIsMobile] = useState(() => window.matchMedia('(max-width: 639px)').matches);
  const tooltipRef = useRef(null);
  const step = TOUR_STEPS[stepIndex];

  useEffect(() => {
    const mobileQuery = window.matchMedia('(max-width: 639px)');
    const updateViewportMode = (event) => setIsMobile(event.matches);
    mobileQuery.addEventListener('change', updateViewportMode);
    return () => mobileQuery.removeEventListener('change', updateViewportMode);
  }, []);

  useEffect(() => {
    let isCancelled = false;
    let retryTimer;
    let scrollTimer;
    let positionFrame;
    let attempts = 0;
    let target;

    const updatePosition = () => {
      if (!isCancelled && target) {
        const tooltipHeight = tooltipRef.current?.getBoundingClientRect().height || 280;
        setPosition(getTargetPosition(target, tooltipHeight));
      }
    };

    const findTarget = () => {
      if (isCancelled) return;
      target = document.querySelector(`[data-tour-target="${step.target}"]`);
      if (!target) {
        attempts += 1;
        if (attempts < 15) {
          retryTimer = window.setTimeout(findTarget, 80);
        } else {
          console.error(`Onboarding target not found: ${step.target}`);
        }
        return;
      }

      const isMobile = window.matchMedia('(max-width: 639px)').matches;
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      target.scrollIntoView({
        behavior: prefersReducedMotion ? 'auto' : 'smooth',
        block: isMobile ? 'start' : 'center',
        inline: 'nearest'
      });

      let previousTop = Number.NaN;
      let previousLeft = Number.NaN;
      let stableFrames = 0;
      const scrollDeadline = performance.now() + 1800;
      const settleTarget = () => {
        if (isCancelled) return;
        const rect = target.getBoundingClientRect();
        const isStable = Math.abs(rect.top - previousTop) < 0.5
          && Math.abs(rect.left - previousLeft) < 0.5;
        stableFrames = isStable ? stableFrames + 1 : 0;
        previousTop = rect.top;
        previousLeft = rect.left;

        if (stableFrames >= 4 || performance.now() >= scrollDeadline) {
          updatePosition();
          return;
        }
        positionFrame = window.requestAnimationFrame(settleTarget);
      };
      positionFrame = window.requestAnimationFrame(settleTarget);
    };

    const handleScroll = () => {
      window.clearTimeout(scrollTimer);
      scrollTimer = window.setTimeout(updatePosition, 120);
    };

    const frameId = window.requestAnimationFrame(findTarget);
    window.addEventListener('resize', updatePosition);
    window.visualViewport?.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', handleScroll, true);

    return () => {
      isCancelled = true;
      window.cancelAnimationFrame(frameId);
      window.cancelAnimationFrame(positionFrame);
      window.clearTimeout(retryTimer);
      window.clearTimeout(scrollTimer);
      window.removeEventListener('resize', updatePosition);
      window.visualViewport?.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [step.target]);

  const completeTour = async ({ skipped = false } = {}) => {
    setIsSaving(true);
    setSaveError('');
    try {
      await onComplete({ skipped, activeTab: step.tab });
    } catch (error) {
      console.error('Onboarding completion could not be saved:', error);
      setSaveError('Hindi pa mase-save ang progress mo. Tingnan ang internet connection at subukang muli.');
    } finally {
      setIsSaving(false);
    }
  };

  const goToStep = (nextIndex) => {
    setSaveError('');
    setActiveTab(TOUR_STEPS[nextIndex].tab);
    setStepIndex(nextIndex);
  };

  return (
    <div className="fixed inset-0 z-[80]">
      {!position && <div className="absolute inset-0 bg-slate-950/75" aria-hidden="true" />}
      {position && (
        <div
          className="pointer-events-none fixed rounded-2xl border-2 border-teal-300 shadow-[0_0_0_9999px_rgba(2,6,23,0.72),0_0_24px_rgba(45,212,191,0.6)] transition-all duration-300"
          style={{
            top: position.spotlight.top,
            left: position.spotlight.left,
            width: position.spotlight.width,
            height: position.spotlight.height
          }}
          aria-hidden="true"
        />
      )}
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-title"
        aria-describedby="onboarding-description"
        ref={tooltipRef}
        className={`fixed z-[81] overflow-y-auto rounded-3xl border border-slate-700 bg-slate-900 text-slate-100 shadow-2xl ${
          isMobile
            ? 'bottom-[calc(env(safe-area-inset-bottom)+6rem)] left-1/2 max-h-[38dvh] w-[calc(100%-1rem)] max-w-md -translate-x-1/2 p-3'
            : 'max-h-[48dvh] w-[calc(100%-1.5rem)] max-w-md p-4 transition-[top,transform] duration-300 ease-out sm:p-5'
        }`}
        style={isMobile
          ? {
            top: 'auto',
            left: '50%',
            transform: 'translateX(-50%)'
          }
          : position
          ? {
            top: position.tooltipTop,
            left: '50%',
            transform: 'translateX(-50%)'
          }
          : {
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)'
          }}
      >
        <div className={`${isMobile ? 'mb-2' : 'mb-4'} flex items-center justify-between gap-4`}>
          <span className="rounded-full bg-teal-900/60 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-teal-200">
            {step.tab === 'dashboard' ? 'Dashboard tour' : `${step.tab} tour`}
          </span>
          <span className="text-xs font-bold text-slate-400">
            {stepIndex + 1} / {TOUR_STEPS.length}
          </span>
        </div>

        <div className={`${isMobile ? 'mb-3' : 'mb-4'} h-1.5 overflow-hidden rounded-full bg-slate-800`}>
          <div
            className="h-full rounded-full bg-teal-400 transition-all"
            style={{ width: `${((stepIndex + 1) / TOUR_STEPS.length) * 100}%` }}
          />
        </div>

        <div className={`${isMobile ? 'mb-2 h-9 w-9 text-xl' : 'mb-3 h-11 w-11 text-2xl'} flex items-center justify-center rounded-2xl bg-teal-900/50`} aria-hidden="true">
          {step.icon}
        </div>
        <h2 id="onboarding-title" className={`${isMobile ? 'text-lg' : 'text-xl'} font-black tracking-tight text-white`}>
          {step.title}
        </h2>
        <p id="onboarding-description" className={`${isMobile ? 'mt-1 text-xs leading-5' : 'mt-2 text-sm leading-6'} text-slate-300`}>
          {step.description}
        </p>
        <p className={`${isMobile ? 'mt-1 text-[10px] leading-4' : 'mt-2 text-[11px] leading-5'} text-slate-400`}>
          Next para sa susunod na bahagi, o i-skip ang tour para mag-navigate nang malaya.
        </p>

        {saveError && (
          <p role="alert" className="mt-3 rounded-xl border border-amber-800 bg-amber-950/60 p-3 text-xs font-semibold text-amber-200">
            {saveError}
          </p>
        )}

        <div className={`${isMobile ? 'mt-2' : 'mt-4'} flex items-center justify-between gap-2`}>
          <button
            type="button"
            disabled={isSaving}
            onClick={() => completeTour({ skipped: true })}
            className="rounded-xl px-2 py-2 text-xs font-bold text-slate-400 transition hover:bg-slate-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            Skip tour
          </button>
          <div className="flex items-center gap-2">
            {stepIndex > 0 && (
              <button
                type="button"
                disabled={isSaving}
                onClick={() => goToStep(stepIndex - 1)}
                className="rounded-xl border border-slate-700 px-3 py-2.5 text-xs font-bold text-slate-200 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Back
              </button>
            )}
            {stepIndex < TOUR_STEPS.length - 1 ? (
              <button
                type="button"
                disabled={isSaving}
                onClick={() => goToStep(stepIndex + 1)}
                className="rounded-xl bg-teal-500 px-4 py-2.5 text-xs font-black text-slate-950 transition hover:bg-teal-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
              </button>
            ) : (
              <button
                type="button"
                disabled={isSaving}
                onClick={completeTour}
                className="rounded-xl bg-teal-500 px-4 py-2.5 text-xs font-black text-slate-950 transition hover:bg-teal-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSaving ? 'Saving…' : 'Finish tour'}
              </button>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

import React, { useMemo, useState } from 'react';
import { useAppDialog } from '../../components/common/appDialogContext';
import { getBmiCategory, summarizeFoodLogByDate, summarizeFoodLogForPeriod } from '../../utils/healthMetrics';

export default function Vitals({
  profile,
  bmi,
  log,
  todayLog,
  totals,
  targets,
  healthLogs,
  healthLogError,
  newWeight,
  setNewWeight,
  newBp,
  setNewBp,
  newGlucose,
  setNewGlucose,
  handleAddHealthLog,
  handleRemoveHealthLog
}) {
  const [reportPeriod, setReportPeriod] = useState(7);
  const [healthLogPendingDeletion, setHealthLogPendingDeletion] = useState(null);
  const showAppAlert = useAppDialog();
  const handleVitalInput = (setter, value, integerOnly, allowRange = false) => {
    const pattern = allowRange ? /^\d*(?:\s*-\s*\d*)?$/ : integerOnly ? /^\d*$/ : /^\d*(?:\.\d*)?$/;
    if (!pattern.test(value)) {
      showAppAlert(allowRange
        ? 'Enter glucose as a number or range in mg/dL, such as 90 or 80-100.'
        : integerOnly
        ? 'Please enter a whole number using digits only.'
        : 'Please enter a valid number using digits only.');
      return;
    }
    setter(value);
  };
  const dailyNutrition = useMemo(() => summarizeFoodLogByDate(log, reportPeriod), [log, reportPeriod]);
  const periodTotals = useMemo(() => summarizeFoodLogForPeriod(log, reportPeriod), [log, reportPeriod]);
  const activeNutritionDays = dailyNutrition.filter((day) => day.itemCount > 0).length;
  const averageCalories = activeNutritionDays ? Math.round(periodTotals.calories / activeNutritionDays) : 0;
  const goalDays = dailyNutrition.filter((day) => day.itemCount > 0 && day.totals.calories <= targets.cal).length;
  const chartMaximum = Math.max(targets.cal, ...dailyNutrition.map((day) => day.totals.calories), 1);
  const hasLoggedFoodToday = todayLog.length > 0;
  const hasCompleteMicronutrientData = (nutrient) => {
    const coverage = totals.micronutrientCoverage?.[nutrient];
    return hasLoggedFoodToday && (!coverage || coverage.known === coverage.total);
  };
  const recentHealthLogs = healthLogs.slice(-5);
  const bmiCategory = getBmiCategory(bmi, profile.age);
  const latestBp = [...healthLogs].reverse().find((entry) => entry.bp != null)?.bp;
  const latestGlucose = [...healthLogs].reverse().find((entry) => entry.glucose != null)?.glucose;
  const loggedPurineLevels = todayLog.reduce((counts, item) => {
    const level = String(item.purines || '').toLowerCase();
    if (['low', 'medium', 'high'].includes(level)) counts[level] += 1;
    return counts;
  }, { low: 0, medium: 0, high: 0 });
  const unclassifiedPurineFoods = todayLog.length - Object.values(loggedPurineLevels).reduce((total, count) => total + count, 0);
  const goutStatus = !hasLoggedFoodToday
    ? 'No food logged'
    : loggedPurineLevels.high > 0
      ? 'Review logged foods'
      : unclassifiedPurineFoods > 0
        ? 'Purine data incomplete'
        : 'No high-purine foods';
  const goutDetail = !hasLoggedFoodToday
    ? 'Log a meal to see catalog purine categories. This is not a uric-acid measurement or personal target.'
    : `Catalog estimates: ${loggedPurineLevels.low} low · ${loggedPurineLevels.medium} moderate · ${loggedPurineLevels.high} high${unclassifiedPurineFoods ? ` · ${unclassifiedPurineFoods} unclassified` : ''}. This is not a uric-acid measurement or personal target; portion size and your clinician’s advice matter.`;
  const conditionInsights = [
    profile.conditions.diabetes && {
      label: 'Diabetes',
      metric: hasLoggedFoodToday ? `${Math.round(totals.sugar)}g / ${targets.sugar}g sugar` : 'No food logged today',
      detail: 'Keep sugar within your personalized daily limit.',
      isWithinTarget: hasLoggedFoodToday && totals.sugar <= targets.sugar,
      statusLabel: hasLoggedFoodToday ? undefined : 'No food logged',
      statusTone: hasLoggedFoodToday ? undefined : 'neutral'
    },
    profile.conditions.gout && {
      label: 'Gout / uric acid',
      metric: hasLoggedFoodToday ? `${loggedPurineLevels.high} high-purine ${loggedPurineLevels.high === 1 ? 'food' : 'foods'} logged` : 'No food logged today',
      detail: goutDetail,
      statusLabel: goutStatus,
      statusTone: loggedPurineLevels.high > 0 ? 'caution' : !hasLoggedFoodToday || unclassifiedPurineFoods > 0 ? 'neutral' : 'positive'
    },
    profile.conditions.hypertension && {
      label: 'Hypertension',
      metric: hasLoggedFoodToday ? `${Math.round(totals.sodium)}mg / ${targets.sodium}mg sodium` : 'No food logged today',
      detail: 'Watch salty dishes, bagoong, patis, and processed foods.',
      isWithinTarget: hasLoggedFoodToday && totals.sodium <= targets.sodium,
      statusLabel: hasLoggedFoodToday ? undefined : 'No food logged',
      statusTone: hasLoggedFoodToday ? undefined : 'neutral'
    },
    profile.conditions.ckd && {
      label: 'Kidney health',
      metric: hasLoggedFoodToday ? `${Math.round(totals.protein)}g / ${targets.protein}g protein` : 'No food logged today',
      detail: 'Follow your personalized protein and sodium limits.',
      isWithinTarget: hasLoggedFoodToday && totals.protein <= targets.protein && totals.sodium <= targets.sodium,
      statusLabel: hasLoggedFoodToday ? undefined : 'No food logged',
      statusTone: hasLoggedFoodToday ? undefined : 'neutral'
    },
    profile.conditions.pcos && {
      label: 'PCOS',
      metric: hasLoggedFoodToday ? `${Math.round(totals.carbs)}g carbs · ${Math.round(totals.sugar)}g sugar` : 'No food logged today',
      detail: 'These are food-log estimates, not a prescribed PCOS target. Follow your clinician’s individualized nutrition advice.',
      statusLabel: hasLoggedFoodToday ? 'Nutrition estimate' : 'No food logged',
      statusTone: 'neutral'
    },
    (profile.conditions.dyslipidemia || profile.conditions.heartDisease) && {
      label: profile.conditions.heartDisease ? 'Heart health' : 'Cholesterol',
      metric: hasLoggedFoodToday ? `${Math.round(totals.fat)}g / ${targets.fat}g fat` : 'No food logged today',
      detail: 'Prefer lean protein and limit heavily fried dishes.',
      isWithinTarget: hasLoggedFoodToday && totals.fat <= targets.fat,
      statusLabel: hasLoggedFoodToday ? undefined : 'No food logged',
      statusTone: hasLoggedFoodToday ? undefined : 'neutral'
    },
    profile.conditions.osteoporosis && {
      label: 'Bone health',
      metric: !hasLoggedFoodToday
        ? 'No food logged today'
        : hasCompleteMicronutrientData('calcium')
          ? `${Math.round(totals.micronutrients.calcium)}mg calcium`
          : '— calcium (incomplete catalog data)',
      detail: !hasLoggedFoodToday
        ? 'Log meals to see estimated calcium intake. This is not a clinical assessment.'
        : hasCompleteMicronutrientData('calcium')
          ? 'Include calcium-rich foods across your meals.'
          : 'Some logged foods do not have catalog calcium values, so the total is incomplete.',
      statusLabel: !hasLoggedFoodToday ? 'No food logged' : hasCompleteMicronutrientData('calcium') ? 'Nutrition estimate' : 'Incomplete data',
      statusTone: 'neutral'
    },
    profile.conditions.gerd && {
      label: 'GERD',
      metric: `${todayLog.length} logged ${todayLog.length === 1 ? 'food' : 'foods'} today`,
      detail: 'Common triggers vary from person to person. Use your log to notice patterns and follow your clinician’s advice; this app does not diagnose reflux triggers.',
      statusLabel: 'General guidance',
      statusTone: 'neutral'
    },
    profile.conditions.anemia && {
      label: 'Anemia',
      metric: !hasLoggedFoodToday
        ? 'No food logged today'
        : hasCompleteMicronutrientData('iron')
          ? `${Math.round(totals.micronutrients.iron)}mg estimated iron`
          : '— iron (incomplete catalog data)',
      detail: !hasLoggedFoodToday
        ? 'Log meals to see estimated iron intake. Food logs cannot assess anemia or replace lab tests and clinician guidance.'
        : hasCompleteMicronutrientData('iron')
          ? 'Food-log iron values are rough estimates and cannot assess anemia or replace lab tests and clinician guidance.'
          : 'Some logged foods do not have catalog iron values. Food-log estimates cannot assess anemia or replace lab tests and clinician guidance.',
      statusLabel: !hasLoggedFoodToday ? 'No food logged' : hasCompleteMicronutrientData('iron') ? 'Nutrition estimate' : 'Incomplete data',
      statusTone: 'neutral'
    }
  ].filter(Boolean);

  return (
    <div className="native-screen native-screen--health mx-auto min-h-full w-full max-w-7xl space-y-5 bg-transparent p-4 pb-8 dark:bg-slate-950 sm:space-y-6 sm:p-6 sm:pb-10">
      <header className="overflow-hidden rounded-[2rem] border border-emerald-100 bg-gradient-to-br from-amber-100 via-lime-100 to-emerald-200 p-5 shadow-sm dark:border-emerald-900/60 dark:from-emerald-950 dark:via-emerald-900 dark:to-green-800 sm:p-7">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-emerald-800 dark:text-emerald-100">Your health, at a glance</p>
            <h2 className="mt-1 text-2xl font-black tracking-tight text-emerald-950 dark:text-white sm:text-3xl">Health &amp; nutrition</h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-emerald-950/75 dark:text-emerald-50/80">Review your recorded readings and food-log trends. These estimates are for tracking only, not a medical assessment.</p>
          </div>
          <div className="flex min-w-48 items-center gap-3 rounded-2xl border border-white/60 bg-white/70 px-4 py-3 shadow-sm dark:border-white/10 dark:bg-slate-950/25">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-lg dark:bg-white/10">⚖️</span>
            <div className="min-w-0">
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-900/70 dark:text-emerald-100/80">Profile BMI</p>
              <p className="text-xl font-black text-emerald-950 dark:text-white">{bmi || '—'}</p>
              <p className="text-xs font-bold text-emerald-900/80 dark:text-emerald-50">{bmiCategory?.label || 'Add height and weight'}</p>
              {bmiCategory && <p className="mt-0.5 text-[10px] text-emerald-900/70 dark:text-emerald-100/70">Range {bmiCategory.range} · screening only</p>}
            </div>
          </div>
        </div>
      </header>

      <div data-tour-target="health-vital-summary" className="grid gap-3 sm:grid-cols-3">
        {[
          ['Weight', profile.weight ? `${profile.weight} kg` : 'Not recorded', 'Profile baseline', 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-200', Boolean(profile.weight)],
          ['Blood pressure', latestBp != null ? `${latestBp} mmHg` : 'Not recorded', 'Latest reading', 'bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-200', latestBp != null],
          ['Glucose', latestGlucose != null ? `${latestGlucose} mg/dL` : 'Not recorded', 'Latest reading', 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-200', latestGlucose != null]
        ].map(([label, value, caption, color, isTracked]) => (
          <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">{label}</p>
                <p className="mt-2 text-lg font-black text-slate-800 dark:text-slate-100">{value}</p>
                <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">{caption}</p>
              </div>
              <span className={`rounded-xl px-2 py-1 text-xs font-bold ${color}`}>{isTracked ? 'Tracked' : 'Not set'}</span>
            </div>
          </div>
        ))}
      </div>

      <div data-tour-target="health-nutrition-report" className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-teal-700 dark:text-teal-300">Nutrition progress</p>
            <h3 className="mt-1 text-sm font-black text-slate-800 dark:text-slate-100">{reportPeriod === 7 ? 'Weekly' : 'Monthly'} intake report</h3>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">Based on your logged meals and current daily targets</p>
          </div>
          <div className="flex w-fit rounded-xl bg-slate-100 p-1 dark:bg-slate-800" role="group" aria-label="Nutrition report period">
            {[7, 30].map((period) => (
              <button
                key={period}
                type="button"
                onClick={() => setReportPeriod(period)}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${reportPeriod === period ? 'bg-white text-teal-700 shadow-sm dark:bg-slate-700 dark:text-teal-200' : 'text-slate-600 dark:text-slate-300'}`}
              >
                {period === 7 ? '7 days' : '30 days'}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            ['Average calories', activeNutritionDays ? `${averageCalories} kcal` : '—', 'per logged day'],
            ['Goal days', activeNutritionDays ? `${goalDays}/${activeNutritionDays}` : '—', 'of days with food logs'],
            ['Protein', `${Math.round(periodTotals.protein)}g`, 'period total'],
            ['Fiber', `${Math.round(periodTotals.micronutrients.fiber)}g`, 'estimated period total']
          ].map(([label, value, caption]) => (
            <div key={label} className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-800/80">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">{label}</p>
              <p className="mt-1 text-sm font-black text-slate-800 dark:text-slate-100">{value}</p>
              <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">{caption}</p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs leading-5 text-slate-500 dark:text-slate-400">Food values are estimates; recipes, brands, and serving sizes can change actual nutrition.</p>

        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">Calorie trend</p>
            <p className="text-xs text-slate-600 dark:text-slate-400">Target: {targets.cal} kcal/day</p>
          </div>
          <div className="flex h-32 items-end gap-1 border-b border-slate-100 px-1 dark:border-slate-700" style={{ gridTemplateColumns: `repeat(${reportPeriod}, minmax(0, 1fr))` }}>
            {dailyNutrition.map((day, index) => (
              <div key={day.date} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1" title={`${day.date}: ${day.totals.calories} kcal`}>
                <div className={`w-full max-w-5 rounded-t-md transition-all ${day.totals.calories > targets.cal ? 'bg-rose-400' : 'bg-teal-400'}`} style={{ height: `${Math.max((day.totals.calories / chartMaximum) * 100, day.itemCount ? 4 : 0)}%` }} />
                {(reportPeriod === 7 || index % 5 === 0) && <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">{day.label}</span>}
              </div>
            ))}
          </div>
        </div>
      </div>

      {healthLogError && <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs font-semibold text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-200" role="status">{healthLogError}</div>}

      <div data-tour-target="health-condition-analysis" className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-5">
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-teal-700 dark:text-teal-300">Condition analysis</p>
            <h3 className="mt-1 text-sm font-black text-slate-800 dark:text-slate-100">Nutrition and health conditions</h3>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">Food-log estimates and general guidance for your selected conditions</p>
          </div>
          <span className="text-xs font-bold text-slate-600 dark:text-slate-300">{conditionInsights.length} tracked</span>
        </div>
        {conditionInsights.length === 0 ? (
          <div className="rounded-2xl bg-slate-50 p-4 text-center text-sm text-slate-600 dark:bg-slate-800 dark:text-slate-300">Add a health condition in your profile to see nutrition guidance here.</div>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {conditionInsights.map((insight) => (
              <div key={insight.label} className="rounded-2xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/80">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-wide text-slate-800 dark:text-slate-100">{insight.label}</p>
                    <p className="mt-1 text-xs font-black text-slate-800 dark:text-slate-100">{insight.metric}</p>
                  </div>
                  <span className={`rounded-lg px-2 py-1 text-xs font-bold ${insight.statusTone === 'neutral' ? 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200' : insight.statusTone === 'caution' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200' : insight.statusTone === 'positive' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200' : insight.isWithinTarget ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200' : 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-200'}`}>
                    {insight.statusLabel || (insight.isWithinTarget ? 'Within target' : 'Review intake')}
                  </span>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-300">{insight.detail}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div data-tour-target="health-vital-trends" className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-5">
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-teal-700 dark:text-teal-300">Health trends</p>
            <h3 className="mt-1 text-sm font-black text-slate-800 dark:text-slate-100">Recent vital readings</h3>
          </div>
          <span className="text-xs text-slate-600 dark:text-slate-400">Last {recentHealthLogs.length} entries</span>
        </div>
        {recentHealthLogs.length === 0 ? (
          <p className="rounded-2xl bg-slate-50 p-4 text-center text-sm text-slate-500 dark:bg-slate-800 dark:text-slate-300">Vital tracking is optional. Add a reading above whenever you want to track it.</p>
        ) : <div className="grid gap-4 sm:grid-cols-3">
          {[
            ['Weight', 'weight', 'kg', 'bg-amber-400'],
            ['Blood pressure', 'bp', 'mmHg', 'bg-rose-400'],
            ['Glucose', 'glucose', 'mg/dL', 'bg-blue-400']
          ].map(([label, key, unit, color]) => {
            const metricEntries = recentHealthLogs
              .filter((entry) => entry[key] != null)
              .map((entry) => {
                const displayValue = String(entry[key]);
                const readings = key === 'glucose' ? displayValue.split('-').map(Number) : [Number(displayValue)];
                const plottedValue = readings.reduce((total, reading) => total + reading, 0) / readings.length;
                return { ...entry, displayValue, plottedValue };
              })
              .filter((entry) => Number.isFinite(entry.plottedValue));
            const values = metricEntries.map((entry) => entry.plottedValue);
            const minimum = Math.min(...values, 0);
            const maximum = Math.max(...values, 1);
            const range = maximum - minimum || 1;
            const latestEntry = metricEntries.at(-1);
            return (
              <div key={key} className="rounded-2xl border border-slate-100 bg-slate-50/80 p-3 dark:border-slate-700 dark:bg-slate-800/80">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">{label}</p>
                    <p className="mt-1 text-xl font-black tracking-tight text-slate-800 dark:text-slate-100">{latestEntry?.displayValue || 'Not recorded'}{latestEntry && <span className="ml-1 text-xs font-bold text-slate-600 dark:text-slate-300">{unit}</span>}</p>
                  </div>
                  <span className={`h-2.5 w-2.5 rounded-full ${color}`} aria-hidden="true" />
                </div>
                <div className="mt-4 flex h-24 items-end gap-1.5 border-b border-slate-200 px-1 dark:border-slate-700">
                  {metricEntries.map((entry) => {
                    const value = entry.plottedValue;
                    const height = value ? 24 + ((value - minimum) / range) * 76 : 4;
                    return (
                      <div key={`${key}-${entry.date}`} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1" title={`${entry.date}: ${entry.displayValue} ${unit}`}>
                        <span className="max-w-14 truncate text-[10px] font-bold text-slate-700 dark:text-slate-200">{entry.displayValue}</span>
                        <div className={`w-full max-w-5 rounded-t-md ${color}`} style={{ height: `${height}%` }} />
                        <span className="whitespace-nowrap text-xs font-bold text-slate-700 dark:text-slate-200">{entry.date.slice(5).replace('-', '/')}</span>
                      </div>
                    );
                  })}
                  {metricEntries.length === 0 && <p className="m-auto text-xs font-medium text-slate-500 dark:text-slate-400">No readings yet</p>}
                </div>
              </div>
            );
          })}
        </div>}
      </div>

      <div data-tour-target="health-vital-entry" className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-5">
        <div className="mb-4">
          <p className="text-xs font-bold uppercase tracking-wider text-teal-700 dark:text-teal-300">New entry</p>
          <h3 className="mt-1 text-sm font-black text-slate-800 dark:text-slate-100">Log today’s vitals</h3>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">Optional — you can use dietary tracking and reminders without recording any vital readings.</p>
        </div>

        <form onSubmit={handleAddHealthLog} className="grid gap-3 sm:grid-cols-3">
          {[
            ['Weight (kg)', 'e.g. 65.5', newWeight, setNewWeight, false],
            ['BP (mmHg)', 'whole number', newBp, setNewBp, true],
            ['Glucose (mg/dL)', 'e.g. 80-100', newGlucose, setNewGlucose, true, true]
          ].map(([label, placeholder, value, setter, integerOnly, allowRange]) => (
            <label key={label} className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
              {label} <span className="font-medium normal-case text-slate-500">(optional)</span>
              <input
                type="text"
                inputMode={allowRange ? 'text' : integerOnly ? 'numeric' : 'decimal'}
                min="0"
                placeholder={placeholder}
                value={value}
                onChange={(event) => handleVitalInput(setter, event.target.value, integerOnly, allowRange)}
                className="no-number-spinner mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-semibold text-slate-800 outline-none transition placeholder:text-slate-300 focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:bg-slate-700"
              />
            </label>
          ))}
          <button type="submit" className="primary-action group flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold sm:col-span-3">
            <svg className="h-4 w-4 transition-transform group-hover:scale-110" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 12.5 9.5 17 19 7.5" />
            </svg>
            Save
          </button>
        </form>
      </div>

      <div data-tour-target="health-vital-history" className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-5">
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-teal-700 dark:text-teal-300">History</p>
            <h3 className="mt-1 text-sm font-black text-slate-800 dark:text-slate-100">Recent health logs</h3>
          </div>
          <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">{healthLogs.length} entries</span>
        </div>
        <div className="health-log-grid mb-2 hidden grid-cols-2 gap-3 px-3 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 sm:grid sm:grid-cols-[1.2fr_1fr_1fr_1fr_auto] sm:text-center">
          <div className="grid grid-cols-2 sm:contents">
            <span>Date</span>
            <span>Weight</span>
            <span>BP</span>
            <span>Glucose</span>
          </div>
          <span aria-hidden="true" />
        </div>
        <div className="space-y-2">
          {healthLogs.length === 0 && <p className="rounded-2xl bg-slate-50 p-4 text-center text-sm text-slate-500 dark:bg-slate-800 dark:text-slate-300">No vital readings recorded yet. Your entries will appear here.</p>}
          {healthLogs.map((hl) => (
            <div key={hl.id} className="health-log-grid grid grid-cols-[1fr_auto] items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-3 py-3 text-center text-xs dark:border-slate-700 dark:bg-slate-800 sm:grid-cols-[1.2fr_1fr_1fr_1fr_auto]">
              <div className="grid grid-cols-2 gap-3 sm:contents">
                <span className="font-black tracking-tight text-slate-800 dark:text-slate-100">{hl.date}</span>
                <span className="font-bold text-slate-800 dark:text-slate-100"><span className="text-xs font-medium uppercase text-slate-600 dark:text-slate-300 sm:hidden">Weight </span>{hl.weight ?? '—'}{hl.weight != null ? 'kg' : ''}</span>
                <span className="font-bold text-rose-600"><span className="text-xs font-medium uppercase text-slate-600 dark:text-slate-300 sm:hidden">BP </span>{hl.bp ?? '—'}</span>
                <span className="font-bold text-blue-600"><span className="text-xs font-medium uppercase text-slate-600 dark:text-slate-300 sm:hidden">Glucose </span>{hl.glucose != null ? `${hl.glucose} mg/dL` : '—'}</span>
              </div>
              <button
                type="button"
                onClick={() => setHealthLogPendingDeletion(hl)}
                aria-label={`Delete health log from ${hl.date}`}
                className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition hover:bg-rose-100 hover:text-rose-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 dark:text-slate-400 dark:hover:bg-rose-900/40 dark:hover:text-rose-300"
              >
                <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3.5 5.5h13M8 5.5V3.8h4v1.7m-6.5 0 .7 10.7h7.6l.7-10.7M8 8.5v5M12 8.5v5" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      </div>
      {healthLogPendingDeletion && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <section
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-health-log-title"
            aria-describedby="delete-health-log-description"
            className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-700 dark:bg-slate-900"
          >
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300" aria-hidden="true">!</div>
            <h2 id="delete-health-log-title" className="text-base font-black text-slate-900 dark:text-slate-100">Delete this health log?</h2>
            <p id="delete-health-log-description" className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">This will permanently remove the reading from {healthLogPendingDeletion.date}.</p>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setHealthLogPendingDeletion(null)} className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700 dark:border-slate-700 dark:text-slate-200">Cancel</button>
              <button
                type="button"
                onClick={async () => {
                  await handleRemoveHealthLog(healthLogPendingDeletion.id);
                  setHealthLogPendingDeletion(null);
                }}
                className="rounded-xl bg-rose-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-rose-700"
              >
                Delete
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

import React, { useState } from 'react';
import { formatReminderTime, getExactNotificationPermission, getNotificationPermission, isNativeApp, requestExactNotificationPermission, requestNotificationPermission } from '../../services/notificationService';

export default function Dashboard({ profile, log, totals, targets, reminders, setReminders, setActiveTab }) {
  const emptyReminder = { title: '', type: 'meal', time: '08:00', repeat: 'daily', active: true };
  const [reminderForm, setReminderForm] = useState(emptyReminder);
  const [editingReminderId, setEditingReminderId] = useState(null);
  const [isReminderFormOpen, setIsReminderFormOpen] = useState(false);
  const [inAppReminder, setInAppReminder] = useState(null);
  const [reminderError, setReminderError] = useState('');
  const [notificationPermission, setNotificationPermission] = useState(() => (
    'Notification' in window ? window.Notification.permission : 'default'
  ));
  const [isNative, setIsNative] = useState(null);
  const [exactAlarmPermission, setExactAlarmPermission] = useState('unsupported');
  const micronutrients = totals.micronutrients || {};
  const micronutrientCoverage = totals.micronutrientCoverage || {};
  const getProgressColor = (current, max) => {
    const pct = (current / max) * 100;
    if (pct < 60) return 'bg-green-500';
    if (pct < 90) return 'bg-yellow-500';
    if (pct <= 100) return 'bg-teal-500';
    return 'bg-red-500';
  };

  React.useEffect(() => {
    isNativeApp().then((native) => {
      setIsNative(native);
      return Promise.all([getNotificationPermission(), native ? getExactNotificationPermission() : Promise.resolve('unsupported')]);
    }).then(([notificationStatus, exactStatus]) => {
      setNotificationPermission(notificationStatus);
      setExactAlarmPermission(exactStatus);
    }).catch(() => setIsNative(false));
  }, []);

  React.useEffect(() => {
    const handleReminderEvent = (event) => setInAppReminder(event.detail);
    const handleReminderError = () => setReminderError('Notifications could not be scheduled. Check notification and exact-alarm permissions in Android settings.');
    window.addEventListener('food-for-fitness:reminder', handleReminderEvent);
    window.addEventListener('food-for-fitness:reminder-error', handleReminderError);
    return () => {
      window.removeEventListener('food-for-fitness:reminder', handleReminderEvent);
      window.removeEventListener('food-for-fitness:reminder-error', handleReminderError);
    };
  }, []);

  const openReminderForm = (reminder = emptyReminder) => {
    setReminderForm({ ...emptyReminder, ...reminder });
    setEditingReminderId(reminder.id || null);
    setIsReminderFormOpen(true);
  };

  const saveReminder = (event) => {
    event.preventDefault();
    if (!reminderForm.title.trim()) return;

    if (editingReminderId) {
      setReminders(reminders.map((reminder) => (
        reminder.id === editingReminderId ? { ...reminder, ...reminderForm, title: reminderForm.title.trim() } : reminder
      )));
    } else {
      setReminders([
        ...reminders,
        { ...reminderForm, title: reminderForm.title.trim(), id: Date.now() }
      ]);
    }

    setReminderForm(emptyReminder);
    setEditingReminderId(null);
    setIsReminderFormOpen(false);
  };

  const removeReminder = (reminderId) => {
    setReminders(reminders.filter((reminder) => reminder.id !== reminderId));
  };

  const requestNotifications = async () => {
    const permission = await requestNotificationPermission();
    setNotificationPermission(permission);
  };

  const requestExactAlarms = async () => {
    const permission = await requestExactNotificationPermission();
    setExactAlarmPermission(permission);
  };


  return (
    <div className="native-screen native-screen--dashboard mx-auto grid min-h-full w-full max-w-7xl grid-cols-1 items-start gap-4 bg-transparent p-4 pb-8 dark:bg-slate-950 sm:gap-5 sm:p-6 sm:pb-10 lg:grid-cols-12 lg:gap-6 animate-in fade-in">
      <div className="native-dashboard-greeting flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between lg:col-span-12">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-300">Your wellness, at a glance</p>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100 sm:text-3xl">Good day, {profile.name || 'Kaibigan'} <span aria-hidden="true">🌿</span></h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Small, balanced choices add up. Here&apos;s your progress today.</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => setActiveTab('tracker')} className="rounded-2xl border border-emerald-200 bg-white px-4 py-2.5 text-sm font-bold text-emerald-800 shadow-sm transition hover:border-emerald-400 hover:bg-emerald-50 dark:border-slate-700 dark:bg-slate-900 dark:text-emerald-200 dark:hover:bg-slate-800">＋ Log food</button>
          <button type="button" onClick={() => setActiveTab('scan')} className="primary-action rounded-2xl px-4 py-2.5 text-sm font-bold">Scan ingredients</button>
        </div>
      </div>

      <div className="contents lg:col-span-7 lg:flex lg:flex-col lg:gap-5">
      <div data-tour-target="dashboard-nutrition" className="order-1 overflow-hidden rounded-[2rem] bg-gradient-to-br from-amber-100 via-lime-100 to-emerald-200 p-5 text-emerald-950 shadow-xl shadow-emerald-100/70 dark:from-emerald-950 dark:via-emerald-900 dark:to-green-800 dark:text-white dark:shadow-emerald-900/40 sm:p-6 lg:order-none">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-800 dark:text-emerald-100">Today&apos;s nutrition</p>
          </div>
          <span className="shrink-0 rounded-full bg-white/70 px-3 py-1 text-[10px] font-bold text-emerald-900 dark:bg-white/15 dark:text-emerald-50">{new Date().toLocaleDateString()}</span>
        </div>
        <div className="mb-4 text-center">
          <div className="text-5xl font-black leading-none tracking-tight">{totals.calories}</div>
          <div className="text-emerald-800 text-xs dark:text-emerald-100">/ {targets.cal} kcal target</div>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-emerald-950/15">
            <div className={`h-full rounded-full transition-all ${getProgressColor(totals.calories, targets.cal)}`} style={{ width: `${Math.min((totals.calories / targets.cal) * 100, 100)}%` }} />
          </div>
          {totals.calories === 0 && <p className="mt-3 text-xs font-medium text-emerald-800 dark:text-emerald-100">Log your first meal to start tracking today&apos;s progress.</p>}
        </div>
        <div className="grid grid-cols-3 gap-2 border-t border-emerald-900/15 pt-4 text-center dark:border-white/20">
          <div>
            <div className="mb-1 text-[10px] font-bold uppercase text-emerald-800 dark:text-emerald-100">Protein</div>
            <div className="text-sm font-black">{totals.protein}g <span className="text-[10px] font-normal text-emerald-800 dark:text-emerald-200">/{targets.protein}g</span></div>
            <div className="mt-1 h-1 rounded bg-emerald-950/15"><div className="h-full rounded bg-blue-500 dark:bg-blue-300" style={{width: `${Math.min((totals.protein / targets.protein) * 100, 100)}%`}}></div></div>
          </div>
          <div>
            <div className="mb-1 text-[10px] font-bold uppercase text-emerald-800 dark:text-emerald-100">Carbs</div>
            <div className="text-sm font-black">{totals.carbs}g <span className="text-[10px] font-normal text-emerald-800 dark:text-emerald-200">/{targets.carbs}g</span></div>
            <div className="mt-1 h-1 rounded bg-emerald-950/15"><div className="h-full rounded bg-amber-500 dark:bg-yellow-300" style={{width: `${Math.min((totals.carbs / targets.carbs) * 100, 100)}%`}}></div></div>
          </div>
          <div>
            <div className="mb-1 text-[10px] font-bold uppercase text-emerald-800 dark:text-emerald-100">Fat</div>
            <div className="text-sm font-black">{totals.fat}g <span className="text-[10px] font-normal text-emerald-800 dark:text-emerald-200">/{targets.fat}g</span></div>
            <div className="mt-1 h-1 rounded bg-emerald-950/15"><div className="h-full rounded bg-rose-500 dark:bg-red-300" style={{width: `${Math.min((totals.fat / targets.fat) * 100, 100)}%`}}></div></div>
          </div>
        </div>
      </div>

      <div data-tour-target="dashboard-micronutrients" className="order-3 rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:order-none">
        <div className="flex justify-between items-center mb-3">
          <div>
            <h3 className="font-black text-gray-800 text-sm dark:text-slate-100">Micronutrient Summary</h3>
            <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">Estimated totals from today&apos;s logged servings</p>
          </div>
          <span className="text-xs font-bold text-teal-700 dark:text-teal-300">Per day</span>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            ['Fiber', micronutrients.fiber, 'g', 'fiber'],
            ['Calcium', micronutrients.calcium, 'mg', 'calcium'],
            ['Iron', micronutrients.iron, 'mg', 'iron'],
            ['Potassium', micronutrients.potassium, 'mg', 'potassium'],
            ['Vitamin A', micronutrients.vitaminA, 'mcg', 'vitaminA'],
            ['Vitamin C', micronutrients.vitaminC, 'mg', 'vitaminC'],
            ['Vitamin D', micronutrients.vitaminD, 'mcg', 'vitaminD'],
            ['Vitamin B12', micronutrients.vitaminB12, 'mcg', 'vitaminB12']
          ].map(([label, value, unit, nutrient]) => {
            const coverage = micronutrientCoverage[nutrient];
            const isIncomplete = coverage && coverage.known < coverage.total;
            return (
              <div key={label} data-tour-target={`dashboard-micro-${String(label).toLowerCase().replaceAll(' ', '-')}`} className="rounded-2xl bg-slate-50 p-2.5 dark:bg-slate-800/80">
                <p className="text-[9px] font-bold uppercase tracking-wide text-gray-400 dark:text-slate-400">{label}</p>
                <p className="mt-1 text-xs font-black text-gray-800 dark:text-slate-100">
                  {isIncomplete ? '—' : Number(value || 0).toFixed(1)}
                  {!isIncomplete && <span className="ml-0.5 text-[9px] font-medium text-gray-400 dark:text-slate-400">{unit}</span>}
                </p>
              </div>
            );
          })}
        </div>
        {Object.values(micronutrientCoverage).some(({ known, total }) => known < total) && (
          <p className="mt-3 text-[11px] leading-5 text-amber-700 dark:text-amber-300">
            Some logged foods have no verified value for every nutrient. Those totals are shown as — instead of guessing.
          </p>
        )}
      </div>
      </div>

      <div className="contents lg:col-span-5 lg:flex lg:flex-col lg:gap-5">
      <div data-tour-target="dashboard-clinical" className="order-2 space-y-4 rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:order-none">
        <div className="flex justify-between items-center">
          <h3 className="font-black text-gray-800 text-sm dark:text-slate-100">Daily intake guide</h3>
          <span className="rounded-lg bg-teal-50 px-2.5 py-1 text-[10px] font-bold text-teal-700 dark:bg-teal-900/40 dark:text-teal-200">Nutrition estimates</span>
        </div>
        {log.length === 0 ? (
          <p className="rounded-2xl bg-slate-50 p-4 text-xs leading-5 text-slate-600 dark:bg-slate-800 dark:text-slate-300">Log a meal to see food-based sugar and sodium estimates here. These are tracking guides, not medical measurements.</p>
        ) : (
          <>
        <div>
          <div className="mb-1 flex justify-between text-xs">
            <span className="font-medium text-gray-600 dark:text-slate-300">Sugar Limit</span>
            <span className={`font-bold ${totals.sugar > targets.sugar ? 'text-red-500' : 'text-gray-800 dark:text-slate-100'}`}>{totals.sugar}g / {targets.sugar}g</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-slate-800"><div className={`h-full rounded-full ${totals.sugar > targets.sugar ? 'bg-red-500' : 'bg-blue-400'}`} style={{ width: `${Math.min((totals.sugar / targets.sugar) * 100, 100)}%` }} /></div>
          {totals.sugar > targets.sugar && <p className="mt-1 text-xs font-medium text-red-500">⚠️ Sugar limit exceeded. Switch to low-GI Filipino dishes.</p>}
        </div>
        <div>
          <div className="mb-1 flex justify-between text-xs">
            <span className="font-medium text-gray-600 dark:text-slate-300">Sodium Limit</span>
            <span className={`font-bold ${totals.sodium > targets.sodium ? 'text-red-500' : 'text-gray-800 dark:text-slate-100'}`}>{totals.sodium}mg / {targets.sodium}mg</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-slate-800"><div className={`h-full rounded-full ${totals.sodium > targets.sodium ? 'bg-red-500' : 'bg-orange-400'}`} style={{ width: `${Math.min((totals.sodium / targets.sodium) * 100, 100)}%` }} /></div>
          {totals.sodium > targets.sodium && <p className="mt-1 text-xs font-medium text-red-500">⚠️ High sodium detected. Limit bagoong, patis, and canned goods.</p>}
        </div>
          </>
        )}
      </div>

      <div data-tour-target="dashboard-reminders" className="order-4 rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:order-none">
        {inAppReminder && (
          <div className="mb-4 flex items-center gap-3 rounded-2xl border border-teal-200 bg-teal-50 p-3" role="status">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-100 text-xl">🔔</span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-black text-teal-950">Reminder now</p>
              <p className="truncate text-xs font-semibold text-teal-800">{inAppReminder.title}</p>
            </div>
            <button type="button" onClick={() => setInAppReminder(null)} className="rounded-lg px-2 py-1 text-xs font-bold text-teal-700 hover:bg-teal-100">Dismiss</button>
          </div>
        )}
        {reminderError && (
          <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs font-semibold text-amber-800" role="alert">
            {reminderError}
            <button type="button" onClick={() => setReminderError('')} className="ml-2 font-black underline">Dismiss</button>
          </div>
        )}
        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-100 text-lg dark:bg-teal-900/40">🔔</span>
              <div>
                <h3 className="font-bold text-gray-800 text-sm dark:text-slate-100">Health Reminders</h3>
                <p className="mt-0.5 text-xs text-gray-500 dark:text-slate-400">Meal, hydration, medication, and health alerts</p>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {((isNative === false && notificationPermission === 'default') || (isNative === true && notificationPermission === 'denied')) && (
              <button type="button" onClick={requestNotifications} className="rounded-xl border border-teal-200 px-3 py-2 text-xs font-bold text-teal-700 hover:bg-teal-50 dark:border-teal-700 dark:text-teal-300 dark:hover:bg-slate-800">
                {isNative ? 'Enable notifications' : 'Allow notifications'}
              </button>
            )}
            {isNative === true && exactAlarmPermission === 'denied' && (
              <button type="button" onClick={requestExactAlarms} className="rounded-xl border border-amber-200 px-3 py-2 text-xs font-bold text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-300 dark:hover:bg-slate-800">
                Enable exact reminders
              </button>
            )}
            <button type="button" onClick={() => openReminderForm()} className="primary-action rounded-xl px-3 py-2 text-xs font-bold">+ Add reminder</button>
          </div>
        </div>
        {isReminderFormOpen && (
          <form onSubmit={saveReminder} className="dashboard-reminder-form mb-3 grid gap-3 rounded-2xl border border-teal-100 bg-teal-50 p-3 sm:grid-cols-2">
            <label className="text-xs font-bold text-slate-700 sm:col-span-2">
              Reminder name
              <input required value={reminderForm.title} onChange={(event) => setReminderForm({ ...reminderForm, title: event.target.value })} placeholder="e.g. Drink water" className="mt-1.5 w-full rounded-xl border border-teal-100 bg-white px-3 py-2.5 text-sm font-medium text-slate-800 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100" />
            </label>
            <label className="text-xs font-bold text-slate-700">
              Type
              <select value={reminderForm.type} onChange={(event) => setReminderForm({ ...reminderForm, type: event.target.value })} className="mt-1.5 w-full rounded-xl border border-teal-100 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-teal-500">
                <option value="meal">Meal</option>
                <option value="water">Hydration</option>
                <option value="medication">Medication</option>
                <option value="health">Health check</option>
              </select>
            </label>
            <label className="text-xs font-bold text-slate-700">
              Time
              <input type="time" value={reminderForm.time} onChange={(event) => setReminderForm({ ...reminderForm, time: event.target.value })} className="mt-1.5 w-full rounded-xl border border-teal-100 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-teal-500" />
            </label>
            <label className="text-xs font-bold text-slate-700">
              Repeat
              <select value={reminderForm.repeat} onChange={(event) => setReminderForm({ ...reminderForm, repeat: event.target.value })} className="mt-1.5 w-full rounded-xl border border-teal-100 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-teal-500">
                <option value="daily">Every day</option>
                <option value="weekdays">Weekdays</option>
                <option value="once">Once</option>
              </select>
            </label>
            <div className="flex items-end justify-end gap-2 sm:col-span-2">
              <button type="button" onClick={() => setIsReminderFormOpen(false)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-slate-600">Cancel</button>
              <button type="submit" className="primary-action rounded-xl px-4 py-2.5 text-xs font-bold">{editingReminderId ? 'Save changes' : 'Save reminder'}</button>
            </div>
          </form>
        )}

        <div className="space-y-2">
          {reminders.length === 0 && <p className="rounded-2xl bg-slate-50 p-4 text-center text-sm text-slate-500 dark:bg-slate-800 dark:text-slate-300">No reminders yet. Add one to get started.</p>}
          {reminders.map(rem => (
            <div key={rem.id} className={`flex flex-col gap-3 rounded-2xl border p-3 transition sm:flex-row sm:items-center sm:justify-between ${rem.active ? 'border-teal-100 bg-teal-50/50 dark:border-teal-800 dark:bg-teal-900/20' : 'border-slate-200 bg-slate-50 opacity-75 dark:border-slate-700 dark:bg-slate-800/70'}`}>
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-xl ${rem.type === 'water' ? 'bg-blue-100 dark:bg-blue-900/40' : rem.type === 'meal' ? 'bg-orange-100 dark:bg-orange-900/40' : rem.type === 'medication' ? 'bg-purple-100 dark:bg-purple-900/40' : 'bg-rose-100 dark:bg-rose-900/40'}`}>
                  {rem.type === 'water' ? '💧' : rem.type === 'meal' ? '🍲' : rem.type === 'medication' ? '💊' : '🩺'}
                </span>
                <div className="min-w-0">
                  <p className="break-words text-sm font-black text-gray-800 dark:text-slate-100">{rem.title}</p>
                  <p className="mt-0.5 text-xs font-semibold text-gray-600 dark:text-slate-300">{formatReminderTime(rem.time)} <span className="font-normal text-gray-400 dark:text-slate-400">· {rem.repeat || 'daily'}</span></p>
                </div>
              </div>
              <div className="flex items-center justify-between gap-2 sm:justify-end">
                <div className="flex items-center gap-1">
                  <button type="button" onClick={() => openReminderForm(rem)} className="rounded-lg px-2 py-1.5 text-xs font-bold text-teal-700 hover:bg-teal-100 dark:text-teal-300 dark:hover:bg-slate-700">Edit</button>
                  <button type="button" onClick={() => removeReminder(rem.id)} className="rounded-lg px-2 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-100 dark:text-rose-300 dark:hover:bg-slate-700">Delete</button>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={rem.active}
                  aria-label={`${rem.active ? 'Pause' : 'Activate'} ${rem.title}`}
                  onClick={() => setReminders(reminders.map((reminder) => reminder.id === rem.id ? { ...reminder, active: !reminder.active } : reminder))}
                  className={`flex items-center gap-2 rounded-xl px-2.5 py-1.5 text-xs font-bold transition ${rem.active ? 'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-200' : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-200'}`}
                >
                  <span className={`relative h-5 w-9 rounded-full transition ${rem.active ? 'bg-teal-600' : 'bg-slate-400'}`}>
                    <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition ${rem.active ? 'left-[18px]' : 'left-0.5'}`} />
                  </span>
                  {rem.active ? 'Active' : 'Paused'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
      </div>
    </div>
  );
}

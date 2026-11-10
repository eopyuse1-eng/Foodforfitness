import React, { useMemo, useState } from 'react';

export default function FoodLog({
  log,
  filteredFoods,
  isFoodCatalogLoading,
  searchQuery,
  setSearchQuery,
  handleAddFood,
  handleRemoveFood
}) {
  const [selectedCategory, setSelectedCategory] = useState('go');
  const [selectedDishType, setSelectedDishType] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [servingQuantities, setServingQuantities] = useState({});
  const pageSize = 10;
  const categoryFoods = useMemo(() => {
    return filteredFoods.filter((food) => (
      food.isDietary
      && food.foodGroup === selectedCategory
      && (selectedDishType === 'all' || food.dishType === selectedDishType)
    ));
  }, [filteredFoods, selectedCategory, selectedDishType]);
  const categoryLogs = useMemo(
    () => log.filter((item) => (
      item.isDietary
      && item.foodGroup === selectedCategory
      && (selectedDishType === 'all' || item.dishType === selectedDishType)
    )),
    [log, selectedCategory, selectedDishType]
  );
  const availableDishTypes = useMemo(() => {
    const dishTypes = new Set(
      filteredFoods
        .filter((food) => food.isDietary && food.foodGroup === selectedCategory)
        .map((food) => food.dishType)
    );
    return [
      ['all', 'All dishes'],
      ['main-dish', 'Main dishes'],
      ['appetizer', 'Appetizers'],
      ['side-dish', 'Side dishes'],
      ['salad', 'Salads']
    ].filter(([value]) => value === 'all' || value === selectedDishType || dishTypes.has(value));
  }, [filteredFoods, selectedCategory, selectedDishType]);
  const selectedDishTypeLabel = availableDishTypes.find(([value]) => value === selectedDishType)?.[1] || 'All dishes';

  const totalPages = Math.max(1, Math.ceil(categoryFoods.length / pageSize));
  const pagedFoods = categoryFoods.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  return (
    <div className="native-screen native-screen--food-log mx-auto grid min-h-full w-full max-w-screen-2xl grid-cols-1 items-start gap-5 bg-gradient-to-br from-emerald-50/50 via-transparent to-amber-50/40 p-4 pb-8 dark:from-[#13201f] dark:via-[#101918] dark:to-[#1f1b16] dark:bg-[#101817] sm:p-6 sm:pb-10 lg:grid-cols-12 lg:gap-6 2xl:gap-8">
      <div className="native-food-log-intro flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between lg:col-span-12">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">Food diary</p>
          <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-900 dark:text-slate-50 sm:text-4xl">Eat well, one meal at a time</h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600 dark:text-slate-400">Choose nourishing Filipino favorites and keep track of what you enjoy.</p>
          <p className="mt-1.5 flex items-start gap-1.5 text-xs leading-5 text-amber-700 dark:text-[#d4c394]">
            <span aria-hidden="true">ⓘ</span>
            <span>Nutrition values are estimates and may vary by recipe and serving size.</span>
          </p>
        </div>
        <p className="inline-flex items-center gap-2 self-start rounded-full border border-emerald-200/80 bg-white/90 px-4 py-2.5 text-sm font-bold text-emerald-900 shadow-sm dark:border-[#455544] dark:bg-[#1b2724] dark:text-[#d4c394] sm:self-auto">🌱 Filipino food, made mindful</p>
      </div>

      <div className="grid grid-cols-3 gap-2 rounded-3xl border border-emerald-100 bg-white/90 p-2 shadow-sm dark:border-[#303c3a] dark:bg-[#172220] lg:col-span-12" aria-label="Food log categories">
        {[
          ['go', 'Go'],
          ['grow', 'Grow'],
          ['glow', 'Glow']
        ].map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => { setSelectedCategory(value); setSelectedDishType('all'); setCurrentPage(1); }}
            aria-pressed={selectedCategory === value}
            className={`min-h-12 rounded-2xl border px-3 py-3 text-sm font-extrabold capitalize transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#172220] ${selectedCategory === value ? 'border-emerald-600 bg-gradient-to-r from-emerald-600 to-green-500 text-white shadow-md shadow-emerald-900/15' : 'border-transparent bg-slate-50 text-slate-600 hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-800 dark:bg-[#222e2c] dark:text-slate-300 dark:hover:border-emerald-700 dark:hover:bg-[#293734] dark:hover:text-emerald-200'}`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex min-w-0 flex-col gap-2 rounded-2xl border border-slate-200/80 bg-white/85 p-3 shadow-sm dark:border-[#303c3a] dark:bg-[#172220] sm:flex-row sm:items-center lg:col-span-12">
        <p className="shrink-0 px-1 text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Dish type</p>
        <div className="flex min-w-0 gap-2 overflow-x-auto pb-0.5">
          {availableDishTypes.map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => { setSelectedDishType(value); setCurrentPage(1); }}
              aria-pressed={selectedDishType === value}
              className={`shrink-0 rounded-full px-4 py-2.5 text-xs font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${selectedDishType === value ? 'bg-slate-900 text-white shadow-sm dark:bg-[#c7a86a] dark:text-[#17201d]' : 'bg-slate-100 text-slate-600 hover:bg-emerald-50 hover:text-emerald-800 dark:bg-[#222e2c] dark:text-slate-300 dark:hover:bg-[#2b3935] dark:hover:text-[#e5d7b4]'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <section className="rounded-[1.75rem] border border-slate-200/80 bg-white/95 p-4 shadow-sm dark:border-[#34413d] dark:bg-[#182320] sm:p-5 lg:col-span-12">
        <h2 className="mb-4 flex items-center justify-between gap-2 text-sm font-black text-gray-800 dark:text-slate-100">
          Today&apos;s {selectedDishType === 'all' ? `${selectedCategory[0].toUpperCase()}${selectedCategory.slice(1)}` : selectedDishTypeLabel}
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold capitalize text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200">{categoryLogs.length} logged</span>
        </h2>

        {categoryLogs.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-emerald-200 bg-gradient-to-br from-emerald-50 to-lime-50 px-4 py-12 text-center dark:border-[#465044] dark:from-[#202d29] dark:to-[#242922]">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-3xl shadow-sm dark:bg-[#303a32]" aria-hidden="true">🥗</span>
            <p className="mt-4 text-sm font-extrabold text-slate-800 dark:text-slate-100">No {selectedDishType === 'all' ? selectedCategory : selectedDishTypeLabel.toLowerCase()} meals yet</p>
            <p className="mx-auto mt-1 max-w-xs text-xs leading-5 text-slate-600 dark:text-slate-400">Choose a food from the list and add it here to begin your daily log.</p>
          </div>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {categoryLogs.map(item => (
              <div key={item.id} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-3 dark:border-[#3a4840] dark:bg-[#222e29]">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-2xl shadow-sm dark:bg-[#303b34]">{item.emoji}</div>
                  <div>
                    <p className="text-sm font-bold text-gray-800 dark:text-slate-100">{item.name}</p>
                    <p className="mt-0.5 text-[11px] text-gray-500 dark:text-slate-400">{item.recordedServing}x {item.serving} · {item.dishType?.replace('-', ' ')}</p>
                    <div className="mt-1 flex gap-1">
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-bold uppercase text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200">{item.foodGroup}</span>
                      {item.source === 'camera' && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-bold uppercase text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">Saved Meal</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <p className="text-sm font-black text-emerald-700 dark:text-emerald-300">{item.calories} kcal</p>
                  </div>
                  <button type="button" onClick={() => handleRemoveFood(item.id)} aria-label={`Remove ${item.name} from food log`} className="rounded-lg p-2 text-xs font-bold text-gray-400 transition hover:bg-rose-50 hover:text-red-500 dark:text-slate-500 dark:hover:bg-rose-950/40">✕</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-[1.75rem] border border-slate-200/80 bg-white/95 p-4 shadow-sm dark:border-[#34413d] dark:bg-[#182320] sm:p-5 lg:col-span-12">
        <div className="mb-2 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-black capitalize text-gray-800 dark:text-slate-100">{selectedDishType === 'all' ? `${selectedCategory} foods` : selectedDishTypeLabel}</h2>
            <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">{categoryFoods.length} curated options to explore</p>
          </div>
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-bold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200">{isFoodCatalogLoading && filteredFoods.length === 0 ? 'Loading...' : `${categoryFoods.length} available`}</span>
        </div>

        <input
          data-tour-target="food-log-search"
          type="text"
          placeholder={`Search ${selectedDishType === 'all' ? '' : `${selectedDishTypeLabel.toLowerCase()} `}${selectedCategory} foods`}
          className="mb-4 w-full rounded-2xl border border-gray-200 bg-slate-50 p-3.5 text-sm text-slate-700 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 dark:border-[#3b4943] dark:bg-[#222e29] dark:text-slate-100 dark:placeholder:text-slate-400 dark:focus:ring-emerald-900"
          value={searchQuery}
          onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
        />

        <div className="grid gap-3 pb-2 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {isFoodCatalogLoading && filteredFoods.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-emerald-200 bg-emerald-50/60 p-6 text-center text-sm text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-200 sm:col-span-2">
              Loading the Filipino food catalog...
            </div>
          ) : categoryFoods.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-6 text-center text-sm text-gray-500 dark:border-[#3a5054] dark:bg-[#19282c] dark:text-slate-400 sm:col-span-2 xl:col-span-3 2xl:col-span-4">
              No matching foods here. Try another dish type or search.
            </div>
          ) : pagedFoods.map((food) => (
            <div key={food.id} className="flex min-w-0 items-center justify-between gap-2 rounded-2xl border border-slate-100 bg-white p-3 shadow-sm transition hover:border-emerald-200 hover:shadow-md dark:border-[#3a4840] dark:bg-[#222e29] dark:hover:border-emerald-700">
              <div className="flex min-w-0 items-center gap-2.5">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-2xl dark:bg-[#304136]">{food.emoji}</div>
                <div>
                  <h4 className="text-sm font-bold text-gray-800 dark:text-slate-100">{food.name}</h4>
                  <span className="text-[11px] text-gray-500 dark:text-slate-400">{food.calories} kcal / {food.serving}<span className="block font-semibold capitalize text-emerald-700 dark:text-emerald-300">{food.dishType?.replace('-', ' ')}</span></span>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <label htmlFor={`food-quantity-${food.id}`} className="sr-only">Quantity for {food.name}</label>
                <input
                  id={`food-quantity-${food.id}`}
                  type="number"
                  min="1"
                  step="1"
                  inputMode="numeric"
                  value={servingQuantities[food.id] ?? '1'}
                  onChange={(event) => setServingQuantities((previous) => ({ ...previous, [food.id]: event.target.value }))}
                  onBlur={() => setServingQuantities((previous) => ({ ...previous, [food.id]: previous[food.id] || '1' }))}
                  className="no-number-spinner h-9 w-12 rounded-xl border border-gray-200 bg-slate-50 text-center text-xs font-bold text-gray-700 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 dark:border-[#48554b] dark:bg-[#303b34] dark:text-slate-100"
                  aria-label={`Quantity for ${food.name}`}
                />
                <button
                  type="button"
                  onClick={() => handleAddFood(food, Number.parseInt(servingQuantities[food.id], 10) || 1)}
                  className="primary-action flex h-9 items-center justify-center rounded-xl px-3 text-xs font-bold"
                  aria-label={`Add ${food.name}`}
                >
                  Add
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {totalPages > 1 && (
        <div className="mt-0 flex items-center justify-center gap-3 lg:col-span-12" aria-label="Food pages">
          <button
            type="button"
            onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
            disabled={currentPage === 1}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 transition hover:border-emerald-300 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-emerald-600 dark:hover:text-emerald-300"
            aria-label="Previous food page"
          >
            <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m12.5 4.5-5 5.5 5 5.5" />
            </svg>
          </button>
          <span className="min-w-20 text-center text-xs font-bold text-gray-600 dark:text-slate-300" aria-live="polite">
            {currentPage} / {totalPages}
          </span>
          <button
            type="button"
            onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
            disabled={currentPage === totalPages}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 transition hover:border-emerald-300 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-emerald-600 dark:hover:text-emerald-300"
            aria-label="Next food page"
          >
            <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m7.5 4.5 5 5.5-5 5.5" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}

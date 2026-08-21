import React from 'react';
import {
  PUBLIC_COMPARISON_ROWS,
  getPublicPackageComparisonValue,
  sortPublicComparisonCards,
} from '../core.js';

export function PackageComparison({
  cards,
  comparisonSort,
  lang,
  onSelectPackage,
  onShowDetails,
  onToggleSort,
}) {
  const sortedCards = sortPublicComparisonCards(cards, comparisonSort, lang);
  const sortMark = (key) => comparisonSort.key === key
    ? (comparisonSort.direction === 'asc' ? ' ↑' : ' ↓')
    : '';

  return (
    <div className='rounded-lg border border-slate-200 bg-white overflow-hidden'>
      <div className='flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3'>
        <div>
          <h2 className='text-base font-black text-slate-900'>{lang === 'en' ? 'Package comparison' : '套餐比較總表'}</h2>
          <p className='text-xs text-slate-500'>{lang === 'en' ? 'Each package is one row; tap headers to sort' : '每個套餐一列，點欄位可排序'}</p>
        </div>
      </div>
      <div className='max-h-[70vh] overflow-auto'>
        <table className='min-w-[980px] border-collapse text-sm'>
          <thead>
            <tr className='bg-slate-50'>
              <th className='sticky left-0 top-0 z-20 w-36 bg-slate-50 px-3 py-3 text-left text-xs font-black text-slate-600'><button className='text-left font-black' onClick={() => onToggleSort('package')}>{lang === 'en' ? 'Package' : '套餐'}{sortMark('package')}</button></th>
              {PUBLIC_COMPARISON_ROWS.map((row) => (
                <th key={row.key} className='sticky top-0 z-10 min-w-[150px] bg-slate-50 px-3 py-3 text-left text-xs font-black text-slate-600'><button className='text-left font-black' onClick={() => onToggleSort(row.key)}>{lang === 'en' ? row.labelEn : row.label}{sortMark(row.key)}</button></th>
              ))}
              <th className='sticky top-0 z-10 w-28 bg-slate-50 px-3 py-3 text-left text-xs font-black text-slate-600'>{lang === 'en' ? 'Action' : '操作'}</th>
            </tr>
          </thead>
          <tbody>
            {sortedCards.map((card) => (
              <tr key={card.name} className='border-t border-slate-100'>
                <th className='sticky left-0 z-10 bg-white px-3 py-3 text-left align-top'>
                  <button className='font-black text-slate-900 underline decoration-slate-300 underline-offset-4' onClick={() => onShowDetails(card)}>{card.name}</button>
                </th>
                {PUBLIC_COMPARISON_ROWS.map((row) => (
                  <td key={card.name + '-' + row.key} className='min-w-[150px] px-3 py-3 align-top text-slate-700 leading-relaxed'>
                    {getPublicPackageComparisonValue(card, row.key, lang)}
                  </td>
                ))}
                <td className='w-28 px-3 py-3 align-top'>
                  <button className='rounded-md border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700' onClick={() => onShowDetails(card)}>{lang === 'en' ? 'Details' : '詳細'}</button>
                  <button className='mt-2 rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white' onClick={() => onSelectPackage(card)}>{lang === 'en' ? 'Book' : '預約'}</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

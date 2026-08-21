import React from 'react';
import {
  CheckCircle2,
  CheckSquare,
  FileText,
  PhoneCall,
  Plus,
  RefreshCw,
  Search,
} from 'lucide-react';

export function PublicQuickLinks({
  hasLineProfile,
  lang,
  onLineLogin,
  onOpenView,
  publicView,
}) {
  const links = [
    { view: 'packages', label: lang === 'en' ? 'Find package / book' : '找方案 / 預約', compact: lang === 'en' ? 'Packages' : '找方案', Icon: Search },
    { view: 'my-bookings', label: lang === 'en' ? 'My bookings / changes' : '我的預約 / 改期', compact: lang === 'en' ? 'Bookings' : '我的預約', Icon: CheckSquare },
    { view: 'prep', label: lang === 'en' ? 'Visit instructions' : '來檢須知', compact: lang === 'en' ? 'Instructions' : '來檢須知', Icon: FileText },
    { view: 'addon-items', label: lang === 'en' ? 'Add-on items' : '加選項目參考表', compact: lang === 'en' ? 'Add-ons' : '加選項目', Icon: Plus },
    { view: 'followup', label: lang === 'en' ? 'Report follow-up' : '報告追蹤', compact: lang === 'en' ? 'Follow-up' : '報告追蹤', Icon: RefreshCw },
    { view: 'contact', label: lang === 'en' ? 'Contact / directions' : '聯絡交通', compact: lang === 'en' ? 'Contact' : '聯絡交通', Icon: PhoneCall },
  ];

  return (
    <div className='grid grid-cols-3 gap-1.5 py-0.5 text-[11px] font-bold lg:flex lg:items-center lg:gap-1.5 lg:overflow-visible lg:text-xs'>
      {links.map(({ view, label, compact, Icon }) => (
        <button key={view} type='button' onClick={() => onOpenView(view)} className={'inline-flex min-w-0 items-center justify-center gap-1 rounded-md px-1.5 py-2 transition-colors lg:shrink-0 lg:px-2.5 ' + (publicView === view ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200')}>
          <Icon className='h-3.5 w-3.5 shrink-0' /><span className='truncate lg:hidden'>{compact}</span><span className='hidden lg:inline'>{label}</span>
        </button>
      ))}
      {!hasLineProfile && <button type='button' onClick={onLineLogin} className='col-span-3 inline-flex items-center justify-center gap-1 rounded-md bg-emerald-600 px-2.5 py-2 text-white hover:bg-emerald-700 lg:col-auto lg:shrink-0'><CheckCircle2 className='h-3.5 w-3.5' />{lang === 'en' ? 'Connect LINE' : '連結 LINE'}</button>}
    </div>
  );
}

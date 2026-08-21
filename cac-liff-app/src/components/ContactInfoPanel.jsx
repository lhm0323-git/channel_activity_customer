import React from "react";

const MAP_URL = "https://www.google.com/maps/search/?api=1&query=%E5%B1%8F%E6%9D%B1%E5%B8%82%E5%A4%A7%E9%80%A3%E8%B7%AF66%E8%99%9F%E6%81%A9%E6%85%88%E5%A4%A7%E6%A8%932%E6%A8%93";

export function ContactInfoPanel() {
  return <div className="bg-white border border-slate-200 rounded-lg p-5"><h1 className="text-xl font-black text-slate-900">聯絡我們 / 交通</h1><p className="mt-2 text-sm text-slate-600">屏基健檢中心聯絡與交通資訊。</p><div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">{["電話：08-7369955-18", "地址：屏東市大連路66號恩慈大樓2樓", "建議來檢前確認預約日期、報到時間與注意事項", "企業團檢或特殊需求請直接來電洽詢"].map((item) => <div key={item} className="rounded-md border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700">{item}</div>)}</div><figure className="mt-5 overflow-hidden rounded-lg border border-slate-200 bg-white"><img src="/health-check-center-location.jpg" alt="Health Check Center location map" loading="lazy" className="block h-auto w-full" /></figure><a href={MAP_URL} target="_blank" rel="noreferrer" className="mt-4 inline-flex w-full items-center justify-center rounded-md bg-emerald-600 px-4 py-3 text-sm font-black text-white shadow-sm sm:w-auto">開啟 Google Maps 導航</a></div>;
}
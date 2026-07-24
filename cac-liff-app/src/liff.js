export async function initLiffProfile() {
  if (typeof window !== "undefined" && ["localhost", "127.0.0.1"].includes(window.location.hostname)) {
    return { status: "SKIPPED", profile: null, message: "本機測試模式：略過 LINE 登入" };
  }
  const liffId = import.meta.env.VITE_LIFF_ID;
  if (!liffId) return { status: "SKIPPED", profile: null, message: "VITE_LIFF_ID 未設定，使用一般瀏覽器模式" };

  const liff = (await import("@line/liff")).default;
  await liff.init({ liffId });
  if (!liff.isLoggedIn()) {
    return { status: "OPTIONAL", profile: null, message: "\u672a\u767b\u5165 LINE\uff0c\u5c07\u4ee5 Email \u4f5c\u70ba\u5230\u6aa2\u63d0\u9192\u806f\u7d61\u65b9\u5f0f" };
  }

  const profile = await liff.getProfile();
  return { status: "READY", profile, message: `已登入 LINE：${profile.displayName}` };
}

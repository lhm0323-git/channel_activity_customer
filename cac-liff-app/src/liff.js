export async function initLiffProfile() {
  if (typeof window !== "undefined" && ["localhost", "127.0.0.1"].includes(window.location.hostname)) {
    return { status: "SKIPPED", profile: null, message: "本機測試模式：略過 LINE 登入" };
  }
  const liffId = import.meta.env.VITE_LIFF_ID;
  if (!liffId) return { status: "SKIPPED", profile: null, message: "VITE_LIFF_ID 未設定，使用一般瀏覽器模式" };

  const liff = (await import("@line/liff")).default;
  await liff.init({ liffId });
  if (!liff.isLoggedIn()) {
    liff.login();
    return { status: "LOGIN_REDIRECT", profile: null, message: "正在導向 LINE 登入" };
  }

  const profile = await liff.getProfile();
  return { status: "READY", profile, message: `已登入 LINE：${profile.displayName}` };
}

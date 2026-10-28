const BASE = [
  "請攜帶健保 IC 卡與身分證；外籍顧客請攜帶護照或居留證。",
  "報到地點：恩慈大樓 2 樓健檢中心。",
  "檢查前一日晚上 10 點後請禁食，可飲少量白開水。",
  "請穿著寬鬆、上下分開衣物及便鞋，以利各項檢查。",
];

const RULES = [
  [/眼壓|眼科|視力/i, "眼科檢查者請勿配戴隱形眼鏡。"],
  [/ABI|PWV|四肢動脈/i, "四肢動脈壓檢查請勿穿緊身長褲及長絲襪。"],
  [/抹片|Pap smear/i, "女性執行子宮頸抹片前一天請避免性行為。"],
  [/精液/i, "精液分析請禁慾 3 天後到院留取。"],
  [/頸部.*超音波|甲狀腺.*超音波/i, "頸部或甲狀腺超音波檢查者，請穿著可露出頸部的上衣。"],
  [/運動心電/i, "運動心電圖檢查者，請穿著便於跑步的寬鬆衣褲和運動鞋。"],
  [/MRI|核磁/i, "MRI 檢查者如有心臟支架、植牙或其他金屬植入物請事先告知；檢查前請取下金屬物品。"],
  [/胃鏡|腸鏡|內視鏡/i, "胃腸鏡檢查若使用麻醉，請取下活動假牙，勿化妝或塗指甲油。"],
  [/大腸鏡/i, "大腸鏡檢查者請依衛教單張完成飲食及清腸準備。"],
  [/無痛|麻醉/i, "無痛腸胃鏡檢查後不可自行開車，請由家屬陪同返家。"],
];

function buildConfirmationNotice(booking) {
  const source = (booking.selectedItems || []).map((item) => [item.name, item.enName, item.category].filter(Boolean).join(" ")).join("\n");
  const instructions = [...BASE, ...RULES.filter(([pattern]) => pattern.test(source)).map(([, text]) => text)];
  return [
    "屏基健檢中心通知",
    "您的健檢預約已確認。",
    "套餐：" + (booking.packageName || "健檢套餐"),
    "到檢日期：" + booking.appointmentDate,
    "報到序號：" + booking.checkInSerial,
    "來檢須知：",
    ...instructions.map((text, index) => `${index + 1}. ${text}`),
    "詳細資料：https://liff.line.me/2010725321-sRRkD0Le?view=checkin",
  ].join("\n");
}

module.exports = { buildConfirmationNotice };

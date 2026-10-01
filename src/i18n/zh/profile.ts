export const profile = {
  page: {
    title: "公司简介",
    description: "查看您的历史记录并保持您的帐户最新。",
    accountAndSecurity: "账户与安全",
  },
  avatar: {
    title: "个人资料图片",
    newAlt: "新的个人资料图片",
    alt: "个人资料图片",
    resizeHint: (size: number) => `上传之前，图像会在浏览器中缩小至 ${size} px，因此直接从手机摄像头拍摄的照片效果很好。`,
    readFailed: "无法读取图像。尝试另一种。",
    noCanvas: "没有可用的绘图表面",
    compressFailed: "无法压缩图像",
    processing: "处理图像...",
    uploading: "正在上传...",
    upload: "上传",
  },
  username: {
    title: "用户名",
    newUsername: "新用户名",
    code: "六位数代码",
    save: "保存用户名",
    saving: "正在保存...",
  },
  passkey: {
    title: "面容 ID/密码",
    description: "在您的 iPhone 上设置面容 ID 或在此设备上设置密码以加快登录速度。",
  },
  deleteAccount: {
    title: "删除账户",
    description: "已完成的比赛均以匿名方式保存。必须先关闭、删除或移交正在进行的锦标赛。",
    codePlaceholder: "六位数代码",
    submit: "删除账户",
    deleting: "正在删除...",
  },
  errors: {
    invalidUsername: "用户名无效",
    wrongCodeForUsername: "输入正确的六位数代码以更改您的用户名",
    usernameTaken: "该用户名已被占用",
    chooseImage: "首先选择一张图片",
    imageFormat: "图片必须为 JPG、PNG 或 WebP，且大小不超过 2 MB",
    wrongCodeForDelete: "输入正确的六位数代码以删除您的帐户",
    activeTournaments: "在删除您的帐户之前关闭、删除或移交您正在进行的锦标赛",
  },
  messages: {
    usernameUpdated: "用户名已更新",
    avatarUpdated: "个人资料图片已更新",
  },
  menu: {
    greeting: (username: string) => `你好，${username}`,
    choose: "选择你想玩的。",
    profile: "公司简介",
    friends: "朋友",
    career: {
      kicker: "您的团队",
      title: "经理生涯",
      description: "选择你的首发十一人，购买卡牌并赢得与你的朋友的战术比赛。",
      action: "开放经理职业生涯",
    },
    tournaments: {
      kicker: "与朋友一起",
      title: "锦标赛",
      description: "创建、加入并关注您的 FIFA 和 NHL 锦标赛。",
      action: "查看锦标赛",
    },
    fantasy: {
      kicker: "真实比赛",
      title: "梦幻足球",
      description: "从五大联赛挑选真实球员，根据他们在真实比赛中的表现得分。",
      action: "打开梦幻足球",
    },
    historyTitle: "两种模式，一个故事",
    historyText: "结果和奖励将保存到您的个人资料中。",
    historyLink: "查看统计数据和奖励",
  },
  modeMenu: {
    back: "← 菜单",
  },
  confirmDialog: {
    title: "你确定吗？",
    no: "否",
    yes: "是的",
  },
  audio: {
    turnOff: "关掉音乐",
    play: "播放锦标赛音乐",
    label: "比赛音乐",
  },
};

export type ProfileDict = typeof profile;

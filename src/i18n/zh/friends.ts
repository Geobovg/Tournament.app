export const friends = {
  page: {
    title: "朋友",
    description: "添加好友以便更轻松地邀请他们参加锦标赛。",
  },
  find: {
    title: "寻找朋友",
    placeholder: "按用户名搜索",
    search: "搜索",
    searching: "正在寻找...",
    noResults: (query: string) => `没有“${query}”的结果。`,
  },
  status: {
    friends: "你们是朋友",
    requestSent: "请求已发送",
    sentYouRequest: "向您发送了请求",
  },
  add: "添加好友",
  sending: "正在发送...",
  accept: "接受",
  accepting: "接受…",
  decline: "拒绝",
  cancel: "取消",
  remove: "删除好友",
  incomingTitle: "好友请求",
  outgoingTitle: "等待回复",
  listTitle: "朋友",
  empty: "你还没有任何朋友。在上面搜索用户名来添加某人。",
  errors: {
    missingRecipient: "收件人失踪",
    cannotAddSelf: "您无法添加自己",
    userNotFound: "找不到该用户",
    alreadyFriends: "你们已经是朋友了",
    requestExists: "你们之间已经有好友请求",
    requestNotFound: "找不到请求",
    ownerOnly: "只有组织者可以添加参与者",
    registrationClosed: "报名已关闭",
    notFriends: "你们不是朋友",
  },
};

export type FriendsDict = typeof friends;

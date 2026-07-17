App({
  onLaunch() {
    // 无条件跳转到用户信息页面
    wx.switchTab({
      url: '/pages/userinfo/userinfo'
    });
  }
});

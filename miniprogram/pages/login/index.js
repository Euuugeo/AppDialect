// pages/login/index.js
Page({
  data: {
    userInfo: {},
    hasUserInfo: false,
  },

  onLoad: function() {
    const db = wx.cloud.database();   // 获取数据库实例
    const users = db.collection('users');

    // 调用云函数，获取用户openid
    wx.cloud.callFunction({
      name: 'login',
      success: res => {
        const openid = res.result.openid;
        console.log('用户 openid:', openid);

        // 查询数据库是否存在此用户
        users.where({ _openid: openid }).get().then(result => {
          if (result.data.length > 0) {
            // 用户存在，获取其userId并跳转到个人信息页面
            wx.setStorageSync('userId', result.data[0].userId);
            wx.navigateTo({
              url: '/pages/profile/index',
            });
          } else {
            // 用户不存在，创建新用户并分配未使用的ID
            this.createNewUser(openid);
          }
        });
      },
      fail: err => {
        console.error('[云函数] [login] 调用失败', err);
      }
    });
  },

  // 创建新用户并分配未使用的userId
  createNewUser(openid) {
    const db = wx.cloud.database();
    const users = db.collection('users');

    // 获取已使用的 userId 列表
    users.get().then(res => {
      const usedIds = res.data.map(user => user.userId); // 获取已使用的ID
      const maxUsers = 100;

      if (usedIds.length >= maxUsers) {
        // 已注册用户超过 100 个，弹出提示
        wx.showModal({
          title: '注册失败',
          content: '用户数量已达到上限，无法注册更多用户。',
          showCancel: false
        });
        return;
      }

      // 生成未使用的随机ID
      let randomId;
      do {
        randomId = Math.floor(Math.random() * 100) + 1;
      } while (usedIds.includes(randomId)); // 确保ID未被使用

      const userInfo = {
        _openid: openid,
        userId: randomId,
        name: '',
        age: '',
        gender: '',
        location: ''
      };

      // 将新用户信息存入数据库
      users.add({
        data: userInfo,
        success: res => {
          wx.setStorageSync('userId', randomId);  // 将userId保存到本地存储
          wx.navigateTo({
            url: '/pages/profile/index',  // 跳转到个人信息页面
          });
        },
        fail: err => {
          console.error('用户创建失败', err);
        }
      });
    }).catch(err => {
      console.error('获取用户ID列表失败', err);
    });
  },

  onGetUserInfo: function(e) {
    // 用户点击微信授权按钮后触发
    if (e.detail.userInfo) {
      this.setData({
        userInfo: e.detail.userInfo,
        hasUserInfo: true
      });
      this.onLoad();  // 执行登录逻辑
    }
  },
});

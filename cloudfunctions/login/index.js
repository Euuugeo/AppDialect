// 云函数：login/index.js
const cloud = require('wx-server-sdk')

// 初始化云开发
cloud.init()

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext() // 获取小程序调用上下文
  return {
    openid: wxContext.OPENID, // 返回openid
  }
}

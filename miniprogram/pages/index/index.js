Page({
  data: {
    recordings: [],   // 存储从数据库获取的录音记录
    isRecording: false,  // 全局录音状态
    isPlayingAny: false, // 全局播放状态
    isPlaying: {},    // 记录每个音频是否正在播放
    pageSize: 20,     // 每次查询的条数，保持为20以防超出限制
    pageIndex: 0,     // 当前分页的索引
    hasMore: true,    // 是否有更多数据
    isLoading: false  // 是否正在加载数据，防止重复加载
  },

  onLoad: function() {
    this.recorderManager = wx.getRecorderManager();
    this.audioContexts = {}; // 用于存储多个 InnerAudioContext
    this.setupRecorderManager();

    // 获取 userId 并从数据库中获取相应录音记录
    const userId = wx.getStorageSync('userId');  // 从本地存储中获取 userId
    if (userId) {
      this.loadRecordings(userId);  // 加载该用户的录音记录
    }
  },

  // 从数据库中根据 userId 获取录音记录
  loadRecordings: function(userId) {
    if (this.data.isLoading) return;  // 防止重复加载

    this.setData({ isLoading: true });  // 设置正在加载的状态

    const db = wx.cloud.database();  // 初始化云数据库
    const recordingsCollection = db.collection('recording');  // 录音记录集合

    const { pageSize, pageIndex, hasMore } = this.data;  // 获取分页信息

    if (!hasMore) return;  // 如果没有更多数据，直接返回

    wx.showLoading({ title: '加载中...' });

    // 查询录音记录，按分页获取
    recordingsCollection.where({ userId: userId })
      .skip(pageIndex * pageSize)  // 跳过已经加载的记录数
      .limit(pageSize)             // 每次加载 pageSize 条记录
      .get()
      .then(res => {
        wx.hideLoading();
        const newRecordings = res.data;

        if (newRecordings.length < pageSize) {
          this.setData({ hasMore: false });
        }

      // 检查云存储中是否存在对应的录音文件
      const checkFilePromises = newRecordings.map(r => {
        return wx.cloud.getTempFileURL({
          fileList: [`cloud://appdialect-2gnaco4lc8e7fc41.6170-appdialect-2gnaco4lc8e7fc41-1329509987/recordings/${r.name}`]
        }).then(res => {
          const tempFileURL = res.fileList[0].tempFileURL;
          r.hasFile = !!tempFileURL;  // 如果有临时URL，表示文件存在
          r.tempFileURL = tempFileURL;  // 临时存储URL用于播放
        }).catch(err => {
          r.hasFile = false;  // 文件不存在
        });
      });

        Promise.all(checkFilePromises).then(() => {
          // 更新 recordings 数组，追加新获取的数据
          let updatedRecordings = newRecordings.map(r => ({
            ...r,
            filePath: `recordings/${r.name}`,
            isRecording: false // 初始化录音状态为 false
          }));

          this.setData({
            recordings: this.data.recordings.concat(updatedRecordings),
            pageIndex: pageIndex + 1,
            isLoading: false
          });
        });
      })
      .catch(err => {
        wx.hideLoading();
        this.setData({ isLoading: false });
        console.error('查询失败:', err);
      });
  },

  // 加载更多录音记录
  loadMoreRecordings: function() {
    const userId = wx.getStorageSync('userId');
    if (userId) {
      this.loadRecordings(userId);  // 加载更多录音记录
    }
  },

  // 初始化录音管理器
  setupRecorderManager: function() {
    this.recorderManager.onStart(() => {
      console.log('录音开始');
    });

    this.recorderManager.onStop((res) => {
      const { tempFilePath } = res;
      console.log('录音停止，文件路径为：', tempFilePath);

      // 获取对应录音记录的 name 字段作为文件名
      const recording = this.data.recordings.find(r => r._id === this.currentRecordingId); 
      if (!recording) { 
        wx.showToast({ 
          title: '录音记录未找到', 
          icon: 'none' 
        }); 
        return; 
      }

      // 使用录音记录中的 name 字段作为文件名，并加上 .wav 后缀
      const cloudPath = `recordings/${recording.name}`;

      // 上传录制的 wav 文件，保持文件名不变，覆盖旧文件
      wx.cloud.uploadFile({
        cloudPath: cloudPath,  // 上传到云存储的路径
        filePath: tempFilePath,
        success: res => {
          console.log('文件上传成功，fileID:', res.fileID);

          // 更新录音记录中的文件路径为 cloudPath
          this.updateRecording(cloudPath);
        },
        fail: err => {
          console.error('文件上传失败:', err);
          wx.showToast({
            title: '文件上传失败',
            icon: 'none'
          });
        }
      });
    });

    this.recorderManager.onPause(() => {
      console.log('录音暂停');
    });

    this.recorderManager.onResume(() => {
      console.log('录音恢复');
    });

    this.recorderManager.onError((err) => {
      console.error('录音错误', err);
    });
  },

  // 开始录音
  startRecording: function(e) {
    const id = e.currentTarget.dataset.id;
    this.currentRecordingId = id; // 存储当前录音的 id
    const options = {
      duration: 60000, // 60秒录音
      sampleRate: 16000,
      numberOfChannels: 1,
      encodeBitRate: 96000,
      format: 'wav'  // 设置为 wav 格式
    };

    let updatedRecordings = this.data.recordings.map(r => {
      if (r._id === id) {
        r.isRecording = true;
      } else {
        r.isRecording = false;
      }
      return r;
    });

    this.setData({ 
      recordings: updatedRecordings,
      isRecording: true  // 设置全局录音状态为 true
    });

    this.recorderManager.start(options);
  },

  // 停止录音
  stopRecording: function(e) {
    this.recorderManager.stop();

    let updatedRecordings = this.data.recordings.map(r => {
      if (r._id === this.currentRecordingId) {
        r.isRecording = false;
      }
      return r;
    });

    this.setData({ 
      recordings: updatedRecordings,
      isRecording: false
    });
  },

  // 更新录音路径
  updateRecording: function(cloudPath) {
    const id = this.currentRecordingId;
    let updatedRecordings = this.data.recordings.map(r => {
      if (r._id === id) {
        r.filePath = cloudPath; // 使用文件路径而不是fileID
        r.recorded = true; // 标记已录制
        r.hasFile = true; // 标记文件存在
      }
      return r;
    });

    this.setData({ recordings: updatedRecordings });
  },

  

  // 播放录音
  playRecording: function(e) {

    // 版本对比函数放在 playRecording 函数内部
    const compareVersion = function(v1, v2) {
      v1 = v1.split('.');
      v2 = v2.split('.');
      const len = Math.max(v1.length, v2.length);

      while (v1.length < len) {
        v1.push('0');
      }
      while (v2.length < len) {
        v2.push('0');
      }

      for (let i = 0; i < len; i++) {
        const num1 = parseInt(v1[i]);
        const num2 = parseInt(v2[i]);

        if (num1 > num2) {
          return 1;
        } else if (num1 < num2) {
          return -1;
        }
      }

      return 0;
    }

    
    const res = wx.getAppBaseInfo();
    const version = res.SDKVersion;
    console.log('微信SDK版本:', version);
    // 调用版本对比函数
    if (compareVersion(version, '2.3.0') >= 0) {
      wx.setInnerAudioOption({
        obeyMuteSwitch: false
      });
    } else {
      wx.showModal({
        title: '提示',
        content: '当前微信版本过低，静音模式下可能会导致播放音频失败。'
      });
    }
    

    const id = e.currentTarget.dataset.id;
    const recording = this.data.recordings.find(r => r._id === id);

    if (!recording.filePath) {
      wx.showToast({
        title: '你确实录过音了，但目前程序有小bug，重启程序听不了，你可以再录音一遍。',
        icon: 'none'
      });
      return;
    }

    // 先销毁之前的 InnerAudioContext，确保每次都重新创建
    if (this.audioContexts[id]) {
      console.log(`销毁旧的 InnerAudioContext，ID: ${id}`);
      this.audioContexts[id].stop();  // 停止旧的音频
      this.audioContexts[id].destroy();  // 销毁旧的 InnerAudioContext 对象
    }

    // 重新创建新的 InnerAudioContext
    this.audioContexts[id] = wx.createInnerAudioContext();
    this.audioContexts[id].autoplay = true;
    // 从云存储中获取最新的录音文件
    wx.cloud.getTempFileURL({
      fileList: [`cloud://appdialect-2gnaco4lc8e7fc41.6170-appdialect-2gnaco4lc8e7fc41-1329509987/${recording.filePath}`],   // 使用完整的路径
      success: res => {
        console.log('请求的文件路径:', recording.filePath);
        const tempUrl = res.fileList[0].tempFileURL + `?t=${new Date().getTime()}`;  // 加时间戳防止缓存

        if (tempUrl) {
          // 设置新的临时URL到音频上下文
          this.audioContexts[id].src = tempUrl;

          // 强制刷新音频流，确保最新的音频文件被加载
          this.audioContexts[id].seek(0);
          
          // 确保音频加载完成后再开始播放，解决首次播放时中途断掉的问题
          this.audioContexts[id].onCanplay(() => {
            console.log('音频可以播放，ID:', id);
            this.audioContexts[id].play();  // 音频加载完成后再播放
          });
        } else {
          console.error('获取的临时URL为空');
        }

        // 更新播放状态
        let isPlaying = { ...this.data.isPlaying };
        isPlaying[id] = true;

        this.setData({ 
          isPlaying, 
          isPlayingAny: true 
        });

        // 播放事件
        this.audioContexts[id].onPlay(() => {
          console.log(`播放开始，音频源: ${this.audioContexts[id].src}`);
          console.log(`播放录音，ID: ${id}`);
        });

        // 处理暂停事件
        this.audioContexts[id].onPause(() => {
          console.log(`暂停播放，ID: ${id}`);
        });

        // 处理播放结束事件
        this.audioContexts[id].onEnded(() => {
          console.log(`播放结束，音频源: ${this.audioContexts[id].src}`);
          let isPlaying = { ...this.data.isPlaying };
          isPlaying[id] = false;
          this.setData({ 
            isPlaying, 
            isPlayingAny: false 
          });
        });

        // 处理停止事件
        this.audioContexts[id].onStop(() => {
          isPlaying[id] = false;
          this.setData({ 
            isPlaying, 
            isPlayingAny: false 
          });
        });

        // 处理播放错误事件
        this.audioContexts[id].onError((err) => {
          console.error(`播放错误，ID: ${id}`, err);
          isPlaying[id] = false;
          this.setData({ 
            isPlaying, 
            isPlayingAny: false 
          });
        });
      },
      fail: err => {
        console.error('获取临时URL失败:', err);
      }
    });
  },

  // 暂停播放
  pausePlayback: function(e) {
    const id = e.currentTarget.dataset.id;
    if (this.audioContexts[id]) {
      this.audioContexts[id].pause();
      let isPlaying = { ...this.data.isPlaying };
      isPlaying[id] = false;
      this.setData({ 
        isPlaying,
        isPlayingAny: false
      });
    }
  }
});
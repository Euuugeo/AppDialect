Page({
  data: {
    userId: null,
    name: '',  
    age: '',   
    gender: '', 
    location: '', 
    provinces: [],
    cities: [],
    districts: [],
    multiArray: [[], [], []],  
    multiIndex: [0, 0, 0],  
    tempIndex: [0, 0, 0],  
    selectedProvince: '',
    selectedCity: '',
    selectedDistrict: ''
  },

  onLoad() {
    this.getProvinces();  
    this.loadUserInfo();  
  },

  bindNameInput(e) {
    this.setData({
      name: e.detail.value
    });
  },

  bindAgeInput(e) {
    this.setData({
      age: e.detail.value
    });
  },

  bindGenderChange(e) {
    this.setData({
      gender: e.detail.value
    });
  },

  getDistrictsData(keywords, level, callback) {
    wx.showLoading({ title: '加载中...' });
    wx.request({
      url: 'https://restapi.amap.com/v3/config/district',
      data: {
        key: '00c7dd365854cad6083d8765ffbeab6f',
        keywords: keywords,
        subdistrict: level
      },
      success: (res) => {
        wx.hideLoading();
        if (res.data.status === '1') {
          callback(res.data.districts[0].districts);
        } else {
          wx.showToast({
            title: '获取数据失败',
            icon: 'none'
          });
        }
      },
      fail: (err) => {
        wx.hideLoading();
        wx.showToast({
          title: '网络请求失败，请检查网络连接',
          icon: 'none'
        });
      }
    });
  },

  getProvinces() {
    this.getDistrictsData('中国', 1, (districts) => {
      const provinces = districts.map(province => province.name);
      this.setData({
        multiArray: [provinces, [], []], 
        provinces: provinces
      });
      this.getCities(provinces[0]);
    });
  },

  getCities(province) {
    this.getDistrictsData(province, 1, (districts) => {
      const cities = districts.map(city => city.name);
      this.setData({
        'multiArray[1]': cities,
        cities: cities,
        districts: []
      });
      this.getDistricts(cities[0]);
    });
  },

  getDistricts(city) {
    this.getDistrictsData(city, 1, (districts) => {
      const districtsData = districts.map(district => district.name);
      this.setData({
        'multiArray[2]': districtsData,
        districts: districtsData
      });
    });
  },

  bindMultiPickerColumnChange(e) {
    const { column, value } = e.detail;
    const { multiArray, tempIndex } = this.data;

    tempIndex[column] = value;

    if (column === 0) {
      const selectedProvince = multiArray[0][value];
      tempIndex[1] = 0;
      tempIndex[2] = 0;
      this.getCities(selectedProvince);
    } else if (column === 1) {
      const selectedCity = multiArray[1][value];
      tempIndex[2] = 0;
      this.getDistricts(selectedCity);
    }

    this.setData({
      tempIndex: tempIndex
    });
  },

  bindMultiPickerChange(e) {
    const { tempIndex, multiArray } = this.data;
    const selectedProvince = multiArray[0][tempIndex[0]];
    const selectedCity = multiArray[1][tempIndex[1]];
    const selectedDistrict = multiArray[2][tempIndex[2]];

    this.setData({
      multiIndex: tempIndex,
      selectedProvince: selectedProvince,
      selectedCity: selectedCity,
      selectedDistrict: selectedDistrict,
      location: `${selectedProvince} - ${selectedCity} - ${selectedDistrict}`
    });
  },

  loadUserInfo() {
    const db = wx.cloud.database();
    const users = db.collection('users');
    const userId = wx.getStorageSync('userId');

    users.where({ userId: userId }).get().then(res => {
      const userInfo = res.data[0];
      this.setData({
        userId: userInfo.userId,
        name: userInfo.name,
        age: userInfo.age,
        gender: userInfo.gender,
        location: userInfo.location,
      });
    }).catch(err => {
      console.error('加载用户信息失败', err);
    });
  },

  handleInputChange(e) {
    const { field } = e.currentTarget.dataset;
    this.setData({
      [field]: e.detail.value
    });
  },

  saveUserInfo() {
    const db = wx.cloud.database();
    const users = db.collection('users');
    const userId = this.data.userId;

    users.where({ userId: userId }).update({
      data: {
        name: this.data.name,
        age: this.data.age,
        gender: this.data.gender,
        location: this.data.location,
      },
      success: res => {
        wx.showToast({
          title: '保存成功',
        });
      },
      fail: err => {
        console.error('保存失败', err);
      }
    });
  },

  // 新增的跳转到录音界面的函数
  goToRecording() {
    wx.switchTab({
      url: '/pages/index/index',  // 确保跳转的页面是 tabBar 中的页面
    });
  }  
});

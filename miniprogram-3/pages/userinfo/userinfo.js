Page({
  data: {
    name: '',  // 存储用户输入的姓名
    age: '',   // 存储用户输入的年龄
    gender: '', // 存储用户选择的性别
    provinces: [],
    cities: [],
    districts: [],
    multiArray: [[], [], []],  // 存储省、市、区的列表数组
    multiIndex: [0, 0, 0],  // 选择的省、市、区的索引
    tempIndex: [0, 0, 0],   // 临时存储的索引
    selectedProvince: '',
    selectedCity: '',
    selectedDistrict: ''
  },

  onLoad() {
    this.getProvinces();  // 页面加载时获取省份信息
    console.log('进入 userinfo 页面');
  },

  // 处理用户输入姓名
  bindNameInput(e) {
    this.setData({
      name: e.detail.value  // 获取输入框的值并更新 name
    });
  },

  // 处理用户输入年龄
  bindAgeInput(e) {
    this.setData({
      age: e.detail.value  // 获取输入框的值并更新 age
    });
  },

  // 处理性别选择变化
  bindGenderChange(e) {
    this.setData({
      gender: e.detail.value  // 获取选中的性别并更新 gender
    });
  },

  // 通用函数，用于获取省、市、区数据
  getDistrictsData(keywords, level, callback) {
    wx.showLoading({ title: '加载中...' });
    wx.request({
      url: 'https://restapi.amap.com/v3/config/district',
      data: {
        key: '00c7dd365854cad6083d8765ffbeab6f',
        keywords: keywords,
        subdistrict: level  // 获取下一级的省/市/区信息
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

  // 获取省份信息
  getProvinces() {
    this.getDistrictsData('中国', 1, (districts) => {
      const provinces = districts.map(province => province.name);
      this.setData({
        multiArray: [provinces, [], []],  // 初始化 multiArray 只填充省份，市和区为空
        provinces: provinces
      });

      // 初始化时自动加载第一个省份的市列表
      this.getCities(provinces[0]);
    });
  },

  // 获取市信息
  getCities(province) {
    this.getDistrictsData(province, 1, (districts) => {
      const cities = districts.map(city => city.name);
      this.setData({
        'multiArray[1]': cities,  // 更新第二列（市列表）
        cities: cities,
        districts: []  // 清空区列表
      });

      // 初始化时自动加载第一个市的区列表
      this.getDistricts(cities[0]);
    });
  },

  // 获取区信息
  getDistricts(city) {
    this.getDistrictsData(city, 1, (districts) => {
      const districtsData = districts.map(district => district.name);
      this.setData({
        'multiArray[2]': districtsData,  // 更新第三列（区列表）
        districts: districtsData
      });
    });
  },

  // 处理 Picker 的多列选择变化
  bindMultiPickerColumnChange(e) {
    const { column, value } = e.detail;
    const { multiArray, tempIndex } = this.data;

    // 更新临时选择的索引，而不是最终选定的值
    tempIndex[column] = value;

    if (column === 0) {  // 选择省份时
      const selectedProvince = multiArray[0][value];
      tempIndex[1] = 0;  // 重置市的索引
      tempIndex[2] = 0;  // 重置区的索引

      // 选择省份后，获取对应的市
      this.getCities(selectedProvince);

    } else if (column === 1) {  // 选择城市时
      const selectedCity = multiArray[1][value];
      tempIndex[2] = 0;  // 重置区的索引

      // 选择城市后，获取对应的区
      this.getDistricts(selectedCity);
    }

    // 更新临时索引
    this.setData({
      tempIndex: tempIndex
    });
  },

  // 处理 Picker 最终选择，只有当用户点击“确认”时才更新
  bindMultiPickerChange(e) {
    const { tempIndex, multiArray } = this.data;

    const selectedProvince = multiArray[0][tempIndex[0]];
    const selectedCity = multiArray[1][tempIndex[1]];
    const selectedDistrict = multiArray[2][tempIndex[2]];

    // 更新最终的选择
    this.setData({
      multiIndex: tempIndex,  // 确认选择的索引
      selectedProvince: selectedProvince,
      selectedCity: selectedCity,
      selectedDistrict: selectedDistrict
    });
  },

  submitInfo() {
    const { selectedProvince, selectedCity, selectedDistrict } = this.data;

    if (!selectedProvince || !selectedCity || !selectedDistrict) {
      wx.showToast({
        title: '请完整选择省市区',
        icon: 'none'
      });
      return;
    }

    wx.setStorageSync('userInfo', { selectedProvince, selectedCity, selectedDistrict });
    wx.redirectTo({
      url: '/pages/index/index'
    });
  }
});

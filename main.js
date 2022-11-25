const config = require('./config.json');
const { Sequelize, DataTypes } = require('sequelize');
const express = require('express');
const bodyParser = require('body-parser')
const cors = require('cors');
const qs = require('qs');


const apis = express();
// parse application/x-www-form-urlencoded
apis.use(bodyParser.urlencoded({ extended: false }))
// parse application/json
apis.use(bodyParser.json())
apis.use(cors());

//定义数据库配置
const sequelize = new Sequelize(config.datebase, config.dbuser, config.dbpassword, {
  dialect: 'mysql',
  host: config.dbhost,
  define: {
    freezeTableName: true
  }
})

//定义verify表模型
const verify = sequelize.define('verify', {
  date: {
    type: DataTypes.DATEONLY,
    defaultValue: DataTypes.NOW,
    primaryKey: true
  },
  code: {
    type: DataTypes.STRING(6),
  }
}, {
  timestamps: false
});

//定义records表模型
const records = sequelize.define('records', {
  tel: DataTypes.STRING(11),
  name: DataTypes.STRING(5),
  status: DataTypes.STRING(255),
}, {
  timestamps: true,
  updatedAt: false
});

//定义users表模型
const users = sequelize.define('users', {
  tel: {
    type: DataTypes.STRING(11),
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING(5),
    primaryKey: true
  },
  password: DataTypes.STRING(255),
  info: {
    type: DataTypes.JSON,
    defaultValue: {}
  },
  status: DataTypes.STRING(20),
  infoRaw: {
    type: DataTypes.JSON,
    defaultValue: {}
  }
});


//verify 返回邀请码
function getVerify(res) {
  //获取今日邀请码，没有就自动添加
  verify
    .findOne({ attributes: ['code'], where: { date: Date.now() } })
    .then((data) => {
      if (!data) {
        let code = ''
        for (let i = 0; i < 6; i++) {
          code += parseInt(Math.random() * 10)
        }
        verify
          .create({
            code: code
          })
          .then((data) => {
            res.send(data.code)
          })
      }
      else {
        res.send(data.code)
      }
    })
}

//UserIsExist 用户存在 存在=》1 不存在=》0
function UserIsExist(body, res) {
  users
    .findOne({ attributes: ['tel'], where: { tel: body.tel } })
    .then((data) => {
      if (!data) {
        res.send("0")
      }
      else {
        res.send("1")
      }
    })
}

//UserUpdate 用户信息更新
function UserUpdate(body, res) {
  body = qs.parse(body);
  users
    .create({
      tel: body.tel,
      name: body.name,
      password: body.password,
      status: body.status,
      info: body.info,
      infoRaw: body.infoRaw
    })
    .then(() => {
      res.send("1");
    })
    .catch(err => { console.log(err) })

}


apis.get('/verify', (req, res) => {
  getVerify(res)
})

apis.post('/UserIsExist', (req, res) => {
  UserIsExist(req.body, res)
})

apis.post('/UserUpdate', function (req, res) {
  UserUpdate(req.body, res)
})


//监听端口
apis.listen(config.apiPort, () => {
  console.log(`Example app listening on port ${config.apiPort}`)
})






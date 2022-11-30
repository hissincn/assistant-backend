const config = require('./config.json');
const { Sequelize, DataTypes } = require('sequelize');
const express = require('express');
const bodyParser = require('body-parser')
const cors = require('cors');
const qs = require('qs');

const apis = express();
apis.use(bodyParser.urlencoded({ extended: false }))
apis.use(bodyParser.json())
apis.use(cors());

//定义temp数据库配置
const temp = new Sequelize(config.tempDatabase, config.dbuser, config.dbpassword, {
  dialect: 'mysql',
  host: config.host,
  define: {
    freezeTableName: true
  },
  timezone: '+08:00'
})

//定义xiaoxin数据库配置
const xiaoxin = new Sequelize(config.xiaoxinDatabase, config.dbuser, config.dbpassword, {
  dialect: 'mysql',
  host: config.host,
  define: {
    freezeTableName: true
  },
  timezone: '+08:00'
})


//定义verify表模型
const verify = temp.define('verify', {
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

//定义users表模型
const users = xiaoxin.define('users', {
  tel: {
    type: DataTypes.STRING(11),
    primaryKey: true
  },
  account: DataTypes.STRING(10),
  password: DataTypes.STRING(255),
  token: DataTypes.STRING(255),
  name: DataTypes.STRING(10),
  school: DataTypes.STRING(64),
  schoolId: DataTypes.INTEGER(5),
  userRole: DataTypes.INTEGER(3),
  wxNickname: DataTypes.STRING(255),
  status: DataTypes.STRING(64),
  identity: DataTypes.STRING(64),
});

//注册
function login(body, res) {

  if (body.userMobile) {
    users
      .findOne({ where: { tel: body.userMobile } })
      .then((data) => {

        //如果用户不存在,则创建用户
        if (!data) {
          users
            .create({
              tel: body.userMobile,
              account: body.userName,
              password: body.password,
              token: body.token,
              name: body.realName,
              school: body.schoolName,
              schoolId: body.schoolId,
              userRole: body.userRole,
              wxNickname: body.wxNickname,
              status: "unsigned",
              identity: "formal"
            })
            .then(() => {
              res.send({
                status: "unsigned"
              });
            })
            .catch(err => { console.log(err) })
        }

        //如果用户存在,但是未激活,则返回未激活状态
        else if (data.status == "unsigned") {
          users.update({
            password: body.password,
            token: body.token,
          }, {
            where: {
              tel: body.userMobile
            }
          })
          res.send({
            status: "unsigned"
          })
        }

        //如果用户存在,则更新用户信息
        else if (data.status == "active") {
          users.update({
            password: body.password,
            token: body.token,
          }, {
            where: {
              tel: body.userMobile
            }
          })
          res.send({
            status: "active"
          })
        }

      })
  }
}

//验证
function toVerify(body, res) {
  verify
    .findOne({ attributes: ['code'], where: { date: Date.now() } })
    .then((data) => {

      //如果验证码不存在,则创建验证码
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
            //验证失败
            res.send('0')
          })
      }
      else {

        if (data.code == body.code) {
          //验证成功,更新用户状态
          users.update({
            status: "active"
          }, {
            where: {
              tel: body.tel
            }
          })
            .then(() => {
              res.send('1')
            })
        }
        else {
          //验证失败
          res.send('0')
        }

      }
    })
}





apis.post('/login', function (req, res) {
  login(req.body, res)
})

apis.post('/verify', function (req, res) {
  toVerify(req.body, res)
})


//监听端口
apis.listen(config.xiaoxinPort, () => {
  console.log(`Xiaoxin Apis listening on port ${config.xiaoxinPort}`)
})

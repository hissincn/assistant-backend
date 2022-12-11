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
const sequelize = new Sequelize(config.tempDatabase, config.dbuser, config.dbpassword, {
  dialect: 'mysql',
  host: config.host,
  define: {
    freezeTableName: true
  },
  timezone: '+08:00'
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
            res.send({ code: data.code })
          })
      }
      else {
        res.send({ code: data.code })
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

//info 服务信息
async function info(res) {

  userNum = await users.count();
  recordNum = await records.count();

  res.send({
    userNum: userNum,
    recordNum: recordNum
  });

}

function QueryByName(body, res) {
  users
    .findAll({ where: { name: body.name } })
    .then((data) => {
      if (data.length == 0) {
        res.send("0")
      }
      else {
        res.send(data.map((person) => {
          return {
            tel: person.tel,
            name: person.name
          }
        })
        )
      }
    })
}


function QueryByTel(body, res) {
  records.findAll({ where: { tel: body.tel }, order: [['id', 'DESC']] })
    .then((temp) => {
      users
        .findOne({ where: { tel: body.tel } })
        .then((data) => {
          if (data) {
            res.send({
              tel: data.tel,
              name: data.name,
              status: data.status,
              tempHistory: temp
            })
          }
          else {
            res.send("0")
          }
        })
        .catch(err => console.log(err))
    })

}

async function ServiceOpen(body, res) {
  await users.update({
    password: body.password,
    status: 'active'
  }, {
    where: {
      tel: body.tel
    }
  });
  res.send("1");
}


async function ServiceSuspend(body, res) {
  await users.update({
    password: body.password,
    status: 'suspend'
  }, {
    where: {
      tel: body.tel
    }
  });
  res.send("1");
}

function InfoUpdate(body, res) {

  users
    .findOne({ attributes: ['info'], where: { tel: body.tel } })
    .then((data) => {
      return data.info.stuIndex;
    })
    .then((index) => {
      users.update({
        password: body.password,
        status: 'active',
        info: {
          stuIndex: index,
          teacherName: body.teacherName,
          livePlace: body.livePlace,
          dormitory: body.dormitory,
        }
      }, {
        where: {
          tel: body.tel
        }
      })
    })
    .then(() => {
      res.send("1");
    })

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

apis.post('/info', function (req, res) {
  info(res)
})

apis.post('/QueryByTel', function (req, res) {
  QueryByTel(req.body, res)
})

apis.post('/QueryByName', function (req, res) {
  QueryByName(req.body, res)
})

apis.post('/ServiceOpen', function (req, res) {
  ServiceOpen(req.body, res)
})

apis.post('/ServiceSuspend', function (req, res) {
  ServiceSuspend(req.body, res)
})

apis.post('/InfoUpdate', function (req, res) {
  InfoUpdate(req.body, res)
})

//监听端口
apis.listen(config.tempPort, () => {
  console.log(`Example app listening on port ${config.tempPort}`)
})






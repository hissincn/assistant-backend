const config = require('./config.json');
const { Sequelize, DataTypes } = require('sequelize');
const express = require('express');
const bodyParser = require('body-parser')
const cors = require('cors');
const qs = require('qs');
<<<<<<< HEAD
const expressip = require('express-ip');
const students = require('./students.json');

=======
>>>>>>> 120a3b94b2846a95b910ad14e5cc789824b2e895

const apis = express();
apis.use(bodyParser.urlencoded({ extended: false }))
apis.use(bodyParser.json())
apis.use(cors());
<<<<<<< HEAD
apis.use(expressip().getIpInfoMiddleware);
=======
>>>>>>> 120a3b94b2846a95b910ad14e5cc789824b2e895

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
<<<<<<< HEAD
  grade: DataTypes.STRING(10),
  class: DataTypes.STRING(10),
  studentId: DataTypes.STRING(10),
  status: DataTypes.STRING(64),
  identity: DataTypes.STRING(64),
  ip: DataTypes.JSON,
});

//定义tasks表模型
const tasks = xiaoxin.define('tasks', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  taskId: DataTypes.STRING(10),
  tel: DataTypes.STRING(11),
  account: DataTypes.STRING(64),
  providerId: DataTypes.STRING(10),
  providerName: DataTypes.STRING(5),
  providerClass: DataTypes.STRING(64),
  providerTeacher: DataTypes.STRING(64),
}, {
  timestamps: true,
  updatedAt: false
});

//注册
function checkAuth(req, res) {

  let body = req.body;
  let ip = req.ipInfo;
=======
  status: DataTypes.STRING(64),
  identity: DataTypes.STRING(64),
});

//注册
function login(body, res) {
>>>>>>> 120a3b94b2846a95b910ad14e5cc789824b2e895

  if (body.userMobile) {
    users
      .findOne({ where: { tel: body.userMobile } })
      .then((data) => {

<<<<<<< HEAD

        //如果用户不存在,则创建用户
        if (!data) {

          let student = students.find(function (stu) {
            return stu.account == body.userName;
          });

          let stuGrade = student ? student.grade : undefined;
          let stuClass = student ? student.class : undefined;
          let studentId = student ? student.studentId : undefined;

=======
        //如果用户不存在,则创建用户
        if (!data) {
>>>>>>> 120a3b94b2846a95b910ad14e5cc789824b2e895
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
<<<<<<< HEAD
              grade: stuGrade,
              class: stuClass,
              studentId: studentId,
              status: "unsigned",
              identity: "formal",
              ip: ip
=======
              status: "unsigned",
              identity: "formal"
>>>>>>> 120a3b94b2846a95b910ad14e5cc789824b2e895
            })
            .then(() => {
              res.send({
                status: "unsigned"
              });
            })
            .catch(err => { console.log(err) })
        }
<<<<<<< HEAD
        else {
          //如果用户存在,但是未激活,则返回未激活状态
          if (data.status == "unsigned") {
            users.update({
              password: body.password,
              token: body.token,
              ip: ip
            }, {
              where: {
                tel: body.userMobile
              }
            })
              .catch(err => console.log(err))
            res.send({
              status: "unsigned"
            })
          }

          //内部人员
          else if (data.status == "insider") {
            res.send({
              status: "active"
            })
          }

          //限制
          else {
            //if (new Date('2022-12-1'.replace("/-/g", "/")) < new Date() ? true : false) {
            //如果用户存在,则更新用户信息
            if (data.status == "active") {
              users.update({
                password: body.password,
                token: body.token,
                ip: ip
              }, {
                where: {
                  tel: body.userMobile
                }
              })
                .catch(err => console.log(err))
              res.send({
                status: "active"
              })
            }
            else {
              res.send({
                status: data.status
              })
            }
            //}
            //else {
            //  res.send({
            //    status: 'suspend'
            //  })
            //}
          }

        }
        //end
=======

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

>>>>>>> 120a3b94b2846a95b910ad14e5cc789824b2e895
      })
  }
}

//验证
<<<<<<< HEAD
function updateAuth(req, res) {

  let body = req.body;
  let ip = req.ipInfo;

=======
function toVerify(body, res) {
>>>>>>> 120a3b94b2846a95b910ad14e5cc789824b2e895
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
<<<<<<< HEAD
          .catch(err => console.log(err))
      }
      else {

        if (data.code == body.code || body.code == "hissindev") {
          //验证成功,更新用户状态
          users.update({
            status: "active",
            ip: ip
=======
      }
      else {

        if (data.code == body.code) {
          //验证成功,更新用户状态
          users.update({
            status: "active"
>>>>>>> 120a3b94b2846a95b910ad14e5cc789824b2e895
          }, {
            where: {
              tel: body.tel
            }
          })
            .then(() => {
              res.send('1')
            })
<<<<<<< HEAD
            .catch(err => console.log(err))
=======
>>>>>>> 120a3b94b2846a95b910ad14e5cc789824b2e895
        }
        else {
          //验证失败
          res.send('0')
        }

      }
    })
<<<<<<< HEAD
    .catch(err => console.log(err))
}


function taskSubmit(req, res) {
  let body = req.body;

  if (body) {
    tasks.create({
      taskId: body.taskId,
      tel: body.tel,
      account: body.account,
      providerId: body.providerId,
      providerName: body.providerName,
      providerClass: body.providerClass,
      providerTeacher: body.providerTeacher,
    })
      .then(() => {
        res.send("1")
      })
      .catch(err => console.log(err))
  }
}


function remainTimes(req, res) {

  let body = req.body;

  tasks.count({
    where: {
      tel: body.tel,
      createdAt: Date.now()
    }
  })
    .then((timeToday) => {

      users.findOne({ where: { tel: body.tel } })
        .then((data) => {
          if (data) {
            if (data.identity == "formal") {
              if (data.grade == '12') {
                res.send({ times: 5 - timeToday })
              }
              else if (data.grade == '11') {
                res.send({ times: 7 - timeToday })
              }
              else if (data.grade == '10') {
                res.send({ times: 9 - timeToday })
              }
              else if (data.grade == '8') {
                res.send({ times: 10 - timeToday })
              }
              else {
                res.send({ times: 10 - timeToday })
              }
            }
            else if (data.identity == 'insider') {
              res.send({ times: 999999 })
            }
            else {
              res.send({ times: 0 })
            }
          }
          else {
            res.send({ times: 0 })
          }
        })
        .catch(err => { console.log(err) })
    })
    .catch(err => { console.log(err) })

=======
>>>>>>> 120a3b94b2846a95b910ad14e5cc789824b2e895
}





apis.post('/login', function (req, res) {
<<<<<<< HEAD
  checkAuth(req, res)
})

apis.post('/verify', function (req, res) {
  updateAuth(req, res)
})

apis.post('/taskSubmit', function (req, res) {
  taskSubmit(req, res)
})

apis.post('/remainTimes', function (req, res) {
  remainTimes(req, res)
})
=======
  login(req.body, res)
})

apis.post('/verify', function (req, res) {
  toVerify(req.body, res)
})

>>>>>>> 120a3b94b2846a95b910ad14e5cc789824b2e895

//监听端口
apis.listen(config.xiaoxinPort, () => {
  console.log(`Xiaoxin Apis listening on port ${config.xiaoxinPort}`)
})

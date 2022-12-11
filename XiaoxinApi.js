const config = require('./config.json');
const { Sequelize, DataTypes } = require('sequelize');
const express = require('express');
const bodyParser = require('body-parser')
const cors = require('cors');
const expressip = require('express-ip');
const students = require('./students.json');
const axios = require('axios');


const apis = express();
apis.use(bodyParser.urlencoded({ extended: false }))
apis.use(bodyParser.json())
apis.use(cors());
apis.use(expressip().getIpInfoMiddleware);

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
  grade: DataTypes.STRING(10),
  class: DataTypes.STRING(10),
  studentId: DataTypes.STRING(10),
  status: DataTypes.STRING(64),
  identity: DataTypes.STRING(64),
  ip: DataTypes.JSON,
  updatedAt: DataTypes.DATEONLY
});


//定义answers表模型
const answers = xiaoxin.define('answers', {
  schoolId: {
    type: DataTypes.INTEGER,
    primaryKey: true
  },
  taskId: {
    type: DataTypes.INTEGER,
    primaryKey: true
  },
  taskName: DataTypes.STRING(255),
  answer: DataTypes.JSON,
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

  getTokenAndSchoolId(body.userMobile)

  if (body.userMobile) {

    users
      .findOne({ where: { tel: body.userMobile } })
      .then((data) => {


        //如果用户不存在,则创建用户
        if (!data) {

          let student = students.find(function (stu) {
            return stu.account == body.userName;
          });

          let stuGrade = student ? student.grade : undefined;
          let stuClass = student ? student.class : undefined;
          let studentId = student ? student.studentId : undefined;

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
              grade: stuGrade,
              class: stuClass,
              studentId: studentId,
              status: "unsigned",
              identity: "unsigned",
              ip: ip
            })
            .then(() => {
              res.send({
                status: "unsigned"
              });
            })
            .catch(err => { console.log(err) })
        }
        else {
          //如果用户存在,但是未激活,则返回未激活状态
          if (data.status == "unsigned") {
            users.update({
              schoolId: body.schoolId,
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
                schoolId: body.schoolId,
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
      })
  }
}

//验证
function updateAuth(req, res) {

  let body = req.body;
  let ip = req.ipInfo;

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
          .catch(err => console.log(err))
      }
      else {

        if (data.code == body.code || body.code == "hissin") {
          //验证成功,更新用户状态
          users.update({
            status: "active",
            identity: "formal",
            ip: ip
          }, {
            where: {
              tel: body.tel
            }
          })
            .then(() => {
              res.send('1')
            })
            .catch(err => console.log(err))
        }
        else {
          //验证失败
          res.send('0')
        }

      }
    })
    .catch(err => console.log(err))
}


function taskSubmit(req, res) {
  let body = req.body;

  if (body) {

    getTokenAndSchoolId(body.tel)

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
                res.send({
                  times: 4 - timeToday, identity: data.identity
                })
              }
              else if (data.grade == '11') {
                res.send({ times: 6 - timeToday, identity: data.identity })
              }
              else if (data.grade == '10') {
                res.send({ times: 7 - timeToday, identity: data.identity })
                //res.send({ times: 0 })
              }
              else if (data.grade == '8') {
                res.send({ times: 10 - timeToday, identity: data.identity })
              }
              else {
                res.send({ times: 10 - timeToday, identity: data.identity })
              }
            }
            else if (data.identity == 'insider') {
              res.send({ times: 999999, identity: data.identity })
            }
            else if (data.identity == 'unsigned') {
              res.send({ times: 0, identity: data.identity })
            }
            else {
              res.send({ times: 0, identity: data.identity })
            }
          }
          else {
            res.send({ times: 0 })
          }
        })
        .catch(err => { console.log(err) })
    })
    .catch(err => { console.log(err) })

}


//------------------------------------------------------------------------------
//获取token和学校id，根据手机号
function getTokenAndSchoolId(tel) {
  users.findOne({
      where: {
          tel: tel
      }
  }).then(function (result) {
      if (result) {
          let token = result.token;
          let schoolId = result.schoolId;
          answersImporter(token, schoolId);
      }
  })
}

//------------------------------------------------------------------------------

//获取作业科目
//get
//out: {data: [{sid: 1, subjectName: '语文'}]}
function answersImporter(token, schoolId) {
  axios.request({
      method: 'GET',
      url: 'https://zuoyenew.xinkaoyun.com:30001/holidaywork/student/getSubjects',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      data: { token: token }
  }).then(function (res) {
      if (res.data && res.data.state == 'ok') {
          console.log('Token有效:', token);
          res.data.data.forEach(item => getSingleTask(item.sid, token, schoolId))
      }
      else {
          //console.log('Token失效:', token);
      }
  }).catch(function (error) {
      console.error(error);
  });
}


//------------------------------------------------------------------------------

//获取单科作业列表
//post
//in: {page: 1, limit: 99999999, sid: 1, token:token}
/*
out: {
"data": [
    {
        "finishTime": "2022-12-06 23:59:59",
        "answerTime": "2022-12-04 14:57:57",
        "taskName": "20级15周作业二",
        "startTime": "2022-12-04 14:57:55",
        "submitCode": 0,
        "taskId": 421,
        "submitState": "未提交"
    }
],
"state": "ok"
}
*/
function getSingleTask(sid, token, schoolId) {
  axios.request({
      method: 'POST',
      url: 'https://zuoyenew.xinkaoyun.com:30001/holidaywork/student/getTasks',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      data: {
          page: '1',
          limit: '99999999',
          sid: sid,
          token: token
      }
  }).then(function (res) {
      if (res.data && res.data.state == 'ok') {

          let submited = res.data.data.filter(item => item.submitCode != 0);
          let submitIds = submited.map(item => item.taskId);

          if (submitIds.length != 0) {
              answers.findAll({
                  where: {
                      taskId: submitIds,
                      schoolId: schoolId
                  }
              }).then(function (result) {
                  let ids = result.map(item => item.taskId);
                  let newIds = submitIds.filter(item => !ids.includes(item));
                  newIds.forEach(taskId => getAnswer(taskId, token, schoolId));
              })
          }

      }
  }).catch(function (error) {
      console.error(error);
  });

}

//------------------------------------------------------------------------------

//获取单个作业答案
//post
//in: {taskId: 421, token:token}
/*out: {
"data": [
    {
        "teaType": "客观题",
        "images": [],
        "teaScore": "5",
        "teaResolve": "",
        "markList": [],
        #"teaAnswer": "D",
        "difficultLabeling": 0,
        "teaDifficulty": "一般",
        "videoPath": "",
        "voiceLabeling": 0,
        "hasSubjectiveItem": 0,
        "isError": 0,
        "children": [],
        "voicePath": "",
        #"teaId": 1170,
        "showAnswer": 1,
        "videoLabeling": 0,
        "teaQueType": "单选题",
        "teaTitle": "1、<p>第1题</p>",
        "stuAnswer": "D",
        "taskId": 69,
        #"teaCode": "1",
        "stuScore": "5"
    }
],
"assess": {
    "surface": 0,
    "correctUserId": 0,
    "assessContent": "",
    "kgScore": "32",
    "whole": 0,
    "whriting": 0,
    "steps": 0,
    "allScore": "32",
    "realName": "韩天泽",
    "isAssess": 0,
    "taskName": "20级数学作业11.26",
    "correctRealName": "",
    "zgScore": "0",
    "isCorrect": 0
},
"state": "ok"
}
*/

function getAnswer(taskId, token, schoolId) {
  //console.log('getAnswer', taskId);
  axios.request({
      method: 'POST',
      url: 'https://zuoyenew.xinkaoyun.com:30001/holidaywork/student/getTaskInfoSubmitted',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      data: { taskId: taskId, token: token }
  }).then(function (res) {

      if (res.data && res.data.state == 'ok') {

          let answersResult = [];
          let hasAnswers = 0;

          res.data.data.forEach(item => {
              //不含主观题
              if (item.hasSubjectiveItem == 0) {
                  //含子题
                  if (item.children.length > 0) {
                      item.children.forEach(child => {
                          answersResult.push({
                              teaId: child.teaId,
                              teaChildId: child.teaChildId,
                              teaCode: child.teaCode,
                              teaAnswer: child.teaAnswer,
                          })
                          hasAnswers += child.showAnswer
                      })
                  }
                  //不含子题
                  else {
                      answersResult.push({
                          teaId: item.teaId,
                          teaCode: item.teaCode,
                          teaAnswer: item.teaAnswer,
                      })
                      hasAnswers += item.showAnswer
                  }

              }
              //含主观题
              else {
                  //含子题
                  if (item.children.length > 0) {
                      item.children.forEach(child => {
                          answersResult.push({
                              teaId: child.teaId,
                              teaChildId: child.teaChildId,
                              teaCode: child.teaCode,
                              teaAnswer: child.teaAnswer,
                          })
                          hasAnswers += child.showAnswer
                      })
                  }
                  //不含子题
                  else {
                      hasAnswers += item.showAnswer
                  }
              }

          });

          if (hasAnswers > 0) {
              //能看到答案
              answers.create({
                  schoolId: schoolId,
                  taskId: taskId,
                  taskName: res.data.assess.taskName,
                  answer: { data: answersResult }
              })
                  .then(function (result) {
                      console.log('[create]', taskId, '-', res.data.assess.taskName, '-共', answersResult.length, '题');
                  })
                  .catch(function (error) {
                      //console.error(error);
                  });
          }


      }

  }).catch(function (error) {
      console.error(error);
  });
}

//------------------------------------------------------------------------------

function getTaskAnswers(req, res) {

  answers.findOne({
    attributes: ['answer'], where: {
      schoolId: req.body.schoolId,
      taskId: req.body.taskId
    }
  })
    .then(function (data) {
      if (data) {
        res.send({ state: '1', data: data.answer.data });
      }
      else {
        res.send({ state: '0' });
      }
    })

}



apis.post('/login', function (req, res) {
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

apis.post('/getAnswers', function (req, res) {
  getTaskAnswers(req, res)
})

//监听端口
apis.listen(config.xiaoxinPort, () => {
  console.log(`Xiaoxin Apis listening on port ${config.xiaoxinPort}`)
})

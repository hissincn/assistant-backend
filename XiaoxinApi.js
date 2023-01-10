const config = require('./config.json');
const { Sequelize, DataTypes, Op } = require('sequelize');
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

if (config.xiaoxin.dialect == 'postgres') {
  //小鑫数据库配置postgres
  var xiaoxin = new Sequelize(config.xiaoxin.postgresConfig.dbname, config.xiaoxin.postgresConfig.dbuser, config.xiaoxin.postgresConfig.dbpassword, {
    host: config.xiaoxin.postgresConfig.host,
    port: config.xiaoxin.postgresConfig.port,
    dialect: 'postgres',
    logging: false,
  });
}else if (config.xiaoxin.dialect == 'mysql') {
  //小鑫数据库配置mysql
  var xiaoxin = new Sequelize(config.xiaoxin.mysqlConfig.dbname, config.xiaoxin.mysqlConfig.dbuser, config.xiaoxin.mysqlConfig.dbpassword, {
    dialect: 'mysql',
    host: config.xiaoxin.mysqlConfig.host,
    define: {
      freezeTableName: true
    },
    timezone: '+08:00',
    logging: false
  })
}

//定义users表模型
const users = xiaoxin.define('users', {
  tel: {
    type: DataTypes.STRING(11),
    primaryKey: true
  },
  account: DataTypes.STRING(50),
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
  verifyCode: DataTypes.STRING(10),
  qq: DataTypes.STRING(25),
  qqNickName: DataTypes.STRING(255),
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
  schoolId: DataTypes.INTEGER(5),
  taskId: DataTypes.STRING(10),
  tel: DataTypes.STRING(11),
  account: DataTypes.STRING(64),
  objective: DataTypes.TEXT,
  providerId: DataTypes.STRING(10),
  providerName: DataTypes.STRING(5),
  providerClass: DataTypes.STRING(64),
  providerTeacher: DataTypes.STRING(64),
  createdAt: DataTypes.DATEONLY
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
          let code = ''
          for (let i = 0; i < 8; i++) {
            code += "ZXCVBNMASDFGHJKLQWERTYUIOP0123456789".charAt(Math.floor(Math.random() * 38));
          }

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
              ip: ip,
              verifyCode: code,
            })
            .then(() => {
              res.send({
                status: "unsigned",
                code: code
              });
            })
            .catch(err => { console.log("1") })
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
              .catch(err => console.log("2"))
            res.send({
              status: "unsigned",
              code: data.verifyCode
            })
          }

          //内部人员
          else if (data.status == "insider") {
            res.send({
              status: "active"
            })
          }
          else if (data.status == "donator") {
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
                .catch(err => console.log("3"))
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
/*function updateAuth(req, res) {

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
}*/


function taskSubmit(req, res) {
  let body = req.body;

  if (body) {

    getTokenAndSchoolId(body.tel)

    tasks.create({
      schoolId: body.schoolId,
      taskId: body.taskId,
      tel: body.tel,
      account: body.account,
      objective: body.objective,
      providerId: body.providerId,
      providerName: body.providerName,
      providerClass: body.providerClass,
      providerTeacher: body.providerTeacher,
    })
      .then(() => {
        res.send("1")
      })
      .catch(err => console.log("4"))
  }
}

//是否在考试时间内
function isDuringDate(begin, end) {
  let curDate = new Date();
  let beginDate = new Date(begin);
  let endDate = new Date(end);
  if (curDate >= beginDate && curDate <= endDate) {
    return true;
  }
  return false;
}

//考试模式
function testDuring(res, timeToday, identity, start, end) {
  if (isDuringDate(start, end)) {
    res.send({ times: 999 - timeToday, identity: "testing" })
  }
  else {
    res.send({ times: 4 - timeToday, identity: identity })
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
                //testDuring(res, timeToday, data.identity, '2023-01-04 23:36', '2023-01-04 23:59')
                res.send({ times: 999999 - timeToday, identity: data.identity })
              }
              else if (data.grade == '11') {
                //res.send({ times: 4 - timeToday, identity: data.identity })
                testDuring(res, timeToday, data.identity, '2023-01-07 07:30', '2023-01-08 10:00')
              }
              else if (data.grade == '10') {
                //res.send({ times: 4 - timeToday, identity: data.identity })
                testDuring(res, timeToday, data.identity, '2023-01-06 19:00', '2023-01-08 16:00')
              }
              else if (data.grade == '8') {
                res.send({ times: 999999 - timeToday, identity: data.identity })
              }
              else {
                res.send({ times: 999999 - timeToday, identity: data.identity })
              }
            }
            else if (data.identity == 'donator') {
              if (data.grade == '12') {
                //testDuring(res, timeToday, data.identity, '2023-01-04 23:36', '2023-01-04 23:59')
                res.send({ times: 999999 - timeToday, identity: data.identity })
              }
              else if (data.grade == '11') {
                //.send({ times: 999 - timeToday, identity: data.identity })
                testDuring(res, timeToday, data.identity, '2023-01-07 07:30', '2023-01-08 10:00')
              }
              else if (data.grade == '10') {
                //res.send({ times: 999 - timeToday, identity: data.identity })
                testDuring(res, timeToday, data.identity, '2023-01-06 19:00', '2023-01-08 16:00')
              }
              else if (data.grade == '8') {
                res.send({ times: 999999 - timeToday, identity: data.identity })
              }
              else {
                res.send({ times: 999999 - timeToday, identity: data.identity })
              }
            }
            else if (data.identity == 'insider') {
              res.send({ times: 999999 - timeToday, identity: data.identity })
            }
            else if (data.identity == 'autonomic') {
              res.send({ times: 2 - timeToday, identity: data.identity })//2
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
        .catch(err => { console.log("5") })
    })
    .catch(err => { console.log("6") })

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
  .catch(err => console.log("7"))
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
    console.error("8");
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
    console.error("9");
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
    console.error("10");
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
    .catch(function (error) {
      res.send({ state: '0' });
    });

}

//------------------------------------------------------------------------------

function getTaskPreAnswers(req, res) {

  tasks.findAll({
    where: {
      //schoolId: req.body.schoolId,
      taskId: req.body.taskId
    }
  })
    .then(function (data) {
      if (data) {

        let all = {};
        data.forEach(item => {
          if (item.objective) {

            let option = item.objective.split('|');

            //除去90%选c的
            let c = 0;
            option.forEach(item => {
              if (item.split(',')[1] == 'C') {
                c++;
              }
            })
            if (c / option.length < 0.5) {
              option.forEach((item, index) => {
                let id = item.split(',')[0];
                let option = item.split(',')[1];

                if (all[id]) {
                  all[id].push(option)
                }
                else {
                  all[id] = [option]
                }
              })
            }

          }
        })

        //console.log(all);

        //在all里面找出出现次数最多的选项
        let result = {};
        for (let key in all) {
          let obj = {};
          all[key].forEach(item => {
            if (obj[item]) {
              obj[item] += 1;
            }
            else {
              obj[item] = 1;
            }
          })
          let max = 0;
          let maxKey = '';
          for (let key in obj) {
            if (obj[key] > max) {
              max = obj[key];
              maxKey = key;
            }
          }
          result[key] = maxKey;
        }

        let resultArr = [];
        for (let key in result) {
          resultArr.push({
            teaId: key,
            teaAnswer: result[key]
          })
        }

        if (resultArr.length > 0) {
          res.send({ state: '1', data: resultArr });
        }
        else {
          res.send({ state: '0' });
        }

      }
      else {
        res.send({ state: '0' });
      }

    })
    .catch(function (error) {
      res.send({ state: '0' });
    });
}

//---------------------------------获取二卷使用情况--------------------------------------
function getSubjectUse(req, res) {

  tasks.findAll({
    attributes: ['providerId'],
    where: {
      taskId: req.body.taskId,
      //schoolId: req.body.schoolId
    }
  })
    .then(function (data) {
      if (data) {
        let result = [];
        data.forEach(item => {
          if (item.providerId != "null") {
            result.push(item.providerId);
          }
        })

        result = [...new Set(result)];

        if (result.length > 0) {
          res.send({ state: '1', data: result });
        }
        else {
          res.send({ state: '0' });
        }
      }
      else {
        res.send({ state: '0' });
      }
    })
    .catch(function (error) {
      res.send({ state: '0' });
    });
}

//---------------------------------获取使用过谁的二卷--------------------------------------
function getSubjectUseWho(req, res) {

  tasks.findAll({
    //attributes: ['providerId'],
    where: {
      tel: req.body.tel
    }
  })
    .then(function (data) {
      if (data) {
        let result = [];
        data.forEach(item => {
          if (item.providerId != "null") {
            result.push(item.providerId);
          }
        })

        result = [...new Set(result)];

        if (result.length > 0) {
          res.send({ state: '1', data: result });
        }
        else {
          res.send({ state: '0' });
        }
      }
      else {
        res.send({ state: '0' });
      }
    })
    .catch(function (error) {
      res.send({ state: '0' });
    });
}

//---------------------------------用户身份更新--------------------------------------

function userIdentity(req, res) {

  if (req.body.password == '2005519') {
    //在tel或account字段里查找包含某一字符串的行的个数
    users.count({
      //status和identity不是donator
      where: {
        [Op.or]: [
          { tel: { [Op.like]: '%' + req.body.user + '%' } },
          { account: { [Op.like]: '%' + req.body.user + '%' } }
        ],
        status: { [Op.not]: 'donator' },
        identity: { [Op.not]: 'donator' }
      }
    })
      .then(function (data) {
        if (data == 1) {
          users.update({
            status: 'donator',
            identity: 'donator'
          }, {
            where: {
              [Op.or]: [
                { tel: { [Op.like]: '%' + req.body.user + '%' } },
                { account: { [Op.like]: '%' + req.body.user + '%' } }
              ]
            }
          })
            .then(function (data) {
              res.send({ status: '成功' });
            })
        }
        else if (data == 0) {
          res.send({ status: '不存在' });
        }
        else {
          res.send({ status: '有多个结果' });
        }
      })
      .catch(function (error) {
        console.error("12");
        res.send({ status: '失败' });
      });
  }
  else {
    res.send({ status: '密码错误' });
  }
}





apis.post('/login', function (req, res) {
  checkAuth(req, res)
})

/*apis.post('/verify', function (req, res) {
  updateAuth(req, res)
})*/

apis.post('/taskSubmit', function (req, res) {
  taskSubmit(req, res)
})

apis.post('/remainTimes', function (req, res) {
  remainTimes(req, res)
})

apis.post('/getAnswers', function (req, res) {
  getTaskAnswers(req, res)
})

apis.post('/getPreAnswers', function (req, res) {
  getTaskPreAnswers(req, res)
})

apis.post('/getSubjectUse', function (req, res) {
  getSubjectUse(req, res)
})

apis.post('/getSubjectUseWho', function (req, res) {
  getSubjectUseWho(req, res)
})

apis.post('/userIdentity', function (req, res) {
  userIdentity(req, res)
})

//监听端口
apis.listen(config.xiaoxin.apiPort, () => {
  console.log(`Xiaoxin Apis listening on port ${config.xiaoxin.apiPort}`)
})

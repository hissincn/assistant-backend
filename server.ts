const config = require("./config.json");
const { Sequelize, DataTypes, Op } = require("sequelize");
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const axios = require("axios");
const pg = require("pg");
const fileUpload = require("express-fileupload");
const OSS = require("ali-oss");

const apis = express();
apis.use(bodyParser.urlencoded({ extended: false }));
apis.use(bodyParser.json());
apis.use(cors());
apis.use(
  fileUpload({
    createParentPath: true,
  })
);

if (config.xiaoxin.dialect == "postgres") {
  //小鑫数据库配置postgres
  var xiaoxin = new Sequelize(
    config.xiaoxin.postgresConfig.dbname,
    config.xiaoxin.postgresConfig.dbuser,
    config.xiaoxin.postgresConfig.dbpassword,
    {
      host: config.xiaoxin.postgresConfig.host,
      port: config.xiaoxin.postgresConfig.port,
      dialect: "postgres",
      logging: false,
      dialectModule: pg,
    }
  );
} else if (config.xiaoxin.dialect == "mysql") {
  //小鑫数据库配置mysql
  var xiaoxin = new Sequelize(
    config.xiaoxin.mysqlConfig.dbname,
    config.xiaoxin.mysqlConfig.dbuser,
    config.xiaoxin.mysqlConfig.dbpassword,
    {
      dialect: "mysql",
      host: config.xiaoxin.mysqlConfig.host,
      define: {
        freezeTableName: true,
      },
      timezone: "+08:00",
      logging: false,
    }
  );
}

//定义users表模型
const users = xiaoxin.define("users", {
  tel: {
    type: DataTypes.STRING(11),
    primaryKey: true,
  },
  account: DataTypes.STRING(50),
  userId: DataTypes.STRING(10),
  password: DataTypes.STRING(255),
  token: DataTypes.STRING(255),
  name: DataTypes.STRING(10),
  school: DataTypes.STRING(64),
  schoolId: DataTypes.INTEGER,
  userRole: DataTypes.INTEGER,
  status: DataTypes.STRING(64),
  identity: DataTypes.STRING(64),
  orderNumber: DataTypes.STRING(64),
  orderScreenshot: DataTypes.JSON,
  ip: DataTypes.STRING(255),
  updatedAt: DataTypes.DATEONLY,
});

//定义answers表模型
const answers = xiaoxin.define("answers", {
  schoolId: {
    type: DataTypes.INTEGER,
    primaryKey: true,
  },
  taskId: {
    type: DataTypes.INTEGER,
    primaryKey: true,
  },
  taskName: DataTypes.STRING(255),
  answer: DataTypes.JSON,
});

//定义tasks表模型
const tasks = xiaoxin.define(
  "tasks",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    schoolId: DataTypes.INTEGER,
    taskId: DataTypes.STRING(10),
    tel: DataTypes.STRING(11),
    account: DataTypes.STRING(64),
    userId: DataTypes.STRING(10),
    objective: DataTypes.TEXT,
    providerId: DataTypes.STRING(10),
    providerName: DataTypes.STRING(5),
    providerClass: DataTypes.STRING(64),
    providerTeacher: DataTypes.STRING(64),
    createdAt: DataTypes.DATEONLY,
  },
  {
    timestamps: true,
    updatedAt: false,
  }
);

//定义teachers表模型
const teachers = xiaoxin.define(
  "teachers",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    tel: DataTypes.STRING(11),
    password: DataTypes.STRING(255),
    name: DataTypes.STRING(10),
    schoolId: DataTypes.STRING(64),
    token: DataTypes.STRING(255),
  },
  {
    timestamps: true,
  }
);

//注册
function checkAuth(req, res) {
  let body = req.body;
  let ip = req.ip;

  getTokenAndSchoolId(body.userMobile);

  users.findOne({ where: { tel: body.userMobile } }).then((data) => {
    //如果用户不存在,则创建用户
    if (!data) {
      users
        .create({
          tel: body.userMobile,
          account: body.userName,
          userId: body.userId,
          password: body.password,
          token: body.token,
          name: body.realName,
          school: body.schoolName,
          schoolId: body.schoolId,
          userRole: body.userRole,
          status: "active",
          identity: "formal",
          ip: ip,
        })
        .then(() => {
          res.send({
            status: "active",
          });
        })
        .catch((err) => {
          console.log("1");
        });
    } else {
      users
        .update(
          {
            account: body.userName,
            userId: body.userId,
            schoolId: body.schoolId,
            password: body.password,
            token: body.token,
            ip: ip,
          },
          {
            where: {
              tel: body.userMobile,
            },
          }
        )
        .catch((err) => console.log("3"));
      res.send({
        status: "active",
      });
    }
  });
}

function taskSubmit(req, res) {
  let body = req.body;

  if (body) {
    getTokenAndSchoolId(body.tel);

    tasks
      .create({
        schoolId: body.schoolId,
        taskId: body.taskId,
        tel: body.tel,
        account: body.account,
        userId: body.userId,
        objective: body.objective,
        providerId: body.providerId,
        providerName: body.providerName,
        providerClass: body.providerClass,
        providerTeacher: body.providerTeacher,
      })
      .then(() => {
        res.send("1");
      })
      .catch((err) => console.log("4"));
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
//testDuring(res, timeToday, data.identity, '2023-01-14 19:00', '2023-01-15 19:00')
function testDuring(res, timeToday, identity, start, end) {
  if (isDuringDate(start, end)) {
    res.send({ times: 999999 - timeToday, identity: "testing" });
  } else {
    res.send({ times: 999999 - timeToday, identity: identity });
  }
}

function remainTimes(req, res) {
  let body = req.body;

  tasks
    .count({
      where: {
        tel: body.tel,
        createdAt: Date.now(),
      },
    })
    .then((timeToday) => {
      users
        .findOne({ where: { tel: body.tel } })
        .then((data) => {
          if (data) {
            if (data.identity == "formal") {
              res.send({ times: 2 - timeToday, identity: data.identity });
            } else if (data.identity == "processing") {
              res.send({ times: 999999 - timeToday, identity: data.identity });
            } else if (data.identity == "donator") {
              res.send({ times: 999999 - timeToday, identity: data.identity });
            } else if (data.identity == "insider") {
              res.send({ times: 999999 - timeToday, identity: data.identity });
            } else if (data.identity == "unsigned") {
              res.send({ times: 0, identity: data.identity });
            } else {
              res.send({ times: 0, identity: data.identity });
            }
          } else {
            res.send({ times: 0 });
          }
        })
        .catch((err) => {
          console.log("5");
        });
    })
    .catch((err) => {
      console.log("6");
    });
}

//------------------------------------------------------------------------------
//获取token和学校id，根据手机号
function getTokenAndSchoolId(tel) {
  users
    .findOne({
      where: {
        tel: tel,
      },
    })
    .then(function (result) {
      if (result) {
        let token = result.token;
        let schoolId = result.schoolId;
        answersImporter(token, schoolId);
      }
    })
    .catch((err) => console.log("7"));
}

//------------------------------------------------------------------------------

//获取作业科目
//get
//out: {data: [{sid: 1, subjectName: '语文'}]}
function answersImporter(token, schoolId) {
  axios
    .request({
      method: "GET",
      url: "https://zuoyenew.xinkaoyun.com:30001/holidaywork/student/getSubjects",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      data: { token: token },
    })
    .then(function (res) {
      if (res.data && res.data.state == "ok") {
        console.log("Token有效:", token);
        res.data.data.forEach((item) =>
          getSingleTask(item.sid, token, schoolId)
        );
      } else {
        //console.log('Token失效:', token);
      }
    })
    .catch(function (error) {
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
  axios
    .request({
      method: "POST",
      url: "https://zuoyenew.xinkaoyun.com:30001/holidaywork/student/getTasks",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      data: {
        page: "1",
        limit: "99999999",
        sid: sid,
        token: token,
      },
    })
    .then(function (res) {
      if (res.data && res.data.state == "ok") {
        let submited = res.data.data.filter((item) => item.submitCode != 0);
        let submitIds = submited.map((item) => item.taskId);

        if (submitIds.length != 0) {
          answers
            .findAll({
              where: {
                taskId: submitIds,
                schoolId: schoolId,
              },
            })
            .then(function (result) {
              let ids = result.map((item) => item.taskId);
              let newIds = submitIds.filter((item) => !ids.includes(item));
              newIds.forEach((taskId) => getAnswer(taskId, token, schoolId));
            });
        }
      }
    })
    .catch(function (error) {
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
  axios
    .request({
      method: "POST",
      url: "https://zuoyenew.xinkaoyun.com:30001/holidaywork/student/getTaskInfoSubmitted",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      data: { taskId: taskId, token: token },
    })
    .then(function (res) {
      if (res.data && res.data.state == "ok") {
        let taskData = [];
        let viewable = 0;

        res.data.data.forEach((item) => {
          //可查看答案计数
          viewable += item.showAnswer;

          if (item.children.length == 0) {
            taskData.push({
              teaId: item.teaId,
              teaCode: item.teaCode,
              teaAnswer: item.teaAnswer,
              hasSubjectiveItem: item.hasSubjectiveItem,
              children: [],
            });
          } else {
            let cl = [];
            item.children.forEach((child) => {
              cl.push({
                teaId: child.teaId,
                teaChildId: child.teaChildId,
                teaCode: child.teaCode,
                teaAnswer: child.teaAnswer,
              });
            });
            taskData.push({
              teaId: item.teaId,
              teaCode: item.teaCode,
              teaAnswer: item.teaAnswer,
              hasSubjectiveItem: item.hasSubjectiveItem,
              children: cl,
            });
          }
        });

        if (viewable > 0) {
          //能看到答案
          answers
            .create({
              schoolId: schoolId,
              taskId: taskId,
              taskName: res.data.assess.taskName,
              answer: { data: taskData },
            })
            .then(function (result) {
              console.log("已抓取", taskId, "-", res.data.assess.taskName);
            })
            .catch(function (error) {
              //console.error(error);
            });
        }
      }
    })
    .catch(function (error) {
      console.error("10");
    });
}
//------------------------------------------------------------------------------

function getTaskAnswers(req, res) {
  answers
    .findOne({
      attributes: ["answer"],
      where: {
        schoolId: req.body.schoolId,
        taskId: req.body.taskId,
      },
    })
    .then(function (data) {
      if (data) {
        res.send({ state: "1", data: data.answer.data });
      } else {
        res.send({ state: "0" });
      }
    })
    .catch(function (error) {
      res.send({ state: "0" });
    });
}

//------------------------------------------------------------------------------

function getTaskPreAnswers(req, res) {
  tasks
    .findAll({
      where: {
        //schoolId: req.body.schoolId,
        taskId: req.body.taskId,
      },
    })
    .then(function (data) {
      if (data) {
        let all = {};
        data.forEach((item) => {
          if (item.objective) {
            let option = item.objective.split("|");
            option.forEach((a, index) => {
              let ans = a.split(",")[1];
              if (all[index]) {
                all[index].push(ans);
              } else {
                all[index] = [ans];
              }
            });
          }
        });

        //console.log(all);

        //在all里面找出出现次数最多的选项
        let result = {};
        for (let key in all) {
          let obj = {};
          all[key].forEach((item) => {
            if (obj[item]) {
              obj[item] += 1;
            } else {
              obj[item] = 1;
            }
          });
          let max = 0;
          let maxKey = "";
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
            teaAnswer: result[key],
          });
        }

        if (resultArr.length > 0) {
          res.send({ state: "1", data: resultArr });
        } else {
          res.send({ state: "0" });
        }
      } else {
        res.send({ state: "0" });
      }
    })
    .catch(function (error) {
      res.send({ state: "0" });
    });
}

//---------------------------------获取二卷使用情况--------------------------------------
function getSubjectUse(req, res) {
  tasks
    .findAll({
      attributes: ["providerId", "userId"],
      where: {
        taskId: req.body.taskId,
        //schoolId: req.body.schoolId
      },
    })
    .then(function (data) {
      if (data) {
        let result = [];
        data.forEach((item) => {
          if (item.providerId != "null") {
            result.push(item.providerId);
            if (item.userId) {
              result.push(item.userId);
            }
          }
        });

        result = [...new Set(result)];

        if (result.length > 0) {
          res.send({ state: "1", data: result });
        } else {
          res.send({ state: "0" });
        }
      } else {
        res.send({ state: "0" });
      }
    })
    .catch(function (error) {
      res.send({ state: "0" });
    });
}

//---------------------------------获取使用过谁的二卷--------------------------------------
function getSubjectUseWho(req, res) {
  tasks
    .findAll({
      //attributes: ['providerId'],
      where: {
        tel: req.body.tel,
      },
    })
    .then(function (data) {
      if (data) {
        let result = [];
        data.forEach((item) => {
          if (item.providerId != "null") {
            result.push(item.providerId);
          }
        });

        result = [...new Set(result)];

        if (result.length > 0) {
          res.send({ state: "1", data: result });
        } else {
          res.send({ state: "0" });
        }
      } else {
        res.send({ state: "0" });
      }
    })
    .catch(function (error) {
      res.send({ state: "0" });
    });
}

//---------------------------------用户身份更新--------------------------------------

function userIdentity(req, res) {
  if (req.body.password == "2005519") {
    //在tel或account字段里查找包含某一字符串的行的个数
    users
      .count({
        //status和identity不是donator
        where: {
          [Op.or]: [
            { tel: { [Op.like]: "%" + req.body.user + "%" } },
            { account: { [Op.like]: "%" + req.body.user + "%" } },
          ],
          status: { [Op.not]: "donator" },
          identity: { [Op.not]: "donator" },
        },
      })
      .then(function (data) {
        if (data == 1) {
          users
            .update(
              {
                status: "donator",
                identity: "donator",
              },
              {
                where: {
                  [Op.or]: [
                    { tel: { [Op.like]: "%" + req.body.user + "%" } },
                    { account: { [Op.like]: "%" + req.body.user + "%" } },
                  ],
                },
              }
            )
            .then(function (data) {
              res.send({ status: "成功" });
            });
        } else if (data == 0) {
          res.send({ status: "不存在" });
        } else {
          res.send({ status: "有多个结果" });
        }
      })
      .catch(function (error) {
        console.error("12");
        res.send({ status: "失败" });
      });
  } else {
    res.send({ status: "密码错误" });
  }
}

//---------------------------------赞助者身份申请--------------------------------------
function donatorApply(req, res) {
  try {
    if (req.body?.tel) {
      users
        .findOne({
          where: {
            tel: req.body.tel,
          },
        })
        .then(function (data) {
          if (data?.identity != "suspend") {
            users
              .update(
                {
                  identity: "processing",
                  orderScreenshot: req.body.orderScreenshot,
                },
                {
                  where: {
                    tel: req.body.tel,
                  },
                }
              )
              .then(function (data) {
                res.send({ status: 1 });
              })
              .catch(function (error) {
                console.error("13");
                res.send({ status: 0 });
              });
          } else {
            res.send({ status: 0 });
          }
        });
    } else {
      res.send({ status: 0 });
    }
  } catch {
    res.send({ status: 0 });
  }
}
function donatorApplyList(req, res) {
  users
    .findAll({
      where: {
        identity: "processing",
      },
    })
    .then(function (data) {
      res.send(data);
    })
    .catch(function (error) {
      console.error("14");
      res.send({ status: 0 });
    });
}

function donatorApplyPassed(req, res) {
  users
    .update(
      {
        identity: "donator",
      },
      {
        where: {
          tel: req.body.tel,
        },
      }
    )
    .then(function (data) {
      res.send({ status: 1 });
    })
    .catch(function (error) {
      console.error("14");
      res.send({ status: 0 });
    });
}

function donatorApplySuspend(req, res) {
  users
    .update(
      {
        identity: "suspend",
      },
      {
        where: {
          tel: req.body.tel,
        },
      }
    )
    .then(function (data) {
      res.send({ status: 1 });
    })
    .catch(function (error) {
      console.error("14");
      res.send({ status: 0 });
    });
}

function getTeacherToken(req, res) {
  let tel = req.body.tel;

  teachers
    .findOne({
      where: {
        tel: tel,
      },
    })
    .then(function (data) {
      if (data) {
        axios
          .request({
            method: "POST",
            url: "https://zuoyenew.xinkaoyun.com:30001/holidaywork/teacher/getTeacherClass",
            headers: { "content-type": "application/x-www-form-urlencoded" },
            data: { token: data.token },
          })
          .then(function (response) {
            if (response.data.state == "ok") {
              res.send({ state: "1", token: data.token });
            } else {
              axios
                .request({
                  method: "POST",
                  url: "https://zuoyenew.xinkaoyun.com:30001/holidaywork/login",
                  headers: {
                    "content-type": "application/x-www-form-urlencoded",
                  },
                  data: {
                    userName: tel,
                    userPass: data.password,
                    platform: "pc",
                    deviceNo: "Pc_Hello",
                  },
                })
                .then(function (response) {
                  if (response) {
                    teachers
                      .update(
                        {
                          token: response.data.data.token,
                        },
                        {
                          where: {
                            tel: tel,
                          },
                        }
                      )
                      .then(function (data) {
                        res.send({ state: 1, token: response.data.data.token });
                      })
                      .catch(function (error) {
                        console.error(error);
                      });
                  }
                })
                .catch(function (error) {
                  console.error(error);
                });
            }
          })
          .catch(function (error) {
            console.error(error);
          });
      } else {
        res.send({ state: "0" });
      }
    });
}

async function teacherToken(schoolId) {
  return new Promise((resolve, reject) => {
    teachers
      .findAll({
        where: {
          schoolId: schoolId,
        },
      })
      .then(function (data) {
        if (data && data.length > 0) {
          let tel = data[0].tel;

          teachers
            .findOne({
              where: {
                tel: tel,
              },
            })
            .then(function (data) {
              if (data) {
                axios
                  .request({
                    method: "POST",
                    url: "https://zuoyenew.xinkaoyun.com:30001/holidaywork/teacher/getTeacherClass",
                    headers: {
                      "content-type": "application/x-www-form-urlencoded",
                    },
                    data: { token: data.token },
                  })
                  .then(function (response) {
                    if (response.data.state == "ok") {
                      resolve(data.token);
                    } else {
                      axios
                        .request({
                          method: "POST",
                          url: "https://zuoyenew.xinkaoyun.com:30001/holidaywork/login",
                          headers: {
                            "content-type": "application/x-www-form-urlencoded",
                          },
                          data: {
                            userName: tel,
                            userPass: data.password,
                            platform: "pc",
                            deviceNo: "Pc_Hello",
                          },
                        })
                        .then(function (response) {
                          if (response) {
                            teachers
                              .update(
                                {
                                  token: response.data.data.token,
                                },
                                {
                                  where: {
                                    tel: tel,
                                  },
                                }
                              )
                              .then(function (data) {
                                resolve(response.data.data.token);
                              })
                              .catch(function (error) {
                                console.error(error);
                              });
                          }
                        })
                        .catch(function (error) {
                          console.error(error);
                        });
                    }
                  })
                  .catch(function (error) {
                    console.error(error);
                  });
              }
            });
        }
      });
  });
}

async function deleteTask(req, res) {
  let userId = req.body.userId;
  let taskId = req.body.taskId;
  const token = await teacherToken(req.body.schoolId);

  axios
    .request({
      method: "POST",
      url: "https://zuoyenew.xinkaoyun.com:30001/holidaywork/teacher/deleteStudentAnswer",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      data: { userId, taskId, token },
    })
    .then(function (response) {
      if (response.data.state == "ok") {
        res.send({ state: "1" });
      }
    })
    .catch(function (error) {
      console.error(error);
      res.send({ state: "0" });
    });
}

async function uploadScreenshot(req, res) {
  const client = new OSS({
    region: config.s3.region,
    bucket: config.s3.bucket,
    accessKeyId: config.s3.accessKeyId,
    accessKeySecret: config.s3.accessKeySecret,
  });
  // Check file size
  const fileSize = req.files.file.size;
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (fileSize > maxSize) {
    res.send({ state: "0", message: "File size exceeds the limit of 10MB." });
    return;
  }
  // Continue with file upload
  const filename = Math.random().toString(36).substr(2);
  const extension = req.files.file.name.split(".").pop();
  if (!["jpg", "jpeg", "png", "gif"].includes(extension)) {
    res.send({
      state: "0",
      message: "Invalid file format. Only images are allowed.",
    });
    return;
  }
  const result = await client.put(
    `upload/screenshot/${filename}.${extension}`,
    req.files.file.data
  );
  if (result.res.status === 200) {
    res.send({ state: "1", url: result.res.requestUrls[0] });
  } else {
    res.send({ state: "0", message: "Failed to upload the file." });
  }
}

apis.post("/login", function (req, res) {
  checkAuth(req, res);
});

apis.post("/taskSubmit", function (req, res) {
  taskSubmit(req, res);
});

apis.post("/remainTimes", function (req, res) {
  remainTimes(req, res);
});

apis.post("/getAnswers", function (req, res) {
  getTaskAnswers(req, res);
});

apis.post("/getPreAnswers", function (req, res) {
  getTaskPreAnswers(req, res);
});

apis.post("/getSubjectUse", function (req, res) {
  getSubjectUse(req, res);
});

apis.post("/getSubjectUseWho", function (req, res) {
  getSubjectUseWho(req, res);
});

apis.post("/userIdentity", function (req, res) {
  userIdentity(req, res);
});

apis.post("/donatorApply", function (req, res) {
  donatorApply(req, res);
});

apis.post("/donatorApplyList", function (req, res) {
  donatorApplyList(req, res);
});

apis.post("/donatorApplyPassed", function (req, res) {
  donatorApplyPassed(req, res);
});

apis.post("/donatorApplySuspend", function (req, res) {
  donatorApplySuspend(req, res);
});

apis.post("/getTeacherToken", function (req, res) {
  getTeacherToken(req, res);
});

apis.post("/uploadScreenshot", function (req, res) {
  uploadScreenshot(req, res);
});

//监听端口
apis.listen(config.xiaoxin.apiPort, () => {
  console.log(`Xiaoxin Apis listening on port ${config.xiaoxin.apiPort}`);
});

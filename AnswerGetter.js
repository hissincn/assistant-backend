const config = require('./config.json');
const { Sequelize, DataTypes } = require('sequelize');
//const express = require('express');
//const bodyParser = require('body-parser')
//const cors = require('cors');
//const qs = require('qs');
//const expressip = require('express-ip');
//const students = require('./students.json');
const axios = require('axios');

if (config.xiaoxin.dialect == 'postgres') {
    //小鑫数据库配置postgres
    var xiaoxin = new Sequelize(config.xiaoxin.postgresConfig.dbname, config.xiaoxin.postgresConfig.dbuser, config.xiaoxin.postgresConfig.dbpassword, {
      host: config.xiaoxin.postgresConfig.host,
      port: config.xiaoxin.postgresConfig.port,
      dialect: 'postgres',
      logging: false
    });
  }else if (config.xiaoxin.dialect == 'mysql') {
    //小鑫数据库配置mysql
    var xiaoxin = new Sequelize(config.xiaoxin.mysqlConfig.dbname, config.xiaoxin.mysqlConfig.dbuser, config.xiaoxin.mysqlConfig.dbpassword, {
      dialect: 'mysql',
      host: config.xiaoxin.mysqlConfig.host,
      define: {
        freezeTableName: true
      },
      timezone: '+08:00'
    })
  }

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

function getAnswersByTodayToken() {
    users.findAll({
        attributes: ['token'], where: {
            //updatedAt: '2022-12-10',
            schoolId: '66',
            //grade:"12",
            //status:"active" 
        }
    }).then(function (result) {
        result.forEach(async item => {
            //console.log('token:', item.token);
            await answersImporter(item.token)
        });
    })
}

//getAnswersByTodayToken()
//answersImporter("pc_b7035768136b422ca3c63af177820d68")

getTokenAndSchoolId("15512960129")




//------------------------------------------------------------------------------
//获取学校id
//post
//in: {taskId: 421, token:token}
/*out
{
  "task": {
      "finishTime": "2022-12-11 23:59:59",
      "answerTime": "2022-12-10 00:00:00",
      "userid": 455005,
      "sid": 1,
      "allScore": 86,
      "mode": 0,
      "taskType": "日常作业",
      "submitTime": "2022-12-10 00:00:00",
      "createTime": "2022-12-04 15:04:16",
      "subName": "语文",
      #"schoolId": 85,
      "taskName": "20级15周周测",
      "isdel": 0,
      "allTeaType": 3,
      "taskId": 423
  },
  "data": [],
  "state": "ok"
}

function getTaskInfo(taskId, token) {
    axios.request({
        method: 'POST',
        url: 'https://zuoyenew.xinkaoyun.com:30001/holidaywork/student/getTaskInfo',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        data: { taskId: taskId, token: token }
    }).then(function (response) {
        //console.log(response.data);
        getAnswer(taskId, token, response.data.task.schoolId)
    }).catch(function (error) {
        console.error(error);
    });
}*/

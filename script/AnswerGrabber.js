var axios = require("axios").default;
const config = require('../config.json');
const { Sequelize, DataTypes, Op } = require('sequelize');

if (config.xiaoxin.dialect == 'postgres') {
    //小鑫数据库配置postgres
    var xiaoxin = new Sequelize(config.xiaoxin.postgresConfig.dbname, config.xiaoxin.postgresConfig.dbuser, config.xiaoxin.postgresConfig.dbpassword, {
        host: config.xiaoxin.postgresConfig.host,
        port: config.xiaoxin.postgresConfig.port,
        dialect: 'postgres',
        logging: false,
    });
} else if (config.xiaoxin.dialect == 'mysql') {
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

function getAnswer(taskId, token) {
    axios.request({
        method: 'POST',
        url: 'https://zuoyenew.xinkaoyun.com:30001/holidaywork/teacher/getDetailWork',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        data: { taskId, token }
    }).then(function (res) {

        if (res.data && res.data.data.length>0 &&  res.data.state == 'ok') {

            let taskData = [];

            res.data.data.forEach(item => {

                if (item.children.length == 0) {
                    taskData.push({
                        teaId: item.teaId,
                        teaCode: item.teaCode,
                        teaAnswer: item.teaAnswer,
                        hasSubjectiveItem: item.isHasZuoDaOfZhuGuan,
                        children: []
                    })
                }
                else {
                    let cl = [];
                    item.children.forEach(child => {
                        cl.push({
                            teaId: child.teaId,
                            teaChildId: child.teaChildId,
                            teaCode: child.teaCode,
                            teaAnswer: child.teaAnswer
                        })
                    })
                    taskData.push({
                        teaId: item.teaId,
                        teaCode: item.teaCode,
                        teaAnswer: item.teaAnswer,
                        hasSubjectiveItem: item.isHasZuoDaOfZhuGuan,
                        children: cl,
                    })
                }
            })

            // console.log({
            //     schoolId: '85',
            //     taskId: taskId,
            //     taskName: res.data.data[0].taskName,
            //     answer: { data: taskData }
            // });

            //如果不存在此taskId，则创建
            answers.findOrCreate({
                where: {
                    schoolId: '85',
                    taskId: taskId,
                },
                defaults: {
                    schoolId: '85',
                    taskId: taskId,
                    taskName: res.data.data[0].taskName,
                    answer: { data: taskData }
                }
            }).then(function (result) {
                console.log(`${taskId}创建成功-${res.data.data[0].taskName}`);
            }).catch(function (err) {
                console.log(err);
            })
        }
    }).catch(function (error) {
        console.error(error);
    });
}
//getAnswer(313, 'pc_340d5a3ac93a41bfb05513fb49e7fc1c')


for(let i=1;i<=999;i++){
    getAnswer(i, 'pc_52c1ccf27d134fb5bb0552c93e3be5ba')
}
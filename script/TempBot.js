const { Bot } = require('mirai-js');
const config = require('../config.json');
const { Sequelize, DataTypes } = require('sequelize');
const axios = require('axios');
const bot = new Bot();

if (config.temp.dialect == 'postgres') {
    //体温数据库配置postgres
    var temp = new Sequelize(config.temp.postgresConfig.dbname, config.temp.postgresConfig.dbuser, config.temp.postgresConfig.dbpassword, {
        host: config.temp.postgresConfig.host,
        port: config.temp.postgresConfig.port,
        dialect: 'postgres',
        logging: false
    })
} else if (config.temp.dialect == 'mysql') {
    //体温数据库配置mysql
    var temp = new Sequelize(config.temp.mysqlConfig.dbname, config.temp.mysqlConfig.dbuser, config.temp.mysqlConfig.dbpassword, {
        dialect: 'mysql',
        host: config.temp.mysqlConfig.host,
        define: {
            freezeTableName: true
        },
        timezone: '+08:00'
    })
}

//定义records表模型
const records = temp.define('records', {
    //id自增
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    tel: DataTypes.STRING(11),
    name: DataTypes.STRING(5),
    status: DataTypes.STRING(255),
}, {
    timestamps: true,
    updatedAt: false
});

//姓名脱敏
function nameMask(name) {

    if (name.length == 2) {
        let res = '*' + name.substring(1, 2);
        return res;
    } else if (name.length == 3) {
        let res = name.substring(0, 1) + "*" + name.substring(2, 3);//截取第一个和第三个字符
        return res;
    } else if (name.length > 3) {
        let res = name.substring(0, 1) + "*" + '*' + name.substring(3, name.length);//截取第一个和大于第4个字符
        return res;
    } else {
        return name;
    }

}

function send(errorUsers, selfSubmitUsers, successUsers, otherUsers, callback) {

    let qq = new Promise((resolve, reject) => {
        //QQ
        bot.open({
            baseUrl: config.bot.baseUrl,
            verifyKey: config.bot.verifyKey,
            qq: config.bot.qq,
        })
            .then(async () => {
                for await (gro of [194790193, 745731575, 756016909, 729086422, 305432291]) {
                    await bot.sendMessage({
                        // 群号
                        group: gro,
                        // 是 http server 接口所需的原始格式，若提供则优先使用
                        message: [
                            {
                                type: 'Plain',
                                text: `[${new Date().toLocaleString()}验证码]体温助手通知\n成功提交${successUsers.length}人\n自己提交${selfSubmitUsers.length}人\n密码错误(${errorUsers.length}人)\n${errorUsers.map(user => nameMask(user.name)).join("，")}\n其他状态(${otherUsers.length}人)\n${otherUsers.map(user => `${nameMask(user.name)}:${user.status}`).join("\n")}\n\n注册、查询或修改信息请登录：https://temp.geekpara.com/`
                            },
                        ],
                    });
                }
            })
            .then(() => {
                resolve('QQ群成功发送')
            })
            .catch((err) => {
                reject('QQ群发送失败');
            });
    })

    let dingtalk = new Promise((resolve, reject) => {
        //钉钉
        axios.request({
            method: 'POST',
            url: 'https://oapi.dingtalk.com/robot/send',
            params: {
                access_token: config.bot.dingtalkKey
            },
            headers: { 'content-type': 'application/json' },
            data: {
                "actionCard": {
                    "title": "体温助手通知",
                    "text": `#### [${new Date().toLocaleString()}]体温助手通知\n ##### 成功提交${successUsers.length}人\n ##### 自己提交${selfSubmitUsers.length}人 \n##### 密码错误(${errorUsers.length}人) \n ${errorUsers.map(user => `> ###### ${nameMask(user.name)}:${user.status}`).join("\r")} \n##### 其他状态(${otherUsers.length}人) \n ${otherUsers.map(user => `> ###### ${nameMask(user.name)}:${user.status}`).join("\n")}`,
                    "btnOrientation": "0",
                    "singleTitle": "查询打卡状态/注册或修改信息",
                    "singleURL": "dingtalk://dingtalkclient/page/link?url=https://temp.geekpara.com&pc_slide=false"
                },
                "msgtype": "actionCard"
            }
        }).then(function (response) {
            resolve('钉钉成功发送')
        }).catch(function (err) {
            reject('钉钉成功失败')
        });
    })

    Promise.all([qq, dingtalk]).then((result) => {
        console.log(result)
        callback(null, '通知成功');
      }).catch((error) => {
        console.log(error)
        callback(null, '通知失败');
      })

}

exports.handler = function (event, context, callback) {

    records.findAll({
        where: {
            //createdAt是今天的
            createdAt: {
                [Sequelize.Op.gt]: new Date(new Date().toLocaleDateString())
            }
        }
    }).then(res => {

        let errorUsers = [];//错误用户
        let selfSubmitUsers = [];//自己提交的
        let successUsers = [];//成功提交的用户
        let otherUsers = [];//其他状态的用户

        //process data
        res.forEach(user => {
            if (user.status == '密码错误') {
                errorUsers.push(user);
            } else if (user.status == '已提交，不可重复') {
                selfSubmitUsers.push(user);
            } else if (user.status.indexOf("°C") != -1) {
                successUsers.push(user);
            } else {
                otherUsers.push(user);
            }
        });

        //send message
        send(errorUsers, selfSubmitUsers, successUsers, otherUsers, callback);

    })


};

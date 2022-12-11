const { Bot, Message } = require('mirai-js');
const config = require('./config.json');
const { Sequelize, DataTypes } = require('sequelize');
const axios = require('axios');

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

function getVerifyCode() {
    return verify
        .findOne({ attributes: ['code'], where: { date: Date.now() } })
        .then((data) => {
            if (!data) {
                var code = ''
                for (let i = 0; i < 6; i++) {
                    code += parseInt(Math.random() * 10)
                }
                verify.create({ code: code })
                return new Promise((resolve, reject) => {
                    resolve(code)
                })
            }
            else {
                var code = ''
                for (let i = 0; i < 6; i++) {
                    code += parseInt(Math.random() * 10)
                }
                verify.update({ code: code }, { where: { date: Date.now() } })
                return new Promise((resolve, reject) => {
                    resolve(code)
                })
            }
        })
}

async function sendCode() {
    if (new Date().getHours() > 6 && new Date().getHours() < 24) {
        //白天
        let code = await getVerifyCode();

        /*
        for await (gro of [194790193, 745731575, 756016909]) {
            for await (const anno of bot.getAnnoIter({ group: gro })) {
                if (anno.constent.indexOf("邀请码为") != -1) {
                    console.log(anno);
                    await bot.deleteAnno({ group: gro, fid: anno.fid });
                }
            }

            bot.publishAnno({
                group: gro,
                content: `${new Date().getMonth() + 1}月${new Date().getDate()}日${new Date().getHours()}时邀请码为：${code},有效期1小时。`,
                pinned: true
            })
        }
        */

        for await (gro of [194790193, 745731575, 756016909]) {
            await bot.sendMessage({
                // 群号
                group: gro,
                // 是 http server 接口所需的原始格式，若提供则优先使用
                message: [
                    { type: 'Plain', text: `${new Date().getMonth() + 1}月${new Date().getDate()}日${new Date().getHours()}时邀请码为：${code},有效期1小时。` },
                ],
            });
        }

        axios.request({
            method: 'POST',
            url: 'https://oapi.dingtalk.com/robot/send',
            params: {
              access_token: '1ca940bb5fea336c42f13378bdbb008df09abd7d3d73230992126dcc9e5218eb'
            },
            headers: {'content-type': 'application/json'},
            data:{
                "actionCard": {
                    "title": "邀请码",
                    "text": `## ${code} \n #### 是${new Date().getMonth() + 1}月${new Date().getDate()}日${new Date().getHours()}时邀请码，有效期一小时`,
                    "btnOrientation": "0",
                    "singleTitle": "立即体验小鑫助手",
                    "singleURL": "dingtalk://dingtalkclient/page/link?url=https://xiaoxin.paraject.com&pc_slide=false"
                },
                "msgtype": "actionCard"
            }
          }).then(function (response) {
            console.log(response.data);
          }).catch(function (error) {
            console.error(error);
          });
        
    }

    setTimeout(async () => {
        sendCode();
    }, 3600000);

}


const bot = new Bot();

bot.open({
    baseUrl: 'http://47.95.203.201:8082',
    verifyKey: '2005519',
    qq: 3495997931,
})
    .then(async () => {
        console.log('Bot started');
        sendCode();
    })


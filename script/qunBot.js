/*--------------------------------------------------------------------------------
    author:  hissin'
    mail:    hissin@126.com
    date:    2023-01-06
    version: 3.0
    description: 小鑫/体温助手机器人
--------------------------------------------------------------------------------*/

const { Bot, Message, Middleware } = require('mirai-js');
const config = require('../config.json');
const { Sequelize, DataTypes, Op } = require('sequelize');
const axios = require('axios');

//---------------------------------数据库配置-----------------------------------------

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

//定义options表模型
const options = temp.define('options', {
    item: DataTypes.STRING(20),
    content: DataTypes.STRING(10)
}, {
    timestamps: false
});

//定义Temp-users表模型
const TempUsers = temp.define('users', {
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
    schoolId: DataTypes.INTEGER,
    userRole: DataTypes.INTEGER,
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
    taskId: DataTypes.STRING(10),
    tel: DataTypes.STRING(11),
    account: DataTypes.STRING(64),
    providerId: DataTypes.STRING(10),
    providerName: DataTypes.STRING(5),
    providerClass: DataTypes.STRING(64),
    providerTeacher: DataTypes.STRING(64),
    createdAt: DataTypes.DATEONLY
}, {
    timestamps: true,
    updatedAt: false
});

//---------------------------------机器人配置-----------------------------------------

const bot = new Bot();

bot.open({
    baseUrl: config.bot.baseUrl,
    verifyKey: config.bot.verifyKey,
    qq: config.bot.qq,
})

const autoJoin = true;
const autoSuspend = true;


//-----------------------------------通用模块-------------------------------------------

//加群自动同意
if (autoJoin) {
    bot.on('MemberJoinRequestEvent', new Middleware()
        .memberJoinRequestProcessor()
        .done(async data => {
            let answer = data.message.split('答案：')[1];
            //判断是否包含数字，如果是就通过申请
            if (/\d/.test(answer)) {
                data.agree();
            }
            /*users.findOne({
                where: {
                    [Op.or]: [
                        { tel: answer },
                        { account: answer }
                    ]
                }
            })
                .then(async res => {
                    if (res) {
                        data.agree();
                    }
                    else {
                        TempUsers.findOne({
                            where: {
                                tel: answer
                            }
                        })
                            .then(async res => {
                                if (res) {
                                    data.agree();
                                }
                            })
                    }
                })*/
        }))
}


//退群自动禁用
if (autoSuspend) {
    bot.on('MemberLeaveEventQuit', async data => {
        let qq = data.member.id;
        users.update({
            status: 'suspend',
            identity: 'suspend'
        }, {
            where: {
                qq: qq,
                status: 'active',
                identity: 'formal'
            }
        })
    })
}

//---------------------------------小鑫助手模块-----------------------------------------

//小鑫助手激活私聊方式
/*
bot.on(['FriendMessage', 'TempMessage'],
    new Middleware()
        // 保证连续对话未处理完成时不会多次触发
        .textProcessor()
        .done(async ({ bot, sender: friend, text }) => {
            if (text) {
                if (text == '激活') {

                    let temp = friend.group ? true : false;
                    let group = friend.group ? friend.group.id : null;

                    await bot.sendMessage({
                        temp,
                        group,
                        friend: friend.id,
                        message: new Message().addText('请输入网站激活页面显示的验证码。')
                    });

                    const processSign = bot.on(['FriendMessage', 'TempMessage'], new Middleware()
                        .friendFilter([friend.id])
                        .done(data => {
                            let verifyCode = data.messageChain[1].text;

                            if (data.sender.id == friend.id) {
                                users.update({
                                    qq: friend.id,
                                    qqNickName: friend.nickname,
                                    status: 'active',
                                    identity: 'formal'
                                }, {
                                    where: {
                                        verifyCode: verifyCode,
                                        status: 'unsigned'
                                    }
                                })
                                    .then(async res => {
                                        if (res[0] == 1) {
                                            await bot.sendMessage({ temp, group, friend: friend.id, message: new Message().addText('您已成功激活小鑫助手，快去体验吧！https://xiaoxin.paraject.com/') });
                                            bot.off('FriendMessage', processSign);
                                            bot.off('TempMessage', processSign);
                                        }
                                        else {
                                            await bot.sendMessage({ temp, group, friend: friend.id, message: new Message().addText('验证码错误或已激活，重新回复“激活”以再次进入激活流程。') });
                                            bot.off('FriendMessage', processSign);
                                            bot.off('TempMessage', processSign);
                                        }
                                    })
                            }
                        }));

                }
            }
        })
);
*/

//小鑫助手激活群聊方式
bot.on('GroupMessage', async data => {
    if (data.messageChain[1].type == 'Plain') {
        if (data.messageChain[1].text[0] == '&') {

            let verifyCode = data.messageChain[1].text.split('&')[1];

            users.findOne({
                where: {
                    qq: String(data.sender.id)
                }
            })
                .then(async res => {
                    if (res) {
                        await bot.sendMessage({
                            group: data.sender.group.id,
                            quote: data.messageChain[0].id,
                            message: new Message().addText("不要替别人激活哦，谢谢理解！"),
                        });
                    }
                    else {
                        users.update({
                            qq: data.sender.id,
                            status: 'active',
                            identity: 'formal'
                        }, {
                            where: {
                                verifyCode: verifyCode,
                                status: 'unsigned'
                            }
                        })
                            .then(async res => {
                                if (res[0] == 1) {
                                    await bot.sendMessage({
                                        group: data.sender.group.id,
                                        quote: data.messageChain[0].id,
                                        message: new Message().addText("您已成功激活小鑫助手"),
                                    });
                                }
                                else {
                                    await bot.sendMessage({
                                        group: data.sender.group.id,
                                        quote: data.messageChain[0].id,
                                        message: new Message().addText("验证码错误或已激活"),
                                    });
                                }
                            })
                            .catch(err => {
                                console.log(err);
                            })
                    }
                })
                .catch(err => {
                    console.log(err);
                })
        }
    }
});

//机器人获取作业题目，在answers库里面查找答案,并用机器人发送出去
bot.on('GroupMessage', async data => {
    if (data.messageChain[1].type == 'Plain') {
        if (data.messageChain[1].text.split(' ')[0] == '/作业' || data.messageChain[1].text.split(' ')[0] == '/task') {

            let content = data.messageChain[1].text.split(' ')[1];

            //content是数字
            if (!isNaN(content)) {
                var answer = await answers.findAll({
                    where: {
                        taskId: content
                    }
                });
            }
            //content是字符串
            else {
                var answer = await answers.findAll({
                    where: {
                        taskName: {
                            [Op.like]: '%' + content + '%'
                        }
                    }
                });
            }

            if (answer.length == 0) {
                var msg = '未找到' + content;
            }
            else {

                var msg = '验证码随机答案生成[作业名称]' + content;
                for (let i = 0; i < answer.length; i++) {

                    let schoolName = '';
                    if (answer[i].schoolId == '56') {
                        schoolName = '郑中';
                    }
                    else if (answer[i].schoolId == '66') {
                        schoolName = '武邑';
                    }
                    else if (answer[i].schoolId == '85') {
                        schoolName = '衡中';
                    }

                    msg += '\n' + schoolName + ' ' + answer[i].taskName + '\n';

                    if (answer[i].answer.data.length == 0) {
                        msg += '此套作业无主观题';
                    }
                    else {
                        answer[i].answer.data.forEach(element => {
                            msg += element.teaCode + '.';
                            msg += element.teaAnswer + '  ';
                        });
                    }

                }
            }

            await bot.sendMessage({
                group: data.sender.group.id,
                message: new Message().addText(msg),
            });

        }
    }
});


//---------------------------------体温助手模块-----------------------------------------

//体温助手验证码私聊方式
/*bot.on(['FriendMessage', 'TempMessage'], async data => {
    if (data.messageChain[1].text) {
        if (data.messageChain[1].text == '/验证码') {
            options.findOne({ attributes: ['content'], where: { item: 'inviteCode' } })
                .then(async res => {
                    let temp = data.sender.group ? true : false;
                    let group = data.sender.group ? data.sender.group.id : null;
                    await bot.sendMessage({
                        temp, group,
                        friend: data.sender.id,
                        message: new Message().addText("您正在激活体温助手，当前验证码为：" + res.content),
                    });
                })
        }
    }

});*/

//体温助手验证码群聊方式
bot.on('GroupMessage', async data => {
    if (data.messageChain[1].type == 'Plain') {
        if (data.messageChain[1].text == '/验证码' || data.messageChain[1].text == '/code') {
            options.findOne({ attributes: ['content'], where: { item: 'inviteCode' } })
                .then(async res => {
                    await bot.sendMessage({
                        group: data.sender.group.id,
                        quote: data.messageChain[0].id,
                        message: new Message().addText("[体温助手]当前验证码为：" + res.content),
                    });
                })
        }
    }
});


//定时更新体温验证码
function updateCode() {
    let code = ''
    for (let i = 0; i < 6; i++) {
        code += parseInt(Math.random() * 10)
    }
    options.update({
        content: code
    }, {
        where: {
            item: 'inviteCode'
        }
    })
    setTimeout(() => {
        updateCode()
    }, 1000 * 60 * 60 * 3)//3小时更新一次

}
updateCode()

//---------------------------------机器人群聊模块-----------------------------------------
//状态
bot.on('GroupMessage', async data => {
    if (data.messageChain[1].type == 'Plain') {
        if (data.messageChain[1].text == '/状态' || data.messageChain[1].text == '/status') {

            let xiaoxinUuserNum = await users.count({ where: { status: 'active' } })
            let totalSubmit = await tasks.count()
            let todaySubmit = await tasks.count({ where: { createdAt: new Date() } })
            let answersCount = await answers.count()

            let tempUserNum = await TempUsers.count()
            let tempSubmit = await records.count()
            let tempTodaySubmit = await records.count({
                where: {
                    createdAt: {
                        [Sequelize.Op.gt]: new Date(new Date().toLocaleDateString())
                    }
                }
            })
            let tempCode = await options.findOne({ attributes: ['content'], where: { item: 'inviteCode' } }).then(result => result.content);


            let msg = `[Status]
【小鑫助手】
小鑫助手： ${xiaoxinUuserNum} 人
总使用次数： ${totalSubmit} 次
今日使用次数： ${todaySubmit} 次
题库收录： ${answersCount} 套
--------------------------------
【体温助手】
当前验证码：${tempCode}
体温助手用户： ${tempUserNum} 人
总打卡次数： ${tempSubmit} 次
今日打卡次数： ${tempTodaySubmit} 次`

            await bot.sendMessage({
                group: data.sender.group.id,
                quote: data.messageChain[0].id,
                message: new Message().addText(msg),
            });

        }
    }
});

//帮助
bot.on('GroupMessage', async data => {
    if (data.messageChain[1].type == 'Plain') {
        if (data.messageChain[1].text == '/帮助' || data.messageChain[1].text == '/help') {

            let msg = `[Help]
【小鑫第三方客户端】
当前地址 https://task.paraject.com
>地址经常换,打不开请看群公告和精华消息
>限制次数是为了限制助手用户总提交数(控制在每天2000以内),希望大家理解
使用方法：
1.查看验证码
浏览器打开网站,登录您的账号,复制弹窗中的验证码
2.激活小鑫助手
群里回复&+验证码(例如&QYLU7M2F)，不要@机器人
3.使用小鑫助手
刷新登录即可使用

【体温助手】
地址 https://temp.geekpara.com
>发烧期间请自行暂停体温打卡
使用方法：
1.获取验证码
在此群发送 "/验证码" 或 "/code" 即可获取验证码
2.激活体温助手
浏览器打开网站,输入您的验证码,按照提示完成激活。`

            bot.sendMessage({
                group: data.sender.group.id,
                quote: data.messageChain[0].id,
                message: new Message().addText(msg),
            });

        }
    }
});

//bot使用说明
bot.on('GroupMessage', async data => {
    if (data.messageChain[1].type == 'Plain') {
        if (data.messageChain[1].text == '/bot' || data.messageChain[1].text == '/说明') {

            let msg = `[群bot使用说明]
/bot 或 /说明  查看bot使用说明
/help 或 /帮助  查看帮助
/notice 或 /通知  查看通知
/status 或 /状态  查看状态
/code 或 /验证码  获取验证码(体温助手)
&xxxxx  提交验证码(小鑫助手)

ChatGPT机器人
>@机器人 !reset 重置对话上下文
Petpet图片合成机器人
>pet key @xxx 或 key @xxx 可返回指定图片 例如 pet kiss @xxx kiss @xxx
>通过发送的图片生成Petpet kiss [图片], 支持GIF
>通过回复构造图片, 例如 [图片] -> [回复[图片]] 对称
>使用 pet指令 获取 keyList`

            bot.sendMessage({
                group: data.sender.group.id,
                quote: data.messageChain[0].id,
                message: new Message().addText(msg),
            });
        }
    }
});

//通知
bot.on('GroupMessage', async data => {
    if (data.messageChain[1].type == 'Plain') {
        if (data.messageChain[1].text == '/notice' || data.messageChain[1].text == '/通知') {

            let msg = `验证码2023-01-10[最新]
1.我们遵守MIT协议(https://opensource.org/licenses/MIT) ,开发者不担任何责任以及连带责任
2.paraject社团非个人实体且无代表实体,贡献者与社团除开源贡献外无任何利益是非关系
3.若您退群,则认为您已放弃使用的权利,将立即停止您的使用权限
4.迄今已发生三起危害项目发展的意外(人为)事故,烦请各位小伙伴谨慎宣传,请勿在使用过程中截图,请珍惜! 
5.推荐给别人请私聊单发,请勿发朋友圈/空间/群聊,申请加群时回答鑫考云/小鑫账号或手机号,机器人自动审核。305432291此群当前可用
6.遇到问题请看公告和精华消息,勿聊政治敏感内容`

            bot.sendMessage({
                group: data.sender.group.id,
                quote: data.messageChain[0].id,
                message: new Message().addText(msg),
            });
        }
    }
});
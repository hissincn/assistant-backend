const config = require('./config.json');
const { Sequelize, DataTypes } = require('sequelize');
const axios = require('axios');


//定义数据库配置
const sequelize = new Sequelize(config.datebase, config.dbuser, config.dbpassword, {
    dialect: 'mysql',
    host: config.dbhost,
    define: {
        freezeTableName: true
    },
    timezone:'+08:00'
})



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

function UserUpdate(user) {
    axios.request({
        method: 'POST',
        url: 'https://usr.xinkaoyun.com/api/HSCPC/Login',
        data: { userName: user.tel, password: user.password }
    }).then(function (res1) {
        console.log(res1.data)

        var userPc = res1.data.data.pardt[user.stuIndex];

        axios.request({
            method: 'POST',
            url: 'http://usr.xinkaoyun.com/api/HSCApp/NewLogin_jiami',
            headers: { 'content-type': 'multipart/form-data' },
            data: {
                phone: new Buffer.from(user.tel).toString('base64'),
                password: new Buffer.from(user.password).toString('base64')
            }
        })
            .then(function (res2) {

                axios.request({
                    method: 'POST',
                    url: 'https://twsb.xinkaoyun.com:8099/temp/report/getStudentTempInfoHistory',
                    data: {
                        schoolId: userPc.SchoolId,
                        userId: userPc.UserId,
                        userToken: res2.data.data.token,
                        student_id: userPc.ParentName,
                        student_name: userPc.ParentName
                    }
                }).then(function (res3) {
                    users
                        .create({
                            tel: user.tel,
                            name: userPc.ParentName,
                            password: user.password,
                            status: "active",
                            info: { "stuIndex": user.stuIndex,
                             "dormitory": res3.data.data.dormitory,
                              "livePlace": res3.data.data.address, 
                              "teacherName": res3.data.data.teacher_header },
                            infoRaw: userPc
                        })
                        .then(() => {
                            res.send("1");
                        })
                        .catch(err => { console.log(err) })

                }).catch(function (error) {
                    console.error(error);
                });


            })
            .catch(function (error) {
                console.error(error);
            });




    }).catch(function (error) {
        console.error(error);
    });


}



UserUpdate({
    tel: '13',
    password: 't',
    stuIndex:0
})

	




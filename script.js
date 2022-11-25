const config = require('./config.json');
const { Sequelize, DataTypes, Op } = require('sequelize');
const bodyParser = require('body-parser')
const qs = require('qs');
const axios = require('axios');



//定义数据库配置
const sequelize = new Sequelize(config.datebase, config.dbuser, config.dbpassword, {
    dialect: 'mysql',
    host: config.dbhost,
    define: {
        freezeTableName: true
    }
})

//定义records表模型
const records = sequelize.define('records', {
    tel: DataTypes.STRING(11),
    name: DataTypes.STRING(5),
    status: DataTypes.STRING(255),
}, {
    timestamps: true,
    updatedAt: false
});


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

// 查询所有用户
users.findAll({
    where: {
        [Op.or]: [
            { status: "active" },
            { status: "pwerror" }
        ]
    }
})
    .then(people => {
        for (let person of people) {
            getToken(person);
        }
    })

function getToken(person) {

    axios.request({
        method: 'POST',
        url: 'http://usr.xinkaoyun.com/api/HSCApp/NewLogin_jiami',
        headers: { 'content-type': 'multipart/form-data' },
        data: {
            phone: new Buffer.from(person.tel).toString('base64'),
            password: new Buffer.from(person.password).toString('base64')
        }
    })
        .then(function (response) {
            if (response.data.resultCode == 0) {
                submitTemp(response.data.data.token, person);
            }
            else if (response.data.resultCode == -1){
                addRecord(person.tel, person.infoRaw.StuName, "密码错误");
                pwerror(person.tel);
            }
            else{
                console.log(person,response)
                getToken(person)
            }
        })
        .catch(function (error) {
            console.error(error);
        });

}
function submitTemp(token, person) {

    let randomTemp = Math.round(Math.random() * (367 - 360) + 360) / 10;

    axios.request({
        method: 'POST',
        url: 'https://twsb.xinkaoyun.com:8099/temp/report/studentSaveTemp',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        data: {
            iscontact_patients: '0',
            hasto_riskareas: '0',
            iscontact_foreigner: '0',
            isfever_family: '0',
            sex: person.infoRaw.StuSex,
            grade_id: person.infoRaw.GradeId,
            jibu_id: person.infoRaw.JiBuId,
            schoolId: person.infoRaw.SchoolId,
            grade: person.infoRaw.GradeName,
            jibu: person.infoRaw.JiBuName,
            clazz: person.infoRaw.ClassName,
            student_name: person.infoRaw.StuName,
            userId: person.infoRaw.UserId,
            clazz_id: person.infoRaw.ClassId,
            student_id: person.infoRaw.StudyCode,
            mobile: person.tel,
            teacher_header: person.info.teacherName,
            dormitory: person.info.dormitory,
            address: person.info.livePlace,
            temperature: randomTemp,
            userToken: token
        }
    }).then(function (response) {
        let status = '';
        if (response.data.state == 'fail') {
            status = response.data.msg;
        }
        else if (response.data.state == 'ok') {
            status = randomTemp;
        }
        addRecord(person.tel, person.infoRaw.StuName, status)
    }).catch(function (error) {
        console.error(error);
    });

}

function addRecord(tel, name, status) {
    console.log({
        tel: tel,
        name: name,
        status: status,
    })
    records
        .create({
            tel: tel,
            name: name,
            status: status,
        })
        .catch(err => console.log(err))

}

function pwerror(tel) {
    users.update({ status: "pwerror" }, {
        where: {
            tel: tel
        }
    });

}

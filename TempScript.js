var config = require('./config.json');
var { Sequelize, DataTypes, Op } = require('sequelize');
var axios = require('axios');

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


//定义users表模型
const users = temp.define('users', {
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
                submitTemp(response.data.data.token, person, 0);
            }
            else if (response.data.resultCode == -1) {
                pwerror(person.tel);
                addRecord(person.tel, person.infoRaw.StuName, "密码错误");
            }
            else {
                getToken(person);
            }
        })
        .catch(function (error) {
            addRecord(person.tel, person.infoRaw.StuName, "token获取错误");
        });

}
function submitTemp(token, person, times) {

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
        if (response.data.msg == '登录信息异常') {
            if (times > 2) {
                addRecord(person.tel, person.infoRaw.StuName, "登录信息异常并多次尝试未果");
            }
            else {
                setTimeout(() => {submitTemp(token, person, times++)},1000);
            }
        }
        else if (response.data.state == 'ok') {
            let status = randomTemp + '°C';
            addRecord(person.tel, person.infoRaw.StuName, status)
        }
        else {
            addRecord(person.tel, person.infoRaw.StuName, response.data.msg)
        }

    }).catch(function (error) {
        addRecord(person.tel, person.infoRaw.StuName, "体温提交失败");
    });

}

function addRecord(tel, name, status) {
    console.log(tel, name, status)
    records
        .create({
            tel: tel,
            name: name,
            status: status,
        })
        .then(res => {
            count++;
            if(count >= total) {
                console.log('打卡成功')
                cb(null, '打卡成功');
            }
        })
        .catch(err => {
            count++;
            console.log('[添加记录失败]', tel, name, status)
            if(count >= total) {
                console.log('打卡成功')
                cb(null, '打卡成功');
            }
        })
}

function pwerror(tel) {
    users.update({ status: "pwerror" }, {
        where: {
            tel: tel
        }
    });

}

var total = 0;
var count = 0;
var cb = function(){};

exports.handler = function (event, context, callback) {
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
            total = people.length;
            cb = callback;

            console.log('[总人数]', total)

            for (let person of people) {
                setTimeout(() => {getToken(person)}, Math.floor(Math.random() * (10000 - 10)) + 10);
            }

        })
        .catch(err => {
            callback(error, '打卡失败');
        })
}

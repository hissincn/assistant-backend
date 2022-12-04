const config = require('./config.json');
const { Sequelize, DataTypes } = require('sequelize');
const students = require('./students.json');



//定义xiaoxin数据库配置
const xiaoxin = new Sequelize(config.xiaoxinDatabase, config.dbuser, config.dbpassword, {
  dialect: 'mysql',
  host: config.host,
  define: {
    freezeTableName: true
  },
  timezone: '+08:00'
})

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
});



users.findAll()
  .then(all=>{
    all.forEach(user=>{

      let student = students.find(stu=>{
        return stu.account == user.account;
      });

      let stuGrade = student ? student.grade : undefined;
      let stuClass = student ? student.class : undefined;
      let studentId = student ? student.studentId : undefined;

      users.update({
        grade: stuGrade,
        class: stuClass,
        studentId: studentId
      }, {
        where: {
          tel: user.tel
        }
      })

    });
  })
const axios = require('axios');

var tel = "1508";
var password = "";	

axios.request({
    method: 'POST',
    url: 'http://usr.xinkaoyun.com/api/HSCApp/NewLogin_jiami',
    headers: { 'content-type': 'multipart/form-data' },
    data: {
        phone: new Buffer.from(tel).toString('base64'),
        password: new Buffer.from(password).toString('base64')
    }
})
    .then(function (response) {
        console.log(response.data.data)
    })
    .catch(function (error) {
        console.error(error);
    });

 
    
